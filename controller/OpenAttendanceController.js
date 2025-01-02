require('../utils/MongooseUtil');
const OpenAttendance = require('../models/OpenAttendance');
const OnCallSchedule = require("../models/OnCallSchedule");
const RegisterSchedule = require("../models/RegisterSchedule");
const mongoose = require('mongoose');

// Trạng thái statusId:
// 1: Chưa mở
// 2: Đang mở
// 3: Đã đóng
// 4: Đã duyệt

async function createOpen(req, res) {
    const { semester, schoolYear, startDay, endDay, userId, time_In_S, time_Out_S, time_In_C, time_Out_C } = req.body;

    try {
        // Kiểm tra xem học kỳ và năm học đã tồn tại chưa
        const openExist = await OpenAttendance.findOne({
            schoolYear: schoolYear,
            semester: semester,
        });

        if (openExist) {
            return res.status(409).json({ message: 'Học kỳ và năm học đã tồn tại.' });
        }

        // Kiểm tra phạm vi ngày có trùng với các lịch trực khác không
        const overlappingSchedules = await OpenAttendance.find({
            $or: [
                {
                    startDay: { $lte: new Date(endDay) }, 
                    endDay: { $gte: new Date(startDay) }, 
                },
            ],
        });

        if (overlappingSchedules.length > 0) {
            return res.status(400).json({
                message: 'Phạm vi ngày bị trùng với lịch trực khác.',
            });
        }

        const openAttendance = new OpenAttendance({
            _id: new mongoose.Types.ObjectId(),
            schoolYear: schoolYear,
            startDay: startDay,
            endDay: endDay,
            createBy: userId,
            createWhen: new Date(),
            statusId: 1,
            semester: semester,
            time_In_S: time_In_S,
            time_Out_S: time_Out_S,
            time_In_C: time_In_C,
            time_Out_C: time_Out_C,
        });

        await openAttendance.save();
        return res.status(201).json(openAttendance);
    } catch (error) {
        console.error('Error creating open attendance:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
}


async function getData(req, res) {

    const openAttendances = await OpenAttendance.find().sort({ _id: -1 });
    const semesterSchoolYearPairs = openAttendances.map(item => ({
        _id: item._id,
        semester: item.semester,
        schoolYear: item.schoolYear,
    }));

    return res.status(200).json({
        openAttendances,
        semesterSchoolYearPairs,
    });
        
}

async function changeDataById(req, res) {
    const { id  } = req.params;
    const { statusId, startDay, endDay, time_In_S, time_Out_S, time_In_C, time_Out_C } = req.body;

    const openAttendance = await OpenAttendance.findOne({ _id: id});

        if (!openAttendance) {
            return res.status(404).json({ message: 'OpenAttendance không tồn tại' });
        }
        
        if (openAttendance.processing) {
            return res.status(409).json({ message: 'Yêu cầu đang được xử lý. Vui lòng thử lại sau.' });
        }
        
        openAttendance.processing = true;
        await openAttendance.save();

    try {
        if (statusId !== undefined) {
            openAttendance.statusId = statusId;

            // Nếu statusId là 4, thực hiện thêm các lịch trực
            if (statusId === 4) {
                const dayOfWeeks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                const scheduleList = await RegisterSchedule.find({ openId: id });

                // Tạo lịch trực
                let currentDate = new Date(openAttendance.startDay);
                const endDate = new Date(openAttendance.endDay);

                while (currentDate <= endDate) {
                    const dayOfWeek = dayOfWeeks[currentDate.getDay()];

                    const schedulesForDay = scheduleList.filter(
                        (schedule) => schedule.day === dayOfWeek
                    );

                    for (const schedule of schedulesForDay) {
                        const onCallSchedule = new OnCallSchedule({
                            day: schedule.day,
                            onCallSession: schedule.onCallSession,
                            userID: schedule.userID,
                            attendance: false,
                            openID: id,
                            date: currentDate,
                            checkinTime: null,
                            checkoutTime: null,
                        });

                        try {
                            await onCallSchedule.save();
                        } catch (error) {
                            console.error("Error saving OnCallSchedule:", error.message);
                        }
                    }

                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        }

        if (startDay !== undefined) {
            openAttendance.startDay = new Date(startDay);
        }
        if (endDay !== undefined) {
            openAttendance.endDay = new Date(endDay);
        }

        if (time_In_S !== undefined) {
            openAttendance.time_In_S = time_In_S;
        }
        if (time_Out_S !== undefined) {
            openAttendance.time_Out_S = time_Out_S;
        }
        if (time_In_C !== undefined) {
            openAttendance.time_In_C = time_In_C;
        }
        if (time_Out_C !== undefined) {
            openAttendance.time_Out_C = time_Out_C;
        }

        await openAttendance.save();

        return res.status(200).json(openAttendance);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' })
    } finally {
        openAttendance.processing = false;
        await openAttendance.save();
    }
};

async function deleteOpenAttendance(req, res) {
    const { id } = req.params;

    try {
        const openAttendance = await OpenAttendance.findOne({ _id: id, statusId: 1 });
        if (!openAttendance) {
            return res.status(404).json({ message: 'Open Attendance not found.' });
        }

        // Delete the user from the database
        await OpenAttendance.deleteOne({ _id: id });

        return res.status(200).json({ message: 'Open Attendance deleted successfully.' }); 
    } catch (error) {
        console.error('Error deleting Open Attendance:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

async function details(req, res) {
    const { id } = req.params;
    try {
        const openAttendances = await OpenAttendance.findById(id);
        return res.status(200).json({ 
            openAttendances: openAttendances 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

async function getScheduleByDate(req, res) {
    try {
      const currentDate = new Date(); 
  
      const schedule = await OpenAttendance.findOne({
        startDay: { $lte: currentDate },
        endDay: { $gte: currentDate }, 
        statusId: 4, 
      });
  
      if (!schedule) {
        return res.status(404).json({ error: "Không tìm thấy lịch trực cho ngày hiện tại." });
      }
  
      res.json({
        time_In_S: schedule.time_In_S,
        time_Out_S: schedule.time_Out_S,
        time_In_C: schedule.time_In_C,
        time_Out_C: schedule.time_Out_C
      });
    } catch (error) {
      console.error("Error fetching schedule:", error);
      res.status(500).json({ error: "Lỗi server." });
    }
  };
  
module.exports = {
    createOpen,
    getData,
    changeDataById,
    deleteOpenAttendance,
    details,
    getScheduleByDate
};
