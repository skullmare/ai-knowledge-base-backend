const mongoose = require('mongoose');

const topicCategorySchema = new mongoose.Schema({
  // Название (например: "Техническая поддержка", "HR", "Продажи")
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Краткое описание, чтобы контент-менеджер не путался
  description: {
    type: String,
    trim: true
  },
}, {
  timestamps: true // Оставляем, чтобы знать, когда категория создана
});

// Добавляем проверку перед удалением
topicCategorySchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // Импортируем модель топиков внутри хука, чтобы избежать циклической зависимости
    const Topic = mongoose.model('Topic');
    
    // Ищем хотя бы один топик с этой категорией
    const count = await Topic.countDocuments({ 'metadata.category': this._id });

    if (count > 0) {
      const error = new Error(`Нельзя удалить категорию "${this.name}", так как она используется в топиках (${count} шт.).`);
      error.status = 400; // Полезно для обработки в контроллере
      return next(error);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const TopicCategory = mongoose.model('TopicCategory', topicCategorySchema);
module.exports = TopicCategory;