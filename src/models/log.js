const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    // Название события (например: "TOPIC_CREATED", "USER_BLOCKED", "SETTINGS_UPDATED")
    action: {
        type: String,
        required: true,
        index: true
    },
    // Кто совершил действие
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlatformUser', // Ссылка на модель сотрудника
        required: true,
        index: true
    },
    // Тип сущности (например: "Topic", "AgentUser", "Role")
    entityType: {
        type: String,
        required: true,
        enum: ['Topic', 'TopicCategory', 'AgentUser', 'AgentRole', 'Role', 'PlatformUser', 'System']
    },
    // ID объекта, над которым совершили действие
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    // Детали изменений (было / стало) или просто описание
    details: {
        oldValue: { type: mongoose.Schema.Types.Mixed },
        newValue: { type: mongoose.Schema.Types.Mixed },
        message: { type: String }
    },
    // Статус операции (успех или ошибка)
    status: {
        type: String,
        enum: ['success', 'error', 'warning'],
        default: 'success'
    },
    // IP адрес или User-Agent (полезно для безопасности)
    metadata: {
        ip: String,
        userAgent: String
    }
}, {
    timestamps: true // createdAt заменяет нам поле "время совершения"
});

const Log = mongoose.model('Log', logSchema);
module.exports = Log;