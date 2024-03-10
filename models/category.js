const mongoose = require('mongoose');


const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    unique: true, collation: { locale: 'en', strength: 2 },
  },
  description: {
    type: String,
    required: true,
  },
  category_id: {
    type: Number,
    unique: true,
  },
  status: {
    type: String,
    default: 'Active', // You can set a default status if needed
    enum: ['Active', 'Inactive','softDeleted'],
  },
});


categorySchema.pre('save', async function (next) {
    if (!this.category_id) {
      try {
        // Find the maximum category_id in the collection
        const maxCategory = await this.constructor.findOne().sort({ category_id: -1 });
  
        // Set the category_id for the new category
        this.category_id = maxCategory ? maxCategory.category_id + 1 : 1;
      } catch (error) {
        return next(error);
      }
    }
    next();
  });
  
const Category = mongoose.model('Category', categorySchema);

module.exports = Category