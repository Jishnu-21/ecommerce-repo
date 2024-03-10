const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true,uppercase:true, required: true },
  description: {
    type: String,
    required: true,
  },
  discount: { type: Number, required: true },
  coupon_id: {
    type: Number,
    unique: true,
  },
  status: {
    type: String,
    default: 'Active', // You can set a default status if needed
    enum: ['Active', 'Inactive','softDeleted'],
  },
  minimumPrice: { // Minimum price for the coupon to be applicable
    type: Number,
    required: true,
    min: [0, 'Minimum price must be greater than or equal to 0']
  },
  expireDate:{
    type: Date,
    required: true,
  },
});


couponSchema.pre('save', async function (next) {
  if (!this.coupon_id) {
    try {
      // Find the maximum category_id in the collection
      const maxCategory = await this.constructor.findOne().sort({ coupon_id: -1 });

      // Set the category_id for the new category
      this.coupon_id = maxCategory ? maxCategory.coupon_id + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});


module.exports = mongoose.model('Coupon', couponSchema);
