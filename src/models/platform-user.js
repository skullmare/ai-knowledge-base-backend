const mongoose = require('mongoose');

const platformUserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    login: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Пожалуйста, введите корректный email']
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    photoUrl: {
        type: String,
        default: ''
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlatformRole'
    },
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active'
    },
    isSystem: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpires: {
        type: Date,
        select: false
    },
    twoFactorCode: {
        type: String,
        select: false
    },
    twoFactorCodeSentAt: {
        type: Date,
        select: false
    },
    twoFactorAttempts: {
        type: Number,
        default: 0,
        select: false
    }
}, {
    timestamps: true 
});

const PlatformUser = mongoose.model('PlatformUser', platformUserSchema);
module.exports = PlatformUser;