const User = require('../models/user');  // Adjust the path accordingly
const Category = require('../models/category');  // Adjust the path accordingly
const Product = require('../models/products');
const fs = require('fs').promises; // Import the 'fs' promises version
const Admin = require('../models/admin');  // Adjust the path accordingly
const bcrypt = require('bcrypt');
const otpController = require('./otpController');
const path = require('path')
const Cart = require('../models/cart');
const Razorpay = require('razorpay');
const multer = require('multer')
const PDFDocument = require('pdfkit');
const Order = require('../models/order');
const Coupon = require('../models/coupon'); // Import your Coupon model
const Banner = require('../models/banner');





const storage = multer.memoryStorage(); // Change this storage strategy based on your requirements


const upload = multer({ storage: storage }).single('newPhoto'); 

let users = {};


const hashPassword = async (password) => {
  const saltRounds = 10; // You can adjust the number of salt rounds as needed
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password');
  }
};
  
const signup = async (req, res) => {
    const { email, password, phone, name, address, confirmPassword } = req.body;

    const otp = otpController.generateOTP();

    let errorMessage = 0;

    req.session.email = email;
    req.session.name = name;
    req.session.password = password;
    req.session.address = address;
    req.session.phone = phone;

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log("Email already exists");
             errorMessage = 'Email already exists. Please choose another email.';
            console.log('Error message:', errorMessage);
            return res.render('signup', { errorMessage });
        }

        if (password !== confirmPassword) {
            console.log("Passwords do not match");
             errorMessage = 'Passwords do not match. Please confirm your password.';
            console.log('Error message:', errorMessage);
            return res.render('signup', { errorMessage });
        }
        users[email] = { email, otp };
        otpController.sendVerificationEmail(email, otp);

        console.log(otp);

        res.redirect('/verify');
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Internal Server Error');
    }
};

const verifyUser = async (req, res) => {
  const { otp2 } = req.body;

  // Retrieve the email from the session
  const email = req.session.email;
  const name = req.session.name;
  const password = req.session.password;
  const address = req.session.address;
  const phone = req.session.phone;

  console.log('Typed OTP:', otp2);
  console.log('Received OTP:', users[email].otp);

  // Check if the timer has expired
  const currentTime = Math.floor(new Date().getTime() / 1000);
  if (currentTime > users[email].otpExpiry) {
    // Timer has expired, generate a new OTP
    const newOtp = generateOTP();
    users[email].otp = newOtp;
    users[email].otpExpiry = currentTime + otpExpiryTime; // Set new expiry time

    // Send the new OTP to the user (You need to implement your own logic to send OTP)

    // Update the console log
    console.log('New OTP sent:', newOtp);

    res.status(401).json({ message: 'OTP expired. A new OTP has been sent to your email.' });
    return;
  }

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

    res.redirect('/login');
  } else {
    res.status(401).json({ message: 'Invalid OTP' });
  }
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const otpExpiryTime = 300; 


const loginUser = async (req, res) => {
    try {
        console.log('Session before login:', req.session);

        const { email, password } = req.body;
        req.session.email = email;

        // Check if the email and password exist in the admin database
        const admin = await Admin.findOne({ email });

        if (admin) {
            // Check if the password is correct using bcrypt.compare
            const isPasswordValid = await bcrypt.compare(password, admin.password);
            req.session.admin = admin;
            req.session.save();


            if (isPasswordValid) {
                console.log("Admin logged in");
                return res.redirect('/admin');
            } else {
                console.log("Incorrect password");
                 const errorMessage = 'incorrect password. Please check your password.';
                console.log('Error message:', errorMessage);
                return res.render('login', { errorMessage });
            }
        } else {
            // If admin not found in the admin database, check the regular user database
            const user = await User.findOne({ email });

            if (user) {
                req.session.user = user;
                req.session.save();
                console.log(`${user.name} logged in`);
                if (user.status === 'Blocked') {
                    console.log("User is blocked");
                    const errorMessage = 'User is blocked. Please contact your admin.';
                    console.log('Error message:', errorMessage);
                    return res.render('login', { errorMessage });
                }
                // Check if the password is correct using bcrypt.compare
                const isPasswordValid = await bcrypt.compare(password, user.password);

                if (isPasswordValid) {
                    console.log(user.name + " logged in");
                    return res.redirect('/');
                } else {
                    console.log("Incorrect password");
                    const errorMessage = 'incorrect password. Please check your password.';
                    console.log('Error message:', errorMessage);
                    return res.render('login', { errorMessage });                }
            } else {
                console.log("User not found");
                const errorMessage = 'Account not found. Please check your credentials.';
                console.log('Error message:', errorMessage);
                return res.render('login', { errorMessage });           
               }
        }
        console.log('Session before login:', req.session);

    } catch (error) {
        console.error('Error during login:', error);
        return res.redirect('/login?error=internal_error');
    }
};

  
const addProduct = async (req, res) => {
  try {
    const { name, description, categoryId, price, quantity } = req.body;

    console.log('categoryId:', categoryId);
    console.log(name)
    
    const email = req.session.email;
    const user = await User.findOne({ email });

    const category = await Category.findOne({name:  categoryId });

    if (!category) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    const seller_name = user.name;
    const categoryName = category.name; // Use the found category's name
    const category_id = category._id;
    const seller_id = user._id;

    const uploadFolder = 'uploads/';

    const images = req.files['images'];

    const product = new Product({
      name,
      seller_name,
      description,
      price,
      seller_id,
      quantity,
      categoryName,
      category_id,
      images: images.map(img => ({ dataName: img.originalname, name: img.filename, path: img.path })),
    });

    await product.save();
    console.log('Product successfully added');
    res.redirect('/users/uploads');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

function generateOrderNumber() {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
}


const ordercheckout = async (req, res) => {
  try {
    const { selectedAddress, payment ,paymentStatus  } = req.body;
    const email = req.session.email;



    // Use the selected address to fetch the actual address from the user's addresses
    const user = await User.findOne({ email });

    const addressIndex = parseInt(selectedAddress); // Convert the selectedAddress to integer
    const address = user.address[addressIndex]; // Retrieve the address using the index


    // Construct the order object
    const orderData = {
      orderNumber: generateOrderNumber(), // You need to implement a function to generate order numbers

      items: await Promise.all(
        user.cart.items.map(async (cartItem) => {
          const product = await Product.findById(cartItem.product_id._id);
          console.log(product)
          return {
            image: product.images[0].path,
            product_id: cartItem.product_id._id,
            product_name: product ? product.name : "Product Not Found",
            quantity: cartItem.quantity,
            seller: product.seller_name,
          };
        })
      ),
      total: user.cart.subTotal,
      buyer: user.name,
      address,
      status:paymentStatus,
      paymentMethod: payment,
    };
    const order = new Order(orderData);

    const savedOrder = await order.save();

    await Promise.all(
      user.cart.items.map(async (cartItem) => {
        const product = await Product.findById(cartItem.product_id._id);
        
        if (product) {
          product.quantity -= cartItem.quantity;

          await product.save();
        }
      })
    );

    user.cart = { subTotal: 0, items: [] };
    await user.save();

    if (paymentStatus === "Failed") {
      res.redirect('/')
    }
    else{
    // Handle the response as needed
    res.redirect('/users/success')
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};


const editProduct = async (req, res) => {
  try {
      const { name, description, categoryname, quantity,price } = req.body;

      const email = req.session.email;

      const user = await User.findOne({ email });

      // Find the product by product_id
      const product = await Product.findOne({name :name });

      if (!product) {
          return res.status(404).json({ message: 'Product not found' });
      }

      // Update product details
      product.name = name;
      product.description = description;
      product.categoryName = categoryname;
      product.price = price;
      product.quantity = quantity;

      // Save the updated product to the database
      await product.save();

      res.redirect('/users/uploads'); // Redirect to the home page or product list page
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};



const addToCart = async (req, res) => {
  try {
    const { productId, quantity, productPrice } = req.body;

    console.log('ProductId:', productId);

    // Use req.session.user to get the user ID from the session
    const userId = req.session.user;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the product is already in the user's cart
    const existingCartItem = user.cart.items.find(item => item.product_id.toString() === productId);

    if (existingCartItem) {
      // If the product is already in the cart, update the quantity
      existingCartItem.quantity += parseInt(quantity, 10);
    } else {
      // If the product is not in the cart, create a new cart item

      // Fetch the product details including the price from the Product model
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const cartItem = {
        product_id: productId,
        quantity: parseInt(quantity, 10)
      };

      // Add the new cart item to the user's cart
      user.cart.items.push(cartItem);
    }

    user.cart.subTotal = user.cart.items.reduce((total, item) => {
      return total + item.quantity * parseFloat(productPrice);
    }, 0);

    // Save the changes
    await user.save();

   res.redirect('users/usercart')
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};




const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;

    // Assuming you have the user ID stored in the session
    const userId = req.session.user._id;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove the item from the cart by filtering out the specified product ID
    user.cart.items = user.cart.items.filter(item => item.product_id.toString() !== productId);

    // Recalculate the subtotal
    user.cart.subTotal = user.cart.items.reduce((total, item) => {
      const productPrice = item.product_id.price || 0; // Assuming 'price' is a field in your Product model
      return total + item.quantity * productPrice;
    }, 0);

    // Save the changes
    await user.save();
  
    res.redirect('users/userCart')
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const renderSignupPage = (req, res) => {
  const errorMessage = ''; // Define errorMessage here or retrieve it from your logic
  res.render('signup', { errorMessage });
};  

const renderVerifyOtpPage = (req, res) => {
  res.render('verifyotp');
};

const renderLoginPage = (req, res) => {
  try {
      const errorMessage = "";
      res.render('login', { errorMessage });
  } catch (error) {
      console.error('Error rendering login page:', error);
      res.status(500).send('Internal Server Error');
  }
};


const userProfile = async(req, res) => {
  const email = req.session.email;
  console.log(req.session.user.name)
  const sellerName = req.session.user.name;  // Assuming you store the user's name in the session
  const user = await User.findOne({ email });

  const productsListed  = (await Product.find({  seller_name: sellerName })).length

  // Aggregate order data for the seller
  const salesInfo = await Order.aggregate([
    { $unwind: '$items' },
    { $match: { 'items.seller': sellerName } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalSales: { $sum: 1 },
        totalQuantity: { $sum: '$items.quantity' },
      }
    },
    {
      $project: {
        _id: 0,
        totalRevenue: 1,
        totalSales: 1,
        totalQuantity: 1,
      }
    }
  ]);


  // If there is no sale, return default values
  const sellerSalesInfo = salesInfo.length > 0 ? salesInfo[0] : {
    totalRevenue: 0,
    totalSales: 0,
    totalQuantity: 0,
    productsListed: 0
  };

  res.render('users/userProfile', { user, sellerSalesInfo,productsListed ,  error: req.flash('error'),
  success: req.flash('success') });
};


const cancelOrder = async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send('Order not found.');
    }

    // Update the order status to "Cancelled"
    order.status = 'Cancelled';
    await order.save();

    // Redirect or send a response as needed
    res.redirect('/users/orders'); // Redirect to the user's order history page
  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};

const saveProfileChanges = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { newUsername, newEmail, newPhone, newAddress } = req.body;
    console.log('Received file:', req.file); // Log the received file
    console.log('Received body:', req.body);

    // Fetch the user from the database using the user's ID
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if a new photo was uploaded
    if (req.file) {
      // Assuming you are storing the image as a binary buffer in the database
      user.photo = req.file.filename; // Save the file buffer in the 'newPhoto' field
    }

    // Update other user data
    user.name = newUsername || user.name;
    user.email = newEmail || user.email;
    user.phone = newPhone || user.phone;
    user.address = newAddress || user.address;

    // Save the changes
    await user.save();

    // Send a success response
    res.redirect('users/userProfile');
  } catch (error) {
    console.error('Error saving profile changes:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const addCategory = async (req, res) => {
  const { addName, addDesc } = req.body;

  try {
      if (!addName || addName.trim() === '') {
          return res.status(400).send('Category name is required.');
      }

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
};

const updateCategoryStatus = async (req, res) => {
  const category_id = parseInt(req.body.category_id);

  try {
      const category = await Category.findOne({ category_id: category_id });

      if (!category) {
          console.error('Category not found:', category_id);
          return res.status(404).send('Category not found');
      }

      // Toggle the status
      const newStatus = category.status === 'softDeleted' ? 'Active' : 'softDeleted';

      // Update category status using Mongoose
      await Category.updateOne({ category_id: category_id }, { $set: { status: newStatus } });

      // Redirect back to the admin page or send a response as needed
      res.redirect('/admin/category');
  } catch (error) {
      console.error('Error updating category status:', error);
      res.status(500).send('Internal Server Error');
  }
};

const editCategory = async (req, res) => {
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

      res.redirect('/admin/category');
  } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).send('Internal Server Error: ' + error.message);
  }
};

const addAddress = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || address.trim() === '') {
      console.error('Address is empty. Not adding to the database.');
      return res.redirect('/users/checkout');
    }

    const email = req.session.email;
    const user = await User.findOne({ email });

    user.address.push(address);

    await user.save();

    console.log('Address added successfully:', address);
    const referer = req.header('Referer') || '/users/userProfile'; 
    res.redirect(referer);
  } catch (error) {
    console.error('Error fetching user information:', error);
    res.status(500).send('Internal Server Error');
  }
};

const editAddress = async (req, res) => {
  try {
    const { editedAddress } = req.body;
    
    const selectedIndex = parseInt(req.body.selectedIndex);

    if (!address || address.trim() === '') {
      console.error('Address is empty. Not adding to the database.');
      return res.redirect('/users/checkout');
    }

    const email = req.session.email;
    const user = await User.findOne({ email });

    users.find(user => user._id === userId).address[selectedIndex] = editedAddress;

    await user.save();

    console.log('Address added successfully:', address);

    res.redirect('/users/checkout');
  } catch (error) {
    console.error('Error fetching user information:', error);
    res.status(500).send('Internal Server Error');
  }
};


const renderAddProductPage = async (req, res) => {
    try {
      
      // Get the email from the session
      const email = req.session.email;
  
      // Assuming the authenticated user details are stored in req.user
      const categories = await Category.find({ status: 'Active' });
      const user = await User.findOne({ email });
  
      console.log(email);
  
      // Render the addProduct view with user details
      res.render('users/addProduct', { user, categories });
    } catch (error) {
      console.error('Error fetching user information:', error);
      res.status(500).send('Internal Server Error');
    }
  };

  const updateCart = async (req, res) => {
    try {
      const email = req.session.email;
      const user = await User.findOne({ email });

      // Calculate subtotal and total
      const subtotal = user.cart.items.reduce((total, item) => total + item.product_id.price * item.quantity, 0);
      const total = subtotal + 6.99; 
      
      console.log(subtotal)
      await user.save()

      // Respond with updated cart data
      res.json({ subtotal, total });
  } catch (error) {
      console.error('Error fetching cart data:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
  };
  
 
const updateQuantity = async (req, res) => {
    try {
        // Extract productId and new quantity from the request body
        const {productId, quantity } = req.body;
        console.log(quantity)
        console.log(productId)
        const email = req.session.email
        // Find the user and the item in the cart
        const user = await User.findOne({ email })
        console.log(email)
        const product = await Product.findOne({ _id: productId });
        const itemIndex = user.cart.items.findIndex(item => item.product_id.toString() === productId);
        console.log(itemIndex)
            user.cart.items[itemIndex].quantity = quantity;
            user.cart.subTotal= quantity * product.price
            await user.save(); // Save the updated user object
       
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const renderProductDetailsPage = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findOne({ product_id: productId });
    const allrelatedProducts = await Product.find({   _id: { $ne: product._id }}) 
   
    shuffleArray(allrelatedProducts)

    const relatedProducts = allrelatedProducts.slice(0, 4);




    const email = req.session.email

    const user = await User.findOne({ email });


    // Read and encode the image data for all images
    const imageData = [];
    for (const image of product.images) {
      const imageBuffer = await fs.readFile(image.path);
      imageData.push(imageBuffer.toString('base64'));
    }

    // Attach the imageData array to the product object
    product.imageData = imageData;

    // Render the product details page
    res.render('users/productDetails', { product,user ,relatedProducts });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).send('Internal Server Error');
  }
};
const renderHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    const activeBanners = await Banner.find({ isActive: true }).sort({ banner_id: 1 });

    // Construct the base query with seller ID and status
    let query = {
      ...(user && { seller_id: { $ne: user._id } }),
      status: 'Active'
    };

    // Add search term to the query if it exists
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    // Add category to the query if it exists
    if (req.query.category) {
      query.categoryName = req.query.category;  // Adjust to use categoryName field
    }

    // Add price range to the query if minPrice or maxPrice are provided
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {
        ...(req.query.minPrice && { $gte: parseInt(req.query.minPrice) }),
        ...(req.query.maxPrice && { $lte: parseInt(req.query.maxPrice) })
      };
    }

    // Sorting
    let sortOptions = {};
    if (req.query.sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (req.query.sort === 'price_desc') {
      sortOptions = { price: -1 };
    } else if (req.query.sort === 'name_asc') {
      sortOptions = { name: 1 };
    } else if (req.query.sort === 'name_desc') {
      sortOptions = { name: -1 };
    }

    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const startIndex = (page - 1) * itemsPerPage;

    // Fetch the products using the constructed query and sorting options
    const products = await Product.find(query)
                                  .sort(sortOptions)
                                  .skip(startIndex)
                                  .limit(itemsPerPage);

    // Fetch categories for filters
    const categories = await Category.find({ status: 'Active' });

    // Encode the image data for each product
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        const imagePath = product.images[0].path;
        const imageBuffer = await fs.readFile(imagePath);
        product.imageData = imageBuffer.toString('base64');
      }
    }

    // Count the total number of products for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    // Render the homepage with the fetched products, filters, and sorting options
    res.render('homepage', {
      products,
      user,
      activeBanners,
      categories,
      currentPage: page,
      totalPages,
      selectedCategory: req.query.category || '',
      minPrice: req.query.minPrice || '',
      maxPrice: req.query.maxPrice || '',
      searchQuery: req.query.search || '',
      selectedSort: req.query.sort || '' // Pass the selected sorting option to the view
    });
  } catch (error) {
    console.error('Error fetching product information:', error);
    res.status(500).send('Internal Server Error');
  }
};


const applyRefferalCode = async (req, res) => {
  const { referralCode } = req.body; // The submitted referral code
  const userId = req.session.userId; // The ID of the user applying the referral code

  if (!referralCode) {
    return res.status(400).send('Referral code is required.');
  }

  try {
    // Find the user who owns the referral code
    const referralUser = await User.findOne({ referralCode: referralCode });

    if (!referralUser) {
      return res.status(404).send('Referral code not found.');
    }

    // Prevent users from using their own referral code
    if (referralUser._id.toString() === userId) {
      return res.status(400).send('You cannot use your own referral code.');
    }

    // Find the user applying the referral code
    const applyingUser = await User.findById(userId);

    if (!applyingUser) {
      return res.status(404).send('User not found.');
    }

    // Check if the applying user has already used a referral code
    if (applyingUser.referralCodeUsed) {
      return res.status(400).send('Referral code has already been used.');
    }

    // Update the balance of the user who owns the referral code
    referralUser.balance += 100; // Add 100 Rs to their balance
    await referralUser.save();

    // Mark that the applying user has used a referral code
    applyingUser.referralCodeUsed = true;
    await applyingUser.save();

    res.send('Referral code applied successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while applying the referral code.');
  }
};


const renderUserUploads = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const pageSize = 2; // Number of items you want per page
    const skip = (page - 1) * pageSize;
    const totalItems = await Product.countDocuments();

    const totalPages = Math.ceil(totalItems / pageSize);

    const email = req.session.email;
    const user = await User.findOne({ email });
    const seller_name = user.name;

    const products = await Product.find({ seller_name }) .skip(skip)
    .limit(pageSize);;

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

    res.render('users/userUploads', { products, user ,  currentPage: page,  totalPages });
  } catch (error) {
    console.error('Error fetching product information:', error);
    res.status(500).send('Internal Server Error');
  }
};

const signOut = (req, res) => {
  req.session.user = null;
  req.session.admin = null;
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
};

const renderCart = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId).populate('cart.items.product_id');

    const perPage = 2; // Number of items per page
    const page = req.query.page || 1;

    // Assuming 'user.cart.items' is an array of all cart items
    const items = user.cart.items.slice((page - 1) * perPage, page * perPage);


    const allrelatedProducts = await Product.find() 
   
    shuffleArray(allrelatedProducts)

    const relatedProducts = allrelatedProducts.slice(0, 4);


    if (!user) {
      res.redirect('/login')
    }
    res.render('users/userCart', { user,relatedProducts,
      items: items,
      currentPage: page,
      totalPages: Math.ceil(user.cart.items.length / perPage) });
  } catch (error) {
    console.error('Error rendering cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const ITEMS_PER_PAGE = 3;
const renderOrder = async (req, res) => {
  try {
    const userId = req.session.user.name;
    const email = req.session.email;

    // Count total number of orders for the user
    const totalOrders = await Order.countDocuments({ buyer: userId });

    // Determine current page
    const currentPage = +req.query.page || 1;

    // Calculate the skip value based on the current page and items per page
    const skip = (currentPage - 1) * ITEMS_PER_PAGE;

    // Fetch seller orders for the current page using pagination
    const sellerOrders = await Order.find({ 'items.seller': userId })
                                    .populate('items.product_id')
                                    .skip(skip)
                                    .limit(3);

    // Fetch buyer orders for the current page using pagination
    const orders = await Order.find({ buyer: userId })
                              .skip(skip)
                              .limit(ITEMS_PER_PAGE);

    res.render('users/orders', { 
      Orders: orders,
      sellerOrders: sellerOrders,
      user: req.session.user,
      currentPage: currentPage,
      hasNextPage: ITEMS_PER_PAGE * currentPage < totalOrders,
      hasPreviousPage: currentPage > 1,
      nextPage: currentPage + 1,
      previousPage: currentPage - 1,
      lastPage: Math.ceil(totalOrders / ITEMS_PER_PAGE)
    });
  } catch (error) {
    console.error('Error rendering orders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};




const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      req.flash('error', 'Not logged in.'); // Set flash message
      return res.redirect('/users/userProfile'); // Redirect to the profile page
    }

    if (newPassword !== confirmPassword) {
      req.flash('error', 'New passwords do not match.');
      return res.redirect('/users/userProfile');
    }

    const user = await User.findById(userId);

    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/users/userProfile');
    }

    const match = await bcrypt.compare(currentPassword, user.password);

    if (!match) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/users/userProfile');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    req.flash('success', 'Password changed successfully.'); // Set a success message
    res.redirect('/users/userProfile'); // Redirect after successful operation
  } catch (error) {
    console.error(error);
    req.flash('error', 'Internal server error.');
    res.redirect('/users/userProfile');
  }
};




const renderOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId; // Get the order ID from the URL parameters
    const order = await Order.findById(orderId).populate('items.product_id');
    
    const email= req.session.email;

    const user= await User.findOne({ name : order.buyer });
    
    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.render('users/orderDetails', { order: order , user}); // Render the order details page with the order data
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


function generateInvoice(order, orderId, res) {
  // Create a new PDF document
  const doc = new PDFDocument();

  // Buffer to store the PDF content
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    // Concatenate buffers into a single buffer
    const pdfData = Buffer.concat(buffers);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${orderId}.pdf"`);

    // Send the PDF as the response
    res.send(pdfData);
  });

  // Generate the PDF content
  doc.fontSize(16).text('Invoice', { align: 'center' }).moveDown(1);



  // Add invoice details
  doc.fontSize(14).text(`Invoice Number: ${order.orderNumber}`, 50, 150);
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
  doc.moveDown();

  // Add customer details
  doc.fontSize(12).text(`Bill To: ${order.buyer}`, 50, 200);
  doc.text(`Address: ${order.address}`, 50, 220);
  doc.moveDown();

  // Add product table headers
  const tableHeaders = ['Product Name', 'Quantity', 'Total'];
  const startY = 280; // Adjust the starting Y position for the table
  const startX = 50;
  const cellPadding = 10;
  const columnWidth = 150;
  doc.font('Helvetica-Bold');
  tableHeaders.forEach((header, index) => {
    doc.text(header, startX + index * columnWidth, startY, { width: columnWidth, align: 'left' });
  });

  // Add product details
  doc.font('Helvetica');
  let yPos = startY + cellPadding + 5;
  order.items.forEach(item => {
    doc.text(item.product_name, startX, yPos, { width: columnWidth, align: 'left' });
    doc.text(item.quantity.toString(), startX + columnWidth, yPos, { width: columnWidth, align: 'center' });
    yPos += cellPadding + 15;
  });

  // Add total amount
  const total = order.total
  doc.fontSize(14).text(`Total: Rs: ${total.toFixed(2)}`, { align: 'right' });

  // Finalize PDF
  doc.end();
}


const renderSuccess = async (req, res) => {
  try {
    const userId = req.session.user.name;
    
    const email = req.session.email;
    const user = await User.findOne({ email });

    console.log(userId)



    res.render('users/orderComplete', {user });
  } catch (error) {
    console.error('Error rendering cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const renderCheckOut = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId).populate('cart.items.product_id');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.render('users/checkout', { user });
  } catch (error) {
    console.error('Error rendering cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

 const validateCoupons =  async (req, res) => {
  const { couponCode } = req.body;

  try {
      // Find the coupon in the database
      const coupon = await Coupon.findOne({ code: couponCode });

      // If the coupon is not found, return an error response
      if (!coupon) {
          return res.status(404).json({ error: 'Coupon not found' });
      }

      // If the coupon is inactive, return an error response
      if (coupon.status !== 'Active') {
          return res.status(400).json({ error: 'Coupon is inactive' });
      }

      // Return the coupon details if it's valid
      res.json({
          code: coupon.code,
          description: coupon.description,
          discountPercentage: coupon.discount,
          minimumPrice: coupon.minimumPrice
      });
  } catch (error) {
      // Handle errors
      console.error('Error validating coupon:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};
const updateOrderTotal = async (req, res) => {
  const { discountedTotal } = req.body;

  try {
      const email = req.session.email;

      // Find the user's order by email
      const user = await Order.findOne({ email: email });

      // If no order is found, return an error response
      if (!user) {
          return res.status(404).json({ error: 'Order not found' });
      }

      // Update the order's subTotal with the discountedTotal
      user.subTotal = discountedTotal;

      // Save the updated order to the database
      await user.save();

      // Send a success response
      return res.status(200).json({ message: 'Order total updated successfully' });
  } catch (error) {
      // Handle errors
      console.error('Error updating order total:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const renderforgotPassword = async (req, res) => {
  try {    
    res.render('forgotPassword'); // Render the order details page with the order data
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const renderUserWallet = async (req, res) => {
  try {    
    const email = req.session.email;
    const user = await User.findOne({ email });
    res.render('users/wallet',{user}); // Render the order details page with the order data
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const walletDeposit = async (req, res) => {
  const email = req.session.email;
  const user = await User.findOne({ email });
  const amount = parseFloat(req.body.amount);
  console.log(amount)

  if (!isNaN(amount) && amount > 0) {
    user.balance += amount;
    res.redirect('users/wallet')
    await user.save();
  } else {
    res.status(400).send('Invalid amount');
  }
};

const walletWithdraw = async (req, res) => {
  const email = req.session.email;
  const user = await User.findOne({ email });
  
  const amount = (req.body.amount);
  console.log(amount)
  if (!isNaN(amount) && amount > 0 && amount <= user.balance) {
    user.balance -= amount;
    res.redirect('users/wallet')
    await user.save();
  } else {
    res.status(400).send('Invalid amount or insufficient balance');
  }
};

const refund= async (req, res) => {
  try {
    const { orderId,reason } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.status = 'Refund';
    order.message = reason;
    await order.save();
    res.redirect('users/order-details')
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
const refundStatus = async (req, res) => {
  try {
    const { orderId, productId, refund } = req.body;

    // Find the order by orderId and populate product_id to access its price
    const order = await Order.findById(orderId).populate('items.product_id');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Find the item in the order's items array by productId
    const itemIndex = order.items.findIndex(item => item.product_id._id.toString() === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Product not found in order' });
    }

    if (refund === 'true') {
      // Change the product_status of the item to 'Refunded'
      order.items[itemIndex].product_status = 'Refunded';
      
      // Check if the price and quantity are valid numbers
      const price = order.items[itemIndex].product_id.price;
      const quantity = order.items[itemIndex].quantity;

      if (typeof price !== 'number' || isNaN(price) || typeof quantity !== 'number' || isNaN(quantity)) {
        console.error('Invalid price or quantity.');
        return res.status(400).json({ error: 'Invalid price or quantity' });
      }

      // Calculate the refunded amount for the specific product

      // Find the buyer and ensure balance is a valid number
      const user = await User.findOne({ name: order.buyer });

      if (!user || typeof user.balance !== 'number' || isNaN(user.balance)) {
        return res.status(404).json({ error: 'Buyer not found or invalid balance' });
      }

      // Subtract the refunded amount from the buyer's balance

      // Check all items to see if they are refunded, to update order status
      const allRefunded = order.items.every(item => item.product_status === 'Refunded');
      order.status = allRefunded ? 'Refunded' : order.status;

      // Save the updated order and user
      await order.save();

      res.redirect('/users/orders');
    } else if (refund === 'false') {
      order.items[itemIndex].product_status = 'Refund Denied';
      await order.save();
      res.redirect('/users/orders');
    } else {
      return res.status(400).json({ error: 'Invalid refund value' });
    }
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const updatePaymentStatus = async (req, res) => {
  try {
    // Extract orderId from the request body
    const { orderId } = req.body;
     
    // Find the order by orderId and update its status to 'Pending'
    const order = await Order.findByIdAndUpdate(orderId, { status: 'Pending' });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.redirect('/users/orders');
  } catch (error) {
    // Handle any unexpected errors
    console.error("Error updating payment status:", error);
    res.status(500).send("Internal server error");
  }
};


const getOrderDetails = async (req, res) => {
  const orderId = req.query.orderId;
  const order = await Order.findById(orderId)
  
  console.log(order)

  if (!order) {
      return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
};



module.exports = {
    renderforgotPassword,
    updateQuantity,
    renderUserWallet,
    applyRefferalCode,
    refund,
    getOrderDetails,
    changePassword,
    refundStatus,
    updatePaymentStatus,
    ordercheckout,
    renderCart,
    signup,
    walletWithdraw,
    walletDeposit,
    updateCart,
    verifyUser,
    renderOrderDetails,
    generateInvoice,
    loginUser,
    editAddress,
    renderOrder,
    cancelOrder,
    userProfile,
    addCategory,
    updateCategoryStatus,
    editCategory,
    renderSignupPage,
    renderVerifyOtpPage,
    addAddress,
    renderSuccess,
    saveProfileChanges,
    renderLoginPage,
    hashPassword,
    updateOrderTotal,
    addProduct,
    renderCheckOut,
    editProduct,
    addToCart,
    removeFromCart,
    renderAddProductPage,
    renderProductDetailsPage,
    renderHomepage,
    renderUserUploads,
    validateCoupons,
    signOut,

};

