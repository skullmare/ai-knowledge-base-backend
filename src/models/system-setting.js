const mongoose = require('mongoose');
const { SETTINGS_GROUPS } = require('../constants/settings');

const systemSettingSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    key: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    value: { 
        type: mongoose.Schema.Types.Mixed, 
        default: '' 
    },
    group: {
        type: String,
        enum: Object.values(SETTINGS_GROUPS),
        default: SETTINGS_GROUPS.GENERAL
    },
    isSecret: {
        type: Boolean,
        default: false
    },
    description: { 
        type: String, 
        trim: true 
    }
}, { 
    timestamps: true 
});

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
module.exports = SystemSetting;
