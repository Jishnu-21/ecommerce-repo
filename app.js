require("dotenv").config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const configPassport = require('./config/passport-config'); // Adjust the path accordingly
const morgan = require('morgan');
const multer = require('multer')
const flash = require('connect-flash');
const cron = require('node-cron');
const razorpay = require('razorpay');




const app = express();
const PORT = process.env.PORT || 3000;

console.log(process.env.Mongo_URI)
mongoose.connect(process.env.Mongo_URI).then(() => {
  console.log("Connected to MongoDB Atlas");
}).catch((error) => {
  console.error("Error connecting to MongoDB Atlas", error.message);
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now());
  }
});

var upload = multer({ storage: storage });


app.use(session({
  secret: 'y45896bshyskssu455y',
  resave: false,
  saveUninitialized: false,
}));

app.use(flash());


const instance = new razorpay({
  key_id: process.env.RZR_ID_KEY,  // Access environment variable securely
  key_secret: process.env.RZR_SECRET_KEY
});

app.use(passport.initialize());
app.use(passport.session());
app.use(morgan("dev"))

app.use((req, res, next) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Set up middleware

app.use(express.json());



app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use routes
const userController = require('./controllers/userController');
const authController = require('./controllers/authController');
const adminController = require('./controllers/adminController');
const verificationController = require('./controllers/verificationController');

const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/', adminRoutes);  
app.use('/', userRoutes); 

// Start the server

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


cron.schedule('0 0 * * *', async () => {
  console.log('Running a task every day at midnight to check coupon expiration dates');
  
  const now = new Date();
  
  // Find coupons where expireDate is less than the current date and status is 'Active'
  const expiredCoupons = await Coupon.find({
    expireDate: { $lt: now },
    status: 'Active'
  });

  // Update the status of all expired coupons to 'Inactive'
  if (expiredCoupons.length > 0) {
    await Promise.all(expiredCoupons.map(async (coupon) => {
      coupon.status = 'Inactive';
      await coupon.save();
    }));
    
    console.log(`Updated ${expiredCoupons.length} coupons to 'Inactive' status.`);
  } else {
    console.log('No expired coupons found.');
  }
});