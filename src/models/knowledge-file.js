const mongoose = require('mongoose');

const knowledgeFileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    originalName: {
        type: String,
        trim: true
    },
    source: {
        type: String,
        enum: ['storage', 'google_drive'],
        default: 'storage',
        index: true
    },
    // Файл, загруженный в объектное хранилище
    storage: {
        key: { type: String, trim: true },
        url: { type: String, trim: true },
        size: { type: Number },
        mimeType: { type: String, trim: true }
    },
    // Файл, подключённый из Google Drive
    google: {
        fileId: { type: String, trim: true, index: true },
        mimeType: { type: String, trim: true },
        webViewLink: { type: String, trim: true },
        iconLink: { type: String, trim: true },
        size: { type: Number },
        modifiedTime: { type: Date }
    },
    accessibleByRoles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AgentRole',
        validate: {
            validator: async function (v) {
                const agentRole = await mongoose.model('AgentRole').findById(v);
                return !!agentRole;
            },
            message: 'Указанная роль AgentRole не существует.'
        }
    }],
    status: {
        type: String,
        enum: ['uploaded', 'indexing', 'indexed', 'error'],
        default: 'uploaded',
        index: true
    },
    vectorData: {
        isIndexed: { type: Boolean, default: false },
        lastIndexedAt: { type: Date },
        chunksCount: { type: Number, default: 0 },
        error: { type: String }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlatformUser',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlatformUser'
    }
}, {
    timestamps: true
});

knowledgeFileSchema.index({ name: 'text', originalName: 'text' });

const KnowledgeFile = mongoose.model('KnowledgeFile', knowledgeFileSchema);
module.exports = KnowledgeFile;
