const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: []
  },
  plainTextContent: {
    type: String,
    select: false
  },
  collaborationData: {
    type: Buffer,
    select: false
  },
  status: {
    type: String,
    enum: ['review', 'approved', 'archived'],
    default: 'review',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformUser',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformUser'
  },
  vectorData: {
    isIndexed: { type: Boolean, default: false },
    lastIndexedAt: { type: Date }
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
      ref: 'AgentRole',
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

topicSchema.index({ name: 'text', plainTextContent: 'text' });

const Topic = mongoose.model('Topic', topicSchema);
module.exports = Topic;