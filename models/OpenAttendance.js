const mongoose = require('mongoose');

const OpenAttendanceSchema = mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    schoolYear: { type: String, required: true, maxlength: 9 }, 
    startDay: { type: Date, required: true },                 
    endDay: { type: Date, required: true },                 
    createBy: { type: String, maxlength: 128 },                
    createWhen: { type: Date },                          
    statusId: { type: Number, required: true },           
    semester: { type: String, maxlength: 1 },               
    time_In_S: { type: String, maxlength: 50 },                 
    time_Out_S: { type: String, maxlength: 50 },              
    time_In_C: { type: String, maxlength: 50 },               
    time_Out_C: { type: String, maxlength: 50 },    
    processing: { type: Boolean, default: false },             
}, { versionKey: false });

const OpenAttendance = mongoose.model('OpenAttendance', OpenAttendanceSchema);
module.exports = OpenAttendance;