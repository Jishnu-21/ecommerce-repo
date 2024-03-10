const express = require('express');
const bodyParser = require('body-parser');
const otpController = require('./otpController');
const User = require('/models/user');  // Adjust the path accordingly
const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const session = require('express-session');
const bcrypt = require('bcrypt');
const Admin = require('/models/admin');  // Adjust the path accordingly
const Category = require('/models/category');  // Adjust the path accordingly
const Product = require('/models/products'); 
const multer = require('multer')

const fs = require('fs').promises;

const isAdmin = async (req, res, next) => {
    try {
        // Check if the user is authenticated
        if (req.isAuthenticated()) {
            const admin = await Admin.findOne({});

            // Check if the user is an admin
            if (admin && admin.isAdmin) {
                return next();
            }
        }

        // Redirect to login page or handle unauthorized access
        res.redirect('/login');
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Use the isAdmin middleware in the route




const isAuthenticated = (req, res, next) => {
    if (req.session.user || req.session.admin) {
      next();
    } else {
      res.redirect('/login');
    }
  };

const readAndEncodeImage = (path) => {
  const imageBuffer = fs.readFileSync(path);
  return imageBuffer.toString('base64');
};

let users = {};


const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // specify the upload directory
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
  });

  const upload = multer({ dest: 'uploads/' }); 


  router.post('/signup', async (req, res) => {
    const { email, password, phone, name, address, confirmPassword } = req.body;

    const otp = otpController.generateOTP();

    req.session.email = email;
    req.session.name = name;
    req.session.password = password;
    req.session.address = address;
    req.session.phone = phone;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        console.log("Email already exists");
        const errorMessage = 'Email already exists. Please choose another email.';
        console.log('Error message:', errorMessage);
        return res.render('signup', { errorMessage: 'Email already exists. Please choose another email.' });
      }


    if (password !== confirmPassword) {
        console.log("Passwords do not match");
        const errorMessage = 'Passwords do not match. Please confirm your password.';
        console.log('Error message:', errorMessage);
        
        // Redirect back to signup with query parameter
        return res.render('signup', { errorMessage: 'Passwords do not match. Please confirm your password.' });
      }

    users[email] = { email, otp };

    otpController.sendVerificationEmail(email, otp);

    console.log(otp);

    // Redirect to '/verify' only if there's no error
    res.redirect('/verify');
});


router.post('/verify', async (req, res) => {
    const { otp2 } = req.body;

    const products = await Product.find({});


     // Retrieve the email from the session
    const email = req.session.email;
   const name = req.session.name
    const password = req.session.password
   const address = req.session.address 
   const phone = req.session.phone

    console.log('Typed OTP:', otp2);
    console.log('Received OTP:', users[email].otp);

    if (users[email].otp === otp2) {
        users[email].verified = true;

        // Save the user to the database
        try {
        
            const hashedPassword = await hashPassword(password);

            const newUser = new User({
                email,
                password: hashedPassword,
                phone,
                name,
                address,
            });
            await newUser.save();
            console.log('User saved to the database');
        } catch (error) {
            console.error('Error saving user to the database:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        res.redirect('homepage');
    } else {
        res.status(401).json({ message: 'Invalid OTP' });
    }
});

router.post('/login', async (req, res) => {
    try {
        if (req.session.user || req.session.admin) {
            console.log("User is already logged in, redirecting to homepage");
            return res.redirect('/homepage');
        }

        const { email, password } = req.body;
        req.session.email = email;

        // Check if the email and password exist in the admin database
        const admin = await Admin.findOne({ email });

        if (admin) {
            // Check if the password is correct using bcrypt.compare
            const isPasswordValid = await bcrypt.compare(password, admin.password);

            if (isPasswordValid) {
                console.log("Admin logged in");
                return res.redirect('/admin');
            } else {
                console.log("Incorrect password");
                return res.redirect('/login?error=incorrect_password');
            }
        } else {
            // If admin not found in the admin database, check the regular user database
            const user = await User.findOne({ email });

            if (user) {

                if (user.status === 'Blocked') {
                    console.log("User is blocked");
                    return res.redirect('/login?error=user_blocked');
                }
                // Check if the password is correct using bcrypt.compare
                const isPasswordValid = await bcrypt.compare(password, user.password);

                if (isPasswordValid) {
                    console.log(user.name + " logged in");
                    return res.redirect('/homepage');
                } else {
                    console.log("Incorrect password");
                    return res.redirect('/login?error=incorrect_password');
                }
            } else {
                console.log("User not found");
                return res.redirect('/login?error=user_not_found');
            }
        }
    } catch (error) {
        console.error('Error during login:', error);
        return res.redirect('/login?error=internal_error');
    }
});


router.post('/addProducts', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'productFile', maxCount: 1 }]), async (req, res) => {
    try {
        const { name, description, categoryId, price } = req.body;

        const email = req.session.email; // Assuming you have user authentication middleware
        const user = await User.findOne({ email });


        const categories = await Category.findOne({ categoryId });

        console.log(user.name)
        
        const seller_name =user.name
       
        const categoryName = categories.name

        const category_id = categories._id

        const seller_id = user._id
        console.log(req.files);
        
        const uploadFolder = 'uploads/';


        // Get the file objects
        const images = req.files['images'];
        const productFile = req.files['productFile'][0];

        // Save the file data to the database
        const product = new Product({
            name,
            seller_name,
            description,
            price,
            seller_id,
            categoryName,
            category_id,
            images: images.map(img => ({ dataName: img.originalname, name : img.filename , path: img.path })),
            productFile: { dataName: productFile.originalname, name : productFile.filename , path: productFile.path },
        });

        // Save the product to the database
        await product.save();

       console.log("product succesfully added")
       res.redirect("/users/uploads")
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.post('/admin/status', async (req, res) => {
    const userId = parseInt(req.body.userId);

    try {
        // Retrieve the user from the database
        const user = await User.findOne({ userID: userId });

        // Toggle the status
        const newStatus = user.status === 'Blocked' ? 'Active' : 'Blocked';

        // Update user status using Mongoose
        await User.updateOne({ userID: userId }, { $set: { status: newStatus } });

        // Redirect back to the admin page or send a response as needed
        res.redirect('/admin/Users');
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/product/status', async (req, res) => {
    const product_id = parseInt(req.body.product_id);

    try {
        // Retrieve the product from the database
        const product = await Product.findOne({ product_id: product_id });

        // Check if the product was found
        if (!product) {
            console.error('Product not found:', product_id);
            return res.status(404).send('Product not found');
        }

        // Toggle the status
        const newStatus = product.status === 'softDeleted' ? 'Active' : 'softDeleted';

        // Update product status using Mongoose
        await Product.updateOne({ product_id: product_id }, { $set: { status: newStatus } });

        // Redirect back to the admin page or send a response as needed
        res.redirect('/admin/Products');
    } catch (error) {
        console.error('Error updating product status:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/category/status', async (req, res) => {
    const category_id = parseInt(req.body.category_id);

    try {
        const category = await Category.findOne({ category_id: category_id });

        if (!category) {
            console.error('Category not found:', category_id);
            return res.status(404).send('category not found');
        }

        // Toggle the status
        const newStatus = category.status === 'softDeleted' ? 'Active' : 'softDeleted';

        // Update product status using Mongoose
        await Category.updateOne({ category_id: category_id }, { $set: { status: newStatus } });

        // Redirect back to the admin page or send a response as needed
        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error updating category status:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/catEdit', async (req, res) => {
    const { categoryID, editName, editDesc } = req.body;

try {
  const nameRegex = /^[A-Za-z0-9]/;

  if (!nameRegex.test(editName[0])) {
    return res.status(400).send('Invalid name format. The first letter should be an alphabet or a number.');
  }

  // Assuming you have a Category mongoose model
  const category = await Category.findById(categoryID);

  if (!category) {
    return res.status(404).send('Category not found');
  }

  category.status = 'Active';
  category.name = editName;
  category.description = editDesc;
  await category.save();
 
  res.redirect('/admin/category')
} catch (error) {
  console.error('Error updating category:', error);
  res.status(500).send('Internal Server Error: ' + error.message);
}
})

router.post('/category/add', async (req, res) => {
    const { addName, addDesc } = req.body;
  
    try {
      // Validate input if needed (e.g., check if addName is not empty)
  
      // Create a new category
      const newCategory = new Category({
        name: addName,
        description: addDesc,
        status: 'Active', // Assuming 'Active' is a valid status based on your schema
      });
  
      // Save the new category to the database
      await newCategory.save();
  
      // Redirect or send a response as needed
      res.redirect('/admin/category'); // Redirect to a page showing all categories, adjust the path as needed
    } catch (error) {
      console.error('Error adding category:', error);
      res.status(500).send('Internal Server Error: ' + error.message);
    }
  });


router.get('/signup', (req, res) => {
    res.render('signup');
});

router.get('/verify', (req, res) => {
    res.render('verifyotp');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/admin', (req, res) => {
    res.render('admin');
});

router.get('/admin/Products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.render('admin/adminProducts', { products });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  router.get('/admin/category', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.render('admin/adminCategory', { categories });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Internal Server Error');
    }
  });

router.get('/admin/Users', async (req, res) => {
    try {
        const users = await User.find({});
        res.render('admin/adminUsers', { users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  router.get('/users/add', async (req, res) => {
    try {
        // Get the email from the session
        const email = req.session.email;
    
        // Assuming the authenticated user details are stored in req.user
        const categories = await Category.find({ status: 'Active' });
        const user = await User.findOne({ email });

        console.log(email)
        
        // Render the addProduct view with user details
        res.render('users/addProduct', { user , categories});
      } catch (error) {
        console.error('Error fetching user information:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    
    // Handle the form submission
    router.post('/editProduct/:productId', async (req, res) => {
        try {
          const productId = req.params.productId;
          const { name, description, categoryname, price } = req.body;
      
          const email = req.session.email;
      
          const user = await User.findOne({ email });
      
          // Find the product by product_id
          const product = await Product.findOne({ product_id: productId });
      
          if (!product) {
            return res.status(404).json({ message: 'Product not found' });
          }
      
          // Update product details
          product.name = name;
          product.description = description;
          product.categoryName = categoryname;
          product.price = price;
      
          // Save the updated product to the database
          await product.save();
      
          res.redirect('/users/uploads'); // Redirect to the home page or product list page
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Internal Server Error' });
        }
      });
      
    

        router.get('/product/:productId', async (req, res) => {
            try {
                const productId = req.params.productId;
                const product = await Product.findOne({ product_id: productId });
        
                // Read and encode the image data for all images
                const imageData = [];
                for (const image of product.images) {
                    const imageBuffer = await fs.readFile(image.path);
                    imageData.push(imageBuffer.toString('base64'));
                }
        
                // Attach the imageData array to the product object
                product.imageData = imageData;
        
                // Render the product details page
                res.render('users/productDetails', { product });
            } catch (error) {
                console.error('Error fetching product details:', error);
                res.status(500).send('Internal Server Error');
            }
        });

    
    router.get('/homepage', async (req, res) => {
        try {
          const products = await Product.find({ status: 'Active' });
      
          // Loop through each product to get image data
          for (const product of products) {
            // Check if the product has images
            if (product.images && product.images.length > 0) {
              const imagePath = product.images[0].path;
      
              // Read and encode the image data
              const imageBuffer = await fs.readFile(imagePath);
              product.imageData = imageBuffer.toString('base64');
            }
          }
      
          res.render('homepage', { products });
        } catch (error) {
          console.error('Error fetching product information:', error);
          res.status(500).send('Internal Server Error');
        }
      });

      router.get('/users/uploads', async (req, res) => {
        try {
            const email = req.session.email;

            const user = await User.findOne({ email });
          
            const seller_name = user.name

          const products = await Product.find({seller_name});
      
          // Loop through each product to get image data
          for (const product of products) {
            // Check if the product has images
            if (product.images && product.images.length > 0) {
              const imagePath = product.images[0].path;
      
              // Read and encode the image data
              const imageBuffer = await fs.readFile(imagePath);
              product.imageData = imageBuffer.toString('base64');
            }
          }
      
          res.render('users/userUploads', { products , user });
        } catch (error) {
          console.error('Error fetching product information:', error);
          res.status(500).send('Internal Server Error');
        }
      });

    router.get('/signout', (req, res) => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
          res.redirect('/login');
        });
      });



module.exports = router;
