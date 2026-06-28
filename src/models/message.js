const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    agentUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AgentUser',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
