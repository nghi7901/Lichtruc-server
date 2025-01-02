const mongoose = require('mongoose');

const OnCallScheduleSchema = mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    day: { type: String, maxlength: 3 },                          
    onCallSession: { type: String, maxlength: 1 },                
    attendance: { type: Boolean },                                 
    openID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'OpenAttendance' },      
    userID: { type: String, required: true, ref: 'User' },                
    checkinTime: { type: Date },                                     
    checkoutTime: { type: Date },                                 
    date: { type: Date },                                            
    overTime: { type: Number },                                   
    note: { type: String },      
    requestSchedule: { type: Boolean, default: false },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestSchedule'}                                     
}, { versionKey: false });

const OnCallSchedule = mongoose.model('OnCallSchedule', OnCallScheduleSchema);
module.exports = OnCallSchedule;