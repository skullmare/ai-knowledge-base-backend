const mongoose = require('mongoose');
const { ALL_PERMISSIONS } = require('../constants/permissions');

const platformRoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    permissions: {
        type: [String],
        enum: ALL_PERMISSIONS,
        validate: {
            validator: function (v) {
                return v && v.length > 0;
            },
            message: 'Список прав не может быть пустым'
        }
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    isSystem: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const PlatformRole = mongoose.model('PlatformRole', platformRoleSchema);
module.exports = PlatformRole;