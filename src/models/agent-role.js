const mongoose = require('mongoose');

const agentRoleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true 
});

const AgentRole = mongoose.model('AgentRole', agentRoleSchema);
module.exports = AgentRole;