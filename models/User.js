const mongoose = require('mongoose');
const Role = require('./Role');

const UserSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        maxlength: 256
    },
    userName: {
        type: String,
        // unique: true,
        maxlength: 256
    },
    phoneNumber: {
        type: String,
        required: false,
        maxlength: 30,
        default: ""
    },
    fullName: {
        type: String,
        required: false,
        maxlength: 100
    },
    codeProfessional: {
        type: String,
        required: false,
        maxlength: 30,
        default: ""
    },
    position: {
        type: String,
        required: false,
        maxlength: 50,
        default: ""
    },
    isActive: {
        type: Boolean,
        required: false,
        default: true,
    },
    lastAccessed: {
        type: String,
        default: "N/A"
    },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    images: [
        {
            data: { type: Buffer },
            timestamp: { type: Date, default: Date.now }
        }
    ],
}, { versionKey: false });

UserSchema.statics.findOrCreate = async function(condition) {
    const user = await this.findOne({_id: condition._id});
    if (user) {
        user.lastAccessed = new Date().toISOString(); 
        await user.save();
        return formatUser(user);
    }

    const role_user = await Role.findOne({ role_name: 'Người dùng' });
    
    const newUser = new this({
        ...condition,
        fullName: (condition.userName.split(' - '))[1] == '' ? condition.userName : condition.userName.split(' - ')[1],
        lastAccessed: new Date().toISOString(),
        role: role_user ? role_user._id : null,
        isActive: condition.isActive ?? true,
    });

    await newUser.save();
    return formatUser(newUser);
};

async function formatUser(user) {
    const existingRole = await Role.findOne({ _id: user.role });
    return {
        _id: user._id,
        fullName: (user.fullName),
        email: user.email,
        lastAccessed: user.lastAccessed,
        role: {
            _id: existingRole._id,
            role_name: existingRole.role_name 
        },
        isActive: user.isActive,
        codeProfessional: user.codeProfessional,
        phoneNumber:  user.phoneNumber,
        position:  user.position,
    };
}

const User = mongoose.model('User', UserSchema);
module.exports = User;