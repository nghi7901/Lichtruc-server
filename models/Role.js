const mongoose = require('mongoose');

const RoleSchema = mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, 
    role_name: { type: String, required: true, unique: true } 
}, { versionKey: false });

const Role = mongoose.model('Role', RoleSchema);
module.exports = Role;