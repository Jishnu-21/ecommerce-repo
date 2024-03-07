const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const configPassport = require('./config/passport-config'); // Adjust the path accordingly
const morgan = require('morgan');
const Razorpay = require('razorpay');
const multer = require('multer')
const flash = require('connect-flash');



const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb://localhost:27017/userData');

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


const razorpay = new Razorpay({
  key_id: 'RZR_KEY_ID',
  key_secret: 'RZR_KEY_SECRET',
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
