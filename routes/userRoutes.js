const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.js');
const multer = require('multer')
const fs = require('fs').promises; // Import the 'fs' promises version
const authController = require('../controllers/authController');
const Order = require('../models/order'); // Import the Order model


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Specify the upload directory
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname); // Specify the filename
    },
  });

  const readAndEncodeImage = (path) => {
    const imageBuffer = fs.readFileSync(path);
    return imageBuffer.toString('base64');
  };
  
  // Create the multer instance
  const upload = multer({ storage: storage });

const { signup } = userController;
const { verifyUser } = userController;
const { loginUser } = userController;

const { generateInvoice } = require('../controllers/userController');


router.post('/signup', signup);
router.post('/verify', verifyUser);
router.post('/login', loginUser);
  
router.post('/addProducts', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'productFile', maxCount: 1 }]), userController.addProduct);
router.post('/editProduct/:productId', userController.editProduct);
router.post('/addToCart',authController.notAuth,userController.addToCart) ;
router.post('/removeFromCart',authController.notAuth,userController.removeFromCart) ;
router.post('/saveProfileChanges',upload.single('newPhoto'),userController.saveProfileChanges)
router.post('/category/status',userController.updateCategoryStatus)
router.post('/category/edit',userController.editCategory)
router.post('/category/add',userController.addCategory)
router.post('/ordercheckout',userController.ordercheckout)
router.post('/cancelOrder',userController.cancelOrder)
router.post('/addAddress',userController.addAddress)
router.post('/editAddress',userController.editAddress)
router.post('/updateCart',userController.updateCart)
router.post('/updateQuantity',userController.updateQuantity)
router.post('/deposit',userController.walletDeposit)
router.post('/withdraw',userController.walletWithdraw)
router.post('/refund',userController.refund)
router.post('/changePassword',userController.changePassword)
router.post('/applyRefferal',userController.applyRefferalCode)
router.post('/seller/refund',userController.refundStatus)
router.post('/validateCoupon', userController.validateCoupons)
router.post('/updateOrderTotal', userController.updateOrderTotal)

router.get('/order-details/:orderId', userController.renderOrderDetails);

router.get('/getOrderDetails',userController.getOrderDetails)

router.post('/updatePaymentStatus',userController.updatePaymentStatus)

router.get('/downloadInvoice', async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const order = await Order.findById(orderId).exec();
    generateInvoice(order, orderId, res);
  } catch (error) {
    console.error('Error generating or sending invoice:', error);
    res.status(500).send('Internal Server Error');
  }
});




router.get('/signup',authController.isAuth,userController.renderSignupPage);
router.get('/verify',authController.isAuth, userController.renderVerifyOtpPage);
router.get('/login',authController.isAuth, userController.renderLoginPage);

router.get('/users/add', authController.notAuth, userController.renderAddProductPage);
router.get('/users/success',authController.notAuth,userController.renderSuccess);
router.get('/users/orders',authController.notAuth,userController.renderOrder);
router.get('/product/:productId', userController.renderProductDetailsPage);
router.get('/', userController.renderHomepage);
router.get('/users/uploads', authController.notAuth, userController.renderUserUploads);
router.get('/users/userCart', authController.notAuth, userController.renderCart);
router.get('/users/checkout', authController.notAuth, userController.renderCheckOut);
router.get('/users/userProfile', authController.notAuth, userController.userProfile);
router.get('/users/wallet', authController.notAuth, userController.renderUserWallet);
router.get('/users', authController.notAuth, userController.userProfile);
router.get('/forgotPassword', authController.isAuth, userController.renderforgotPassword);



router.get('/signout',userController.signOut);
 

module.exports = router;
