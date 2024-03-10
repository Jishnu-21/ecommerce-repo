const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  buyer: { type: String, required: true },
  address:{type:String, trim: true},
  items: [{
    image: {type: String},
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    product_name:{type:String},
    seller: {type: String},
    quantity: { type: Number, required: true },
    product_status:{ type: String, enum: ['Refunded','Refund','Pending','Delivered','Refund Denied'], default: 'Pending' },
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['Pending', ,'Refunded','Processing', 'Shipped','Refund', 'Delivered','Cancelled','Failed'], default: 'Pending' },
  paymentMethod:{type:String, required: true}, 
  
  message:{type:String},

  couponApplied: { type: Boolean, default: false } 

}, {
  timestamps: true
});

orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }
  
  if (this.paymentMethod === 'cashOnDelivery') {
    this.status = 'Delivered';
  }

  next();
});
// Function to generate orderNumber (customize this based on your requirements)
function generateOrderNumber() {
  return Date.now().toString() + Math.floor(Math.random() * 10000);
}
const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
