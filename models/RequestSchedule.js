const mongoose = require('mongoose');

const RequestScheduleSchema = mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  day: { type: String, maxlength: 3 },                          
  onCallSession: { type: String, maxlength: 1 }, 
  dayChange: { type: String },
  openId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'OpenAttendance' },                                     
  userID: { type: String, required: true, ref: 'User' }, 
  onCallScheduleId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'OnCallSchedule' },   
  dateFrom: { type: Date },
  dateTo: { type: Date },
  typeRequest: { type: Number },
  reason: { type: String },
  statusId: { type: Number },
  onCallSessionChange: { type: String },
  note: { type: String },
}, { versionKey: false, timestamps: true  });

module.exports = mongoose.model('RequestSchedule', RequestScheduleSchema);