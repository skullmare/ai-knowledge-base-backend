const mongoose = require('mongoose');

const agentRoleSchema = new mongoose.Schema({
  // Название на русском
  label: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  // Название на английском
  key: {
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  // Описание, чтобы админ понимал, зачем эта роль нужна
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true 
});

agentRoleSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const Topic = mongoose.model('Topic');
    
    // Ищем топики, где ID этой роли есть в массиве accessibleByRoles
    const count = await Topic.countDocuments({ accessibleByRoles: this._id });

    if (count > 0) {
      const error = new Error(
        `Нельзя удалить роль "${this.label}", так как она назначена топикам (${count} шт.). Сначала уберите её из топиков.`
      );
      error.status = 400;
      return next(error);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const AgentRole = mongoose.model('AgentRole', agentRoleSchema);
module.exports = AgentRole;