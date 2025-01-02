const mongoose = require('mongoose');

const RegisterScheduleSchema = mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    day: { type: String, maxlength: 3 },                          
    onCallSession: { type: String, maxlength: 1 },              
    openId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'OpenAttendance' },                                     
    userID: { type: String, required: true, ref: 'User' },  
    lecturerName: { type: String },                           
    isLecturerRegister: { type: Boolean },                      
    registerBy: { type: String },                                     
}, { versionKey: false });

const RegisterSchedule = mongoose.model('RegisterSchedule', RegisterScheduleSchema);
module.exports = RegisterSchedule;