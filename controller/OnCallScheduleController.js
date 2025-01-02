require('../utils/MongooseUtil');
const OnCallSchedule = require('../models/OnCallSchedule');
const OpenAttendance = require('../models/OpenAttendance');
const RequestSchedule = require('../models/RequestSchedule');
const User = require('../models/User');
const Role = require('../models/Role');

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function getDataByUserId(req, res) {
  try {
    const userId = req.query.userId;
    const schoolYear = req.query.schoolYear;
    const semester = req.query.semester;

    const attendance = await OpenAttendance.findOne({ statusId: 4, schoolYear, semester });
    if (!attendance) return res.json([]);

    const weeks = [];
    let current = new Date(attendance.startDay);
    const end = new Date(attendance.endDay);

    while (current.getDay() !== 1) {
      current.setDate(current.getDate() - 1);
    }

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekStart.getDate() + 5);

      const onCallSchedules = await OnCallSchedule.find({
        date: { $gte: weekStart, $lte: weekEnd },
        openID: attendance._id,
        userID: userId,
      }).lean();

      for (const schedule of onCallSchedules) {
        if (schedule.requestSchedule) {
          const request = await RequestSchedule.findById(schedule.requestId).lean();
          if (request) {
            schedule.requestId = request._id;
            schedule.requestStatus = request.statusId;
          }
        }
      }

      weeks.push({
        time_In_S: attendance.time_In_S,
        time_Out_S: attendance.time_Out_S,
        time_In_C: attendance.time_In_C,
        time_Out_C: attendance.time_Out_C,
        startDate: weekStart,
        endDate: weekEnd > end ? end : weekEnd,
        display: `Từ ngày ${weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} đến ngày ${weekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
        schedules: onCallSchedules,
      });

      current.setDate(current.getDate() + 7);
    }

    res.status(200).json(weeks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy dữ liệu." });
  }
}

async function getData(req, res) {
  try {
    const { schoolYear, semester } = req.query;

    const attendance = await OpenAttendance.findOne({ statusId: 4, schoolYear, semester });
    if (!attendance) {
      return res.status(200).json([]);
    }

    const weeks = [];
    let current = new Date(attendance.startDay);
    const end = new Date(attendance.endDay);

    while (current.getDay() !== 1) {
      current.setDate(current.getDate() - 1);
    }

    while (current <= end) {
      const weekStart = new Date(current);

      const weekEnd = new Date(current);
      weekEnd.setDate(weekStart.getDate() + 5);

      const onCallSchedules = await OnCallSchedule.find({
        date: { $gte: weekStart, $lte: weekEnd },
        openID: attendance._id,
      });

      const userIDs = [...new Set(onCallSchedules.map(s => s.userID))];
      const users = await User.find({ _id: { $in: userIDs } }).lean();
      const userMap = users.reduce((acc, user) => {
        acc[user._id.toString()] = user.fullName;
        return acc;
      }, {});

      const requestIds = onCallSchedules
        .filter(s => s.requestSchedule && s.requestId?._id)
        .map(s => s.requestId._id);

      // Lấy thông tin từ RequestSchedule tương ứng
      const requestSchedules = await RequestSchedule.find({ _id: { $in: requestIds } }).lean();
      const requestMap = requestSchedules.reduce((acc, request) => {
        acc[request._id.toString()] = request.statusId;
        return acc;
      }, {});
      const schedules = onCallSchedules.map(schedule => {
        const scheduleObj = schedule.toObject();
        return {
          ...scheduleObj,
          fullName: userMap[schedule.userID],
          ...(schedule.requestId
            ? { reqStatusId: requestMap[schedule.requestId._id?.toString()] }
            : {}),
        };
      });


      weeks.push({
        time_In_S: attendance.time_In_S,
        time_Out_S: attendance.time_Out_S,
        time_In_C: attendance.time_In_C,
        time_Out_C: attendance.time_Out_C,
        startDate: weekStart,
        endDate: weekEnd > end ? end : weekEnd,
        display: `Từ ngày ${weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} đến ngày ${weekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
        schedules: schedules,
      });

      current.setDate(current.getDate() + 7);
    }

    res.status(200).json(weeks);

  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Internal server error' });
  }
}

async function exportAttendanceHistory(req, res) {
  try {
    const { schoolYear, semester } = req.body;

    if (!schoolYear || !semester) {
      return res.status(400).json({ error: "Thiếu thông tin năm học hoặc học kỳ" });
    }

    // Tìm đợt trực mở tương ứng
    const openAttendance = await OpenAttendance.findOne({ statusId: 4, schoolYear, semester });
    if (!openAttendance) return res.json([]);

    // Lấy danh sách userID của các giảng viên có lịch trực
    const lecturersWithSchedule = await OnCallSchedule.distinct('userID', {
      openID: openAttendance._id
    });

    // Lấy thông tin chi tiết của các giảng viên có lịch trực
    const lecturers = await User.find({
      "_id": { $in: lecturersWithSchedule },
      "role": await Role.findOne({ role_name: "Giảng viên" })
    }).select("_id fullName codeProfessional email");

    // Lấy lịch trực của giảng viên
    const schedules = await OnCallSchedule.aggregate([
      {
        $match: {
          openID: new mongoose.Types.ObjectId(openAttendance._id),
          userID: { $in: lecturersWithSchedule }
        }
      },
      {
        $group: {
          _id: "$userID",
          attendance: {
            $push: {
              day: "$day",
              session: "$onCallSession",
              attendance: "$attendance",
              checkinTime: "$checkinTime",
              checkoutTime: "$checkoutTime"
            }
          }
        }
      }
    ]);
    // Tạo workbook mới
    const workbook = XLSX.utils.book_new();

    // Tạo header cho worksheet
    const headerRows = [
      ["Lịch sử trực Học kỳ " + semester + " Năm học " + schoolYear],
      [`Từ ngày ${formatDate(openAttendance.startDay)} đến ngày ${formatDate(openAttendance.endDay)}`],
      []
    ];

    // Tạo mảng chứa tất cả các ngày từ startDay đến endDay (trừ Chủ nhật)
    const dates = [];
    let currentDate = new Date(openAttendance.startDay);
    const endDate = new Date(openAttendance.endDay);

    while (currentDate <= endDate) {
      if (currentDate.getDay() !== 0) { // Bỏ qua Chủ nhật
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Tạo header cho các cột ngày
    const dateHeaders = ["Họ và tên giảng viên", "Email", "Mã giảng viên"];
    dates.forEach(date => {
      dateHeaders.push(formatDate(date));
      dateHeaders.push(""); // Cột cho buổi chiều
    });

    // Tạo header phân biệt sáng chiều
    const sessionHeaders = ["", "", ""];
    dates.forEach(() => {
      sessionHeaders.push("Sáng", "Chiều");
    });

    // Thêm headers vào worksheet
    const worksheetData = [...headerRows, dateHeaders, sessionHeaders];

    // Lấy dữ liệu điểm danh cho mỗi giảng viên
    for (const lecturer of lecturers) {
      const row = [lecturer.fullName, lecturer.email, lecturer.codeProfessional];

      // Lấy lịch trực của giảng viên
      const schedules = await OnCallSchedule.find({
        userID: lecturer._id,
        openID: openAttendance._id,
        date: { $gte: openAttendance.startDay, $lte: openAttendance.endDay }
      });

      // Điền dữ liệu cho từng ngày
      dates.forEach(date => {
        // Tìm lịch trực buổi sáng
        const morningSchedule = schedules.find(s =>
          isSameDay(new Date(s.date), date) && s.onCallSession === 'S'
        );

        // Tìm lịch trực buổi chiều
        const afternoonSchedule = schedules.find(s =>
          isSameDay(new Date(s.date), date) && s.onCallSession === 'C'
        );

        // Điền thông tin buổi sáng
        row.push(formatScheduleCell(morningSchedule));

        // Điền thông tin buổi chiều
        row.push(formatScheduleCell(afternoonSchedule));
      });

      worksheetData.push(row);
    }

    // Tạo worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Căn chỉnh độ rộng cột
    const columnWidths = calculateColumnWidths(worksheetData);
    worksheet['!cols'] = columnWidths;

    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch sử trực");

    // Tạo file
    const filePath = path.join(__dirname, `Lichsutruc_Hocky${semester}_${schoolYear}.xlsx`);
    XLSX.writeFile(workbook, filePath);

    res.download(filePath, `Lichsutruc_Hocky${semester}_${schoolYear}.xlsx`, err => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).send("Error sending file.");
      }
      fs.unlinkSync(filePath);
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi xuất Excel" });
  }
}

function formatScheduleCell(schedule) {
  if (!schedule) return "";

  if (schedule.attendance) {
    const formatTime = (date) => {
      if (!date) return "N/A";
      const d = new Date(date);
      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const checkin = formatTime(schedule.checkinTime);
    const checkout = formatTime(schedule.checkoutTime);
    return `${checkin}-${checkout}`;
  }

  return "Vắng";
}

// Hàm kiểm tra cùng ngày
function isSameDay(date1, date2) {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
}

// Hàm tính toán độ rộng cột
function calculateColumnWidths(data) {
  const maxLengths = {};

  data.forEach(row => {
    row.forEach((cell, i) => {
      const cellLength = cell ? cell.toString().length : 0;
      maxLengths[i] = Math.max(maxLengths[i] || 0, cellLength);
    });
  });

  return Object.values(maxLengths).map(length => ({
    wch: length + 2 // Thêm padding
  }));
}

// Hàm format ngày
function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}


module.exports = {
  getDataByUserId,
  getData,
  exportAttendanceHistory
};
