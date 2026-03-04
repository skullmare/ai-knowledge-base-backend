const mongoose = require('mongoose');
const { ALL_PERMISSIONS } = require('../constants/permissions');

const roleSchema = new mongoose.Schema({
    // Название: "Администратор", "Оператор"
    label: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Название на английском: "Admin", "Manager"
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Массив ключей из конфига
    permissions: [{
        type: String,
        enum: ALL_PERMISSIONS
    }],

    // Описание, чтобы админ понимал, зачем эта роль нужна
    description: {
        type: String,
        trim: true
    },

    // Защита: системные роли нельзя удалять через API
    isSystem: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Перед модулем экспорта
roleSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // 1. Защита системных ролей
    if (this.isSystem) {
      const error = new Error(`Роль "${this.label}" является системной и не может быть удалена.`);
      error.status = 403;
      return next(error);
    }

    // 2. Проверка использования сотрудниками
    const PlatformUser = mongoose.model('PlatformUser'); // Предположим, модель называется так
    
    // Проверяем, есть ли хоть один сотрудник с этой ролью (поле role в модели пользователя)
    const count = await PlatformUser.countDocuments({ role: this._id });

    if (count > 0) {
      const error = new Error(
        `Нельзя удалить роль "${this.label}", так как она назначена сотрудникам (${count} шт.). Сначала измените роли пользователей.`
      );
      error.status = 400;
      return next(error);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;