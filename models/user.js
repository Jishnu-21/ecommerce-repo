const mongoose = require('mongoose');
const shortid = require('shortid');


const userSchema = new mongoose.Schema({
  userID: {
    type: Number,
    unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      unique: true,
      required: true,
    },
    phone: {
      type: Number,
      trim: true,
    },
    address:[ {
      type: String,
      trim: true,
    }],
    password: {
      type: String,
      required: true,
      trim: true,
    },
    photo: {
       type: String
     },
    status: {
      type: String,
      default: 'Active', // You can set a default status if needed
      enum: ['Active', 'inactive','Blocked'], // You can define possible values for status
    },
    
  cart: {
    items: [{
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
    }],
    subTotal: { default: 0, type: Number }
  },
  balance: {
    type: Number,
    default: 0,
    validate: {
        validator: function (value) {
            // Check if value is a number and not NaN
            return typeof value === 'number' && !isNaN(value);
        },
        message: '{VALUE} is not a valid number for balance'
    }
},
  referralCode: {
    type: String,
    unique: true,
    default: shortid.generate // Automatically generate a referral code
  },
   referralCodeUsed: {
    type: Boolean,
    default: false
  }
  });
  
  userSchema.pre('save', async function (next) {
    if (!this.userID) {
      try {
        const maxUser = await this.constructor.findOne().sort({ userID: -1 });
        this.userID = maxUser ? maxUser.userID + 1 : 1;
      } catch (error) {
        return next(error);
      }
    }
  
    if (!this.cart) {
      this.cart = { items: [], subTotal: 0 };
    }
  
    // Generate a referral code if one does not exist
    if (!this.referralCode) {
      this.referralCode = shortid.generate();
    }
  
    next();
  });
  
  
const User = mongoose.model('User', userSchema);


module.exports = User;