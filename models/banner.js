const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: String,
  imageUrl: String,
  link: String,
  isActive: Boolean,
  banner_id:Number,
});


bannerSchema.pre('save', async function (next) {
    if (!this.banner_id) {
      try {
        // Find the maximum category_id in the collection
        const maxCategory = await this.constructor.findOne().sort({ banner_id: -1 });
  
        // Set the category_id for the new category
        this.banner_id = maxCategory ? maxCategory.banner_id + 1 : 1;
      } catch (error) {
        return next(error);
      }
    }
    next();
  });

module.exports = mongoose.model('Banner', bannerSchema);
