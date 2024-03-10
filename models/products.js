const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    product_id: {
      type: Number,
      unique: true,
    },
    seller_name: {
      type: String,
      required: true,
    },
    seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
  },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    sold:{
      default: 0,
      select: false,
      type: Number,
    },
    price: {
      type: Number,
      required: true,
    },

    quantity:{
      type: Number,
      required: true,
    },
    filtetype:{
      type: String,
    },
    fileformat:{
      type: String,
    },
    categoryName: {
      type: String,
      required: true,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to the User model
    required: true,
},
    created_at: {
      type: Date,
      default: Date.now,
    },
    images: [
      {
        dataName: {
          type: String,
        },
        name: {
          type: String,
        },
        path: {
          type: String,
        },
      },
    ],
    productFile: {
      dataName: {
        type: String,
      },
      name: {
        type: String,
      },
      path: {
        type : String,
      },
    },
    status: {
      type: String,
      default: 'inactive', // Change the default status to 'inactive'
      enum: ['Active', 'inactive','softDeleted'], // You can define possible values for status
    },
  });


  productSchema.pre('save', async function (next) {
    try {
      // If product_id is not provided or is null, generate a new one
      if (!this.product_id) {
        const maxProduct = await this.constructor.findOne({}, { product_id: 1 }).sort({ product_id: -1 });
  
        // Set the product_id for the new product
        this.product_id = maxProduct && maxProduct.product_id ? maxProduct.product_id + 1 : 1;
      }
  
      next();
    } catch (error) {
      return next(error);
    }
  });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
