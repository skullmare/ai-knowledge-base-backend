const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    // Уникальный ключ настройки (например: "ai_model_name", "logs_ttl_days")
    key: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    // Значение может быть строкой, числом или объектом
    value: { 
        type: mongoose.Schema.Types.Mixed, 
        required: true 
    },
    // Группировка для удобства UI
    group: {
        type: String,
        enum: ['ai', 'logs', 'general', 'security'],
        default: 'general'
    },
    // Понятное описание для контент-менеджера
    description: { 
        type: String, 
        trim: true 
    }
}, { 
    timestamps: true 
});

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
module.exports = SystemSetting;