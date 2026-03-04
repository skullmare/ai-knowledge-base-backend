const mongoose = require('mongoose');

const agentUserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        unique: true, // Чтобы не было дублей по номеру
        sparse: true  // Разрешает null, но если есть значение — оно должно быть уникальным
    },
    chatId: {
        type: String, // В Telegram это число, но лучше хранить строкой для универсальности
        required: true,
        unique: true,
        index: true
    },
    requestsCount: {
        type: Number,
        default: 0
    },
    // Связь с моделью AgentRole
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AgentRole',
        default: null // Пока роль не назначена, общение закрыто
    },
    status: {
        type: String,
        enum: ['active', 'blocked', 'pending'],
        default: 'pending'
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Виртуальное поле для полного имени (удобно для админки)
agentUserSchema.virtual('fullName').get(function() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

const AgentUser = mongoose.model('AgentUser', agentUserSchema);
module.exports = AgentUser;