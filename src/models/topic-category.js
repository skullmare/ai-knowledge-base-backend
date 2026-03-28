const mongoose = require('mongoose');

const topicCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
}, {
  timestamps: true
});

const TopicCategory = mongoose.model('TopicCategory', topicCategorySchema);
module.exports = TopicCategory;