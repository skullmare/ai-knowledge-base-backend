const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['review', 'approved', 'archived'],
    default: 'review',
    index: true
  },
  files: [{
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, required: true },
    url: { type: String, required: true },
    fileType: { type: String }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  vectorData: {
    isIndexed: { type: Boolean, default: false },
    lastIndexedAt: { type: Date }
    // chunkIds не храним, чистим в Qdrant по metadata.topicId
  },
  metadata: {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TopicCategory',
      required: true,
      index: true,
      validate: {
        validator: async function (v) {
          const topicCategory = await mongoose.model('TopicCategory').findById(v);
          return !!topicCategory;
        },
        message: 'Указанная категория TopicCategory не существует.'
      }
    },
    accessibleByRoles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentRole', // Исправлено на AgentRole
      required: true,
      validate: {
        validator: async function (v) {
          const agentRole = await mongoose.model('AgentRole').findById(v);
          return !!agentRole;
        },
        message: 'Указанная роль AgentRole не существует.'
      }
    }]
  }
}, {
  timestamps: true
});

// Индекс для поиска в админке
topicSchema.index({ name: 'text', content: 'text' });

const Topic = mongoose.model('Topic', topicSchema);
module.exports = Topic;