const User = require('../models/user');  // Adjust the path accordingly
const otpController = require('./otpController');
const bcrypt = require('bcrypt');
const Admin = require('../models/admin');  // Adjust the path accordingly

const notAuth = (req, res, next) => {
    try {
        console.log(req.session.user)
        if (!req.session.user) {
        console.log("User is not logged in, redirecting to login");
        return res.redirect('/login'); 
        
      }
  
      // If neither user nor admin is logged in, proceed to the next middleware or route handler
      next();
    } catch (error) {
      console.error("Error in authentication middleware:", error);
    }
  };

  const isAuth = (req, res, next) => {
    try {
        if (req.session.user) {
          console.log("User is already logged in, redirecting to homepage");
          return res.redirect('/');
        }
    
        next();
      } catch (error) {
        console.error("Error in authentication middleware:", error);
        // Redirect to the login page in case of an error
        return res.redirect('/login');
      }
    };

    const isAdmin = (req, res, next) => {
      try {
      
          if (req.session.admin) {
            console.log("Admin is already logged in, redirecting to admin page");
            return res.redirect('/admin');
          }
      
          next();
        } catch (error) {
          console.error("Error in authentication middleware:", error);
          // Redirect to the login page in case of an error
          return res.redirect('/login');
        }
      };

    const notAdmin = (req, res, next) => {
        try {
            console.log(req.session.user)
            if (!req.session.admin) {
            console.log("Admin is not logged in, redirecting to login");
            return res.redirect('/login'); 
            
          }
          next();
        } catch (error) {
          console.error("Error in authentication middleware:", error);
        }
      };


  module.exports = {
    isAuth,
    notAuth,
    notAdmin,
    isAdmin,
  }

