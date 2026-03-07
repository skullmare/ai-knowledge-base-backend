const mongoose = require('mongoose');
// Импортируем подготовленные данные из твоего конфига
const { ALL_ACTIONS, ACTIONS_CONFIG } = require('../constants/actions');

// Динамически получаем список всех возможных сущностей (Entity) из конфига
const ALL_ENTITIES = [...new Set(Object.values(ACTIONS_CONFIG).map(group => group.entity))];

const logSchema = new mongoose.Schema({
    // Название события (теперь строго валидируется через enum)
    action: {
        type: String,
        required: true,
        enum: ALL_ACTIONS, // Используем плоский массив ключей
        index: true
    },
    // Краткое описание или системное сообщение
    message: {
        type: String,
        required: true 
    },
    // Кто совершил действие
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlatformUser',
        required: false, // Изменил на false, так как LOGIN_FAILED может быть без юзера
        index: true
    },
    // Тип сущности
    entityType: {
        type: String,
        required: true,
        enum: ALL_ENTITIES, // Подтягивается автоматически из ACTIONS_CONFIG
        index: true
    },
    // ID объекта (к которому относится лог)
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    // Статус операции
    status: {
        type: String,
        enum: ['success', 'error'],
        default: 'success'
    }
}, {
    timestamps: true 
});

// Добавляем индекс для быстрого поиска логов по конкретному объекту и его типу
logSchema.index({ entityType: 1, entityId: 1 });

const Log = mongoose.model('Log', logSchema);
module.exports = Log;