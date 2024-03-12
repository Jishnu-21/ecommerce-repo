const User = require('../models/user');
const Category = require('../models/category'); 
const Product = require('../models/products'); 
const Coupon = require('../models/coupon')
const Admin = require('../models/admin');  // Adjust the path accordingly
const bcrypt = require('bcrypt');
const Order = require('../models/order');
const ExcelJS = require('exceljs');

const Banner = require('../models/banner');

const { Parser } = require('json2csv');




const renderAdminloginPage = async (req, res) => {
    try {
      const errorMessage = "";
      res.render('adminLogin', { errorMessage });  
      } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
const renderBanner = async (req,res) => {
  try{
  const errorMessage = "";
  const banners = await Banner.find();

  res.render('admin/adminBanner', {banners, errorMessage });   
 } catch (error) {
  console.error('Error fetching products:', error);
  res.status(500).send('Internal Server Error');
}

}
const loginAdmin = async (req, res) => {
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
      }
      console.log('Session before login:', req.session);

  } catch (error) {
      console.error('Error during login:', error);
      return res.redirect('/admin?error=internal_error');
  }
};

const addBanner = async (req, res) => {
  try {
    // Extracting form data from the request body
    const { title, imageUrl, link, isActive } = req.body;
    
    // Converting isActive to a Boolean
    const isActiveBool = isActive === 'true';

    // Creating a new banner instance
    const newBanner = new Banner({
      title,
      imageUrl,
      link,
      isActive: isActiveBool,
    });

    // Saving the new banner to the database
    await newBanner.save();

    // Redirecting to a specific page or sending a success message
    res.redirect('/admin/banner'); // Redirect to the banners list, or any other page
  } catch (error) {
    console.error('Failed to add new banner:', error);
    res.status(500).send('Internal Server Error');
  }
};

const editBanner = async (req, res) => {
  const { bannerId, title, imageUrl, link, isActive } = req.body;

  try {
      await Banner.findByIdAndUpdate(bannerId, {
          $set: {
              title: title,
              imageUrl: imageUrl,
              link: link,
              isActive: isActive === 'true', // Convert string to boolean
          }
      });

      // Redirect or send a response upon successful update
      res.redirect('/admin/banner'); // Adjust the redirect URL as necessary
  } catch (error) {
      console.error('Error updating banner:', error);
      res.status(500).send('Internal Server Error');
  }
};

const updateStatus =  async (req, res) => {
  const { orderId, newStatus } = req.body;
  try {
    await Order.findByIdAndUpdate(orderId, { status: newStatus });
    res.redirect('/admin/orders'); // Redirect back to the orders page or wherever appropriate
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).send('Unable to update order status');
  }
};



const updateUserStatus = async (req, res) => {
    try {
        const userId = parseInt(req.body.userId);

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
};

const updateProductStatus = async (req, res) => {
  try {
      const product_id = parseInt(req.body.product_id);

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

      const referer = req.header('Referer') || '/admin/Products'; 
      res.redirect(referer);
  } catch (error) {
      console.error('Error updating product status:', error);
      res.status(500).send('Internal Server Error');
  }
};


const updateCategoryStatus = async (req, res) => {
    try {
        const category_id = parseInt(req.body.category_id);

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


const updateCouponStatus = async (req, res) => {
  try {
      const coupon_id = parseInt(req.body.coupon_id);

      const coupon = await Coupon.findOne({ coupon_id: coupon_id });

      if (!coupon) {
          console.error('Category not found:', coupon_id);
          return res.status(404).send('Category not found');
      }

      const newStatus = coupon.status === 'softDeleted' ? 'Active' : 'softDeleted';

      await Coupon.updateOne({ coupon_id: coupon_id }, { $set: { status: newStatus } });

      res.redirect('/admin/coupon');
  } catch (error) {
      console.error('Error updating category status:', error);
      res.status(500).send('Internal Server Error');
  }
};

const updateCategory = async (req, res) => {
  try {
      const { categoryID, editName, editDesc } = req.body;
      console.log(req.body)
      


      const nameRegex = /^(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9 _%,-]*$/;

      if (!nameRegex.test(editName)) {
          return res.status(400).json({success: false, message: 'Invalid name format. The first letter should be an alphabet or a number.'});
      }

      if (!nameRegex.test(editDesc)) {
        return res.status(400).json({success: false, message: 'Invalid desc format. The first letter should be an alphabet or a number.'});
    }
     

      const category = await Category.findById(categoryID);

      if (!category) {
          return res.status(404).json({success: false, message: 'Category not found'});
      }

      category.name = editName;
      category.description = editDesc;
      await category.save();

      res.json({success: true, message: 'Category updated successfully'});
  } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({success: false, message: 'Internal Server Error: ' + error.message});
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { couponId, editName, editDesc, discount, minPrice , expDate } = req.body;
    console.log(req.body);

    const now = new Date();

    const expirationDate = new Date(expDate); // Convert expDate to a Date object

    if (expirationDate <= now) {
      return res.status(400).json({ success: false, message: 'Expire date should be valid' });
    }

    const nameRegex = /^(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9 _%,-]*$/;

    if (!nameRegex.test(editName)) {
      return res.status(400).json({ success: false, message: 'Invalid name format. The first letter should be an alphabet or a number.' });
    }

    if (!nameRegex.test(editDesc)) {
      return res.status(400).json({ success: false, message: 'Invalid description format. The first letter should be an alphabet or a number.' });
    }


    // Validate discount
    const discountValue = parseFloat(discount); // Convert discount to a float
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      return res.status(400).json({ success: false, message: 'Discount must be a number between 0 and 100.' });
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    coupon.name = editName;
    coupon.description = editDesc;
    coupon.discount = discountValue; // Ensure discount is stored as a number
    coupon.minimumPrice = minPrice;
    coupon.expireDate = expDate;
    await coupon.save();

    res.json({ success: true, message: 'Coupon updated successfully' });
  } catch (error) {
    console.error('Error updating Coupon:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
  }
};


const addCategory = async (req, res) => {
  try {
    let { addName, addDesc } = req.body;
    console.log(req.body)
    

    const normalizedAddName = addName.trim().toLowerCase();

    const nameRegex = /^(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9 _%,-]*$/;

    if (!addName || !nameRegex.test(addName)) {
      return res.status(400).json({ success: false, message: 'Invalid category name format. It should contain only letters, numbers.' });
    }

    if (!addDesc || !nameRegex.test(addDesc)) {
      return res.status(400).json({ success: false, message: 'Invalid category description format. It should contain only letters, numbers, and spaces.' });
    }

    // Check if a category with the same name already exists
    const existingCategory = await Category.findOne({ name: normalizedAddName });
    if (existingCategory) {
      // Category with the same name found, send an error response
      return res.status(400).json({ success: false, message: 'A category with this name already exists.' });
    }

    // No existing category found, proceed to create a new one
    const newCategory = new Category({
      name: addName.trim(),
      description: addDesc.trim(),
      status: 'Active',
    });

    await newCategory.save();

    // Send success response
    res.json({ success: true, message: 'Category added successfully' });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
  }
};

const addCoupon = async (req, res) => {
  try {
    let { addName, addDesc, discount,  minPrice , expDate} = req.body;
    
    const normalizedAddName = addName.trim().toLowerCase();


    const nameRegex = /^(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9 _%,-]*$/;

    const now = new Date();

    const expirationDate = new Date(expDate); // Convert expDate to a Date object

    if (expirationDate <= now) {
      return res.status(400).json({ success: false, message: 'Expire date should be valid' });
    }


    if (!nameRegex.test(addName)) {
      return res.status(400).json({ success: false, message: 'Invalid name format. The first letter should be an alphabet or a number.' });
    } 

    if (!nameRegex.test(addDesc)) {
      return res.status(400).json({ success: false, message: 'Invalid name format. The first letter should be an alphabet or a number.' });
    }


    const discountValue = parseFloat(discount);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      return res.status(400).json({ success: false, message: 'Discount must be a number between 0 and 100.' });
    }

   
    const existingCoupon = await Coupon.findOne({ code: normalizedAddName });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: 'A coupon with this name already exists.' });
    }

    const newCoupon = new Coupon({
      code: addName,
      description: addDesc,
      discount: discountValue, // Ensure discount is stored as a number
      minimumPrice: minPrice,
      expireDate: expDate,
      status: 'Active', // Assuming 'Active' is a valid status
    });

    await newCoupon.save();
    res.json({ success: true, message: 'Coupon added successfully' });

  } catch (error) {
    console.error('Error adding coupon:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + error.message });
  }
};



  const renderAdminPage = async (req, res) => {
   try {

    const orders = await Order.find({});
    const users = await User.find({});

    const totalUsers = users.length;
   
    const totalOrders = orders.length;
    
    const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);

    const totalSales = orders.reduce((acc, order) => {
      const orderTotal = order.items.reduce((subtotal, item) => subtotal + item.quantity, 0);
      return acc + orderTotal;
    }, 0);
     
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      { $group: {
        _id: "$items.product_name",
        totalQuantity: { $sum: "$items.quantity" }
      }},
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    const topSellers = await Order.aggregate([
      { $unwind: "$items" },
      { $group: {
        _id: "$items.seller",
        totalRevenue: { $sum: "$total" } // Assuming total is per item; adjust as needed
      }},
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 }
    ]);

    const topCategories = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products", // Use the collection name for products
          localField: "items.product_id",
          foreignField: "_id",
          as: "itemDetails"
        }
      },
      { $unwind: "$itemDetails" },
      { $group: {
        _id: "$itemDetails.category",
        totalQuantity: { $sum: "$items.quantity" },
      }},
      { $sort: { totalQuantity: -1 } }, // Sort by totalQuantity or totalRevenue as per your requirement
      { $limit: 5 }
    ]);
      
    console.log(topProducts);

      const products = await Product.find({status : "inactive"});
      res.render('/admin/adminSales', { products, totalUsers, totalRevenue,totalSales, totalOrders , topProducts , topSellers ,topCategories });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
  const renderAdminProductsPage = async (req, res) => {
    try {
      const products = await Product.find({});
      res.render('admin/adminProducts', { products });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
  const renderAdminCategoryPage = async (req, res) => {
    try {
      const categories = await Category.find({});
      res.render('admin/adminCategory', { categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).send('Internal Server Error');
    }
  };

  const renderAdminCouponPage = async (req, res) => {
    try {
      const coupons = await Coupon.find({});
      res.render('admin/adminCoupons', { coupons });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).send('Internal Server Error');
    }
  };


  const renderAdminSales = async (req, res) => {
    try {
      const [orders, products, users, productin] = await Promise.all([
        Order.find({}),
        Product.find({}),
        User.find({}),
        Product.find({ status: "inactive" })
      ]);
  
      const totalUsers = users.length;
  
      const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  
      const totalSales = orders.reduce((acc, order) => {
        const orderTotal = order.items.reduce((subtotal, item) => subtotal + item.quantity, 0);
        return acc + orderTotal;
      }, 0);
  
      const topProductsPromise = Order.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product_name",
            totalQuantity: { $sum: "$items.quantity" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ]);
  
      const topSellersPromise = Order.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.seller",
            totalRevenue: { $sum: "$total" }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 }
      ]);
  
      const topCategoriesPromise = Order.aggregate([
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product_id",
            foreignField: "_id",
            as: "itemDetails"
          }
        },
        { $unwind: "$itemDetails" },
        {
          $group: {
            _id: "$itemDetails.category",
            totalQuantity: { $sum: "$items.quantity" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ]);
  
      const [topProducts, topSellers, topCategories] = await Promise.all([
        topProductsPromise,
        topSellersPromise,
        topCategoriesPromise
      ]);
  
      const topProductNames = topProducts.map(product => product._id);
  
      const topProductsDetails = await Product.find({ name: { $in: topProductNames } });
  
      res.render('admin/adminSales', {
        orders,
        productin,
        products,
        users,
        topProductsDetails,
        topCategories,
        topSellers,
        totalRevenue,
        totalSales,
        totalUsers
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
  const renderAdminUsersPage = async (req, res) => {
    try {
      const users = await User.find({});
      res.render('admin/adminUsers', { users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
 

  const ITEMS_PER_PAGE = 5;

  const renderAdminOrders = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = ITEMS_PER_PAGE;
      const skip = (page - 1) * limit;
  
      const orders = await Order.find({})
        .skip(skip)
        .limit(limit);
  
      const totalOrders = await Order.countDocuments();
      const totalPages = Math.ceil(totalOrders / limit);
  
      res.render('admin/adminOrders', { orders, totalPages, currentPage: page });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
  
  const getChartData = async (req, res) => {
    try {
        let aggregationPipeline = [];
    
        // Determine the interval type based on the request query
        const intervalType = req.query.interval || 'monthly';
    
        switch (intervalType) {
            case 'monthly':
                aggregationPipeline = [
                    {
                        $group: {
                            _id: { year: { $year: "$created_at" }, month: { $month: "$created_at" } },
                            count: { $sum: 1 }
                        }
                    }
                ];
                break;
            case 'yearly':
                aggregationPipeline = [
                    {
                        $group: {
                            _id: { year: { $year: "$created_at" } },
                            count: { $sum: 1 }
                        }
                    }
                ];
                break;
                case 'weekly':
                  aggregationPipeline = [
                      {
                          $group: {
                              _id: {
                                  year: { $year: "$created_at" },
                                  month: { $month: "$created_at" },
                                  week: { $week: "$created_at" }
                              },
                              count: { $sum: 1 }
                          }
                      }
                  ];
                  break;
              
            default:
                break;
        }
    
        // Execute the aggregation pipeline
        const productCounts = await Product.aggregate(aggregationPipeline);
    
        // Adjust sales data aggregation pipeline based on the interval type
        const salesAggregationPipeline = [
            {
                $match: { status: { $ne: "Cancelled" } }
            },
            {
                $project: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    week: { $isoWeek: "$createdAt" },
                    quantity: { $sum: "$items.quantity" }
                }
            },
            {
                $group: {
                    _id: {
                        year: intervalType === 'weekly' ? "$year" : "$year",
                        month: intervalType === 'weekly' ? "$month" : "$month",
                        week: intervalType === 'weekly' ? "$week" : null
                    },
                    sales: { $sum: "$quantity" }
                }
            }
        ];
    
        const salesData = await Order.aggregate(salesAggregationPipeline);
    
        res.json({ productCounts, salesData });
    } catch (error) {
        res.status(500).send(error);
    }
};

  
const getProductSalesData = async (req, res) => {
  try {
    const pipeline = [
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product_name',
          unitsSold: { $sum: '$items.quantity' }
        }
      },
      {
        $sort: {
          unitsSold: -1
        }
      }
    ];
  

    const productSalesData = await Order.aggregate(pipeline);

    res.status(200).json(productSalesData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}



const getMonthlyTotalSales = async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1; // Months are 0-indexed in JS
    const currentYear = new Date().getFullYear();

    const pipeline = [
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 0)
          },
          status: { $ne: "Cancelled" } // Exclude cancelled orders if necessary
        }
      },
      {
        $group: {
          _id: null, // Group all documents together
          totalMonthlySales: { $sum: '$total' }
        }
      }
    ];

    const [result] = await Order.aggregate(pipeline);
    
    // If there are no results for the month, total sales is 0
    const totalSales = result ? result.totalMonthlySales : 0;

    // Send the total monthly sales back to the client
    res.status(200).json({ totalMonthlySales: totalSales });
  } catch (error) {
    console.error('Error getting monthly total sales:', error);
    res.status(500).send(error);
  }

};

const downloadSales = async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  worksheet.columns = [
    { header: 'Time Period', key: 'timePeriod', width: 30 },
    { header: 'Product Name', key: 'productName', width: 30 },
    { header: 'Units Sold', key: 'unitsSold', width: 15 },
    { header: 'Total Revenue', key: 'totalRevenue', width: 20 },
  ];

  const interval = req.query.interval || 'monthly';

  let groupStage = {};

  switch (interval) {
    case 'yearly':
        groupStage = { $year: "$createdAt" };
        break;
    case 'monthly':
        groupStage = { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
        };
        break;
    case 'weekly':
        groupStage = {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" }
        };
        break;
    default:
        return res.status(400).send('Invalid interval specified');
}



  const salesAggregationPipeline = [
    { $unwind: "$items" },
    // Assuming a correct lookup to bring in product prices
    {
      $lookup: {
        from: "products", // Adjust based on your actual collection name
        localField: "items.product_id",
        foreignField: "_id",
        as: "itemDetails"
      }
    },
    { $unwind: "$itemDetails" },
    {
      $group: {
        _id: groupStage,
        unitsSold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: { $multiply: ["$items.quantity", "$itemDetails.price"] } },
        products: { $addToSet: "$items.product_name" }
      }
    }
  ];
  

  try {
    const salesData = await Order.aggregate(salesAggregationPipeline);

    if (!salesData || salesData.length === 0) {
      throw new Error('No sales data found');
    }

    salesData.forEach(group => {
      // Correctly construct timePeriod based on the aggregated data structure
      const timePeriod = constructTimePeriod(group._id, interval);
      group.products.forEach(productName => {
        worksheet.addRow({
          timePeriod,
          productName,
          unitsSold: group.unitsSold,
          totalRevenue: group.totalRevenue,
        });
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${interval}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).send('Internal Server Error');
  }
};


function constructTimePeriod(id, interval) {
  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];

  switch (interval) {
    case 'yearly':
      // Assuming _id itself is the year for yearly aggregation
      const year = typeof id === 'object' ? id.year : id;
      return `${year || 'Unknown Year'}`;
    case 'monthly':
      const monthName = id.month ? monthNames[id.month - 1] : 'Unknown Month';
      return `${monthName} ${id.year || 'Unknown Year'}`;
    case 'weekly':
      return `Week ${id.week || 'Unknown'}, ${id.year || 'Unknown Year'}`;
    default:
      return 'Unknown Period';
  }
}


const barChart = async (req, res) => {
  try {
      const selectedMonth = parseInt(req.query.month); // Parse the selected month from the query string

      const topSellingCategoriesMonthly = await Order.aggregate([
          // Match orders based on the selected month
          {
              $match: {
                  createdAt: {
                      $gte: new Date(new Date().getFullYear(), selectedMonth - 1, 1),
                      $lt: new Date(new Date().getFullYear(), selectedMonth, 0)
                  }
              }
          },
          // Unwind the items array
          { $unwind: '$items' },
          // Lookup to match categoryName from Product model
          { $lookup: {
              from: 'products',
              localField: 'items.product_id',
              foreignField: '_id',
              as: 'product'
          }},
          // Unwind the product array
          { $unwind: '$product' },
          // Group by category and month
          { $group: {
              _id: { category: '$product.categoryName', month: { $month: '$createdAt' } },
              totalSales: { $sum: '$items.quantity' }
          }},
          { $sort: { '_id.month': 1 } }
      ]);

      res.json(topSellingCategoriesMonthly);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
  }
};




const productApproval = async (req, res) => {
  try {
    const { product_id } = req.body;
    // Assuming 'Active' is a valid status in your schema
    const updatedProduct = await Product.findByIdAndUpdate(
      product_id,
      { status: 'Active' },
      { new: true }
    );
    if (!updatedProduct) {
      return res.status(404).send('Product not found');
    }
    // Redirect back to the admin page or wherever is appropriate
    res.redirect('/admin');
  } catch (error) {
    console.error('Error approving product:', error);
    res.status(500).send('Internal Server Error');
  }
};


const productDelete = async (req, res) => {
  try {
    const { product_id } = req.body;
    // This will remove the product from the database
    const deletedProduct = await Product.findByIdAndRemove(product_id);
    if (!deletedProduct) {
      return res.status(404).send('Product not found');
    }
    // Redirect back to the admin page or wherever is appropriate
    res.redirect('/admin');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).send('Internal Server Error');
  }
};


const renderUserDetails = async (req, res) => {
  try {
    const userId = req.params.userId; // Get the user ID from the URL parameters
    
    // Use findById with just the userId, not an object
    const user = await User.findById(userId);

    console.log(user)

    const products = await Product.find({seller_id:userId})
    
    const productsListed  = (await Product.find({  seller_name: user.name })).length

    // Aggregate order data for the seller
    const salesInfo = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.seller': user.name } },
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


    if (!user) {
      return res.status(404).send('User not found');
    }

    res.render('admin/adminUserDetails', { user,products ,productsListed,sellerSalesInfo}); // Render the user details page with the user data
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const downloadCustomDateSalesReport = async (req, res) => {
  try {
      const { start, end } = req.salesReportRange;
      const orders = await Order.find({
          createdAt: { $gte: start, $lte: end },
          status: { $ne: "Cancelled" }
      })
      .populate('items.product_id') // Populate product details if needed
      .lean();

      // Flatten order data to include each product as a separate line in the CSV
      const flattenedOrders = orders.flatMap(order => 
          order.items.map(item => ({
              productName: item.product_name, // Use product_name from items
              quantity: item.quantity,
              seller: item.seller
          }))
      );

      const fields = ['productName', 'quantity', 'seller']; // Define fields to include in the CSV
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(flattenedOrders);

      res.header('Content-Type', 'text/csv');
      res.attachment(`sales-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`);
      return res.send(csv);
  } catch (error) {
      console.error('Error downloading custom date sales report:', error);
      return res.status(500).send('Internal Server Error');
  }
};


const getCustomDateSalesReport = async (req, res, next) => {
  try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
          return res.status(400).json({ message: "Start date and end date are required." });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Set to the end of the day

      req.salesReportRange = { start, end }; // Attach the date range to the request object for use in subsequent handlers
      next(); // Pass control to the next handler
  } catch (error) {
      console.error('Error setting custom date range for sales report:', error);
      res.status(500).send(error);
  }
};



module.exports = {
  downloadCustomDateSalesReport,
  getCustomDateSalesReport,
    renderAdminPage,
    barChart,
    updateStatus,
    updateUserStatus,
    renderBanner,
    loginAdmin,
    renderAdminloginPage,
    renderUserDetails,
    updateProductStatus,
    updateCategoryStatus,
    updateCouponStatus,
    updateCategory,
    updateCoupon,
    renderAdminOrders,
    addCategory,
    addBanner,
    editBanner,
    addCoupon,
    productApproval,
    productDelete,
    renderAdminProductsPage,
    renderAdminCategoryPage,
    renderAdminUsersPage,
    renderAdminSales,
    renderAdminCouponPage,
    getChartData,
    getProductSalesData,
    getMonthlyTotalSales,
    downloadSales
};
