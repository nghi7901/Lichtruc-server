require('../utils/MongooseUtil');
const User = require('../models/User');
const RegisterSchedule = require('../models/RegisterSchedule');
const OpenAttendance = require('../models/OpenAttendance');
const OnCallSchedule = require('../models/OnCallSchedule');
const Role = require('../models/Role');

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { createHeaderStyle, createCellStyle } = require('../utils/excelStyles');

async function createData(req, res) {
    const { listData, openId, userId, userTK, isLecturerRegister } = req.body;

    if (!listData || !Array.isArray(listData)) {
        return res.status(400).json({ message: 'Invalid listData' });
    }

    let rowsAffected = 0;

    try {
        const openAttendance = await OpenAttendance.findById(openId);
        await RegisterSchedule.deleteMany({ userID: userId, openId: openId });

        for (const key of listData) {
            const registerSchedule = new RegisterSchedule({
                openId: openId,
                userID: userId,
                day: key.substring(0, 3),
                onCallSession: key.substring(3, 4),
                lecturerName: (await User.findById(userId)).fullName,
                isLecturerRegister: isLecturerRegister,
                registerBy: isLecturerRegister
                    ? (await User.findById(userId)).fullName
                    : (await User.findById(userTK)).fullName
            });

            await registerSchedule.save();
            rowsAffected++;
        }

        if (openAttendance.statusId === 4) {
            const dayOfWeeks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const scheduleList = await RegisterSchedule.find({ openId: openId, userID: userId });

            let currentDate = new Date();
            const startDay = new Date(openAttendance.startDay);
            if (currentDate < startDay) {
                currentDate = startDay;
            }

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
                        openID: openId,
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

        return res.status(201).json({ message: 'Data created successfully', rowsAffected });
    } catch (error) {
        console.error('Error creating register schedules:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

async function getDataByOpenId(req, res) {
    try {
        const openId = req.query.openId;
        const userId = req.query.userId;

        const registerSchedules = await RegisterSchedule.find({ openId })

        const openAttendance = await OpenAttendance.findById(openId);

        if (!openAttendance) {
            return res.status(404).json({ message: "Open attendance not found." });
        }

        const lecturers = await User.find({ "role": await Role.findOne({ role_name: "Giảng viên" }) });

        const lecturersWithAttendance = lecturers.map(lecturer => {
            const registeredSessions = registerSchedules.filter(rs =>
                rs.userID.toString() === lecturer._id.toString()
            );
            const names = lecturer.fullName.split(" ");
            const shortName = names.slice(0, -1).map(name => name[0] + ".").join("") + names[names.length - 1];

            return {
                _id: lecturer._id,
                codeProfessional: lecturer.codeProfessional,
                fullName: lecturer.fullName,
                registeredSessionsCount: registeredSessions.length,
                shortName: shortName,
            };
        });

        // Chuyển đổi tên thành dạng viết tắt
        const formattedSchedules = registerSchedules.map(schedule => {
            const names = schedule.lecturerName.split(" ");
            const shortName = names.slice(0, -1).map(name => name[0] + ".").join("") + names[names.length - 1];
            return {
                ...schedule._doc,
                lecturerShortName: shortName,
            };
        });

        // Phân loại lịch trình theo ngày và buổi
        const categorizedSchedules = {
            MonS: formattedSchedules.filter(s => s.day === "Mon" && s.onCallSession === "S"),
            MonC: formattedSchedules.filter(s => s.day === "Mon" && s.onCallSession === "C"),
            TueS: formattedSchedules.filter(s => s.day === "Tue" && s.onCallSession === "S"),
            TueC: formattedSchedules.filter(s => s.day === "Tue" && s.onCallSession === "C"),
            WedS: formattedSchedules.filter(s => s.day === "Wed" && s.onCallSession === "S"),
            WedC: formattedSchedules.filter(s => s.day === "Wed" && s.onCallSession === "C"),
            ThuS: formattedSchedules.filter(s => s.day === "Thu" && s.onCallSession === "S"),
            ThuC: formattedSchedules.filter(s => s.day === "Thu" && s.onCallSession === "C"),
            FriS: formattedSchedules.filter(s => s.day === "Fri" && s.onCallSession === "S"),
            FriC: formattedSchedules.filter(s => s.day === "Fri" && s.onCallSession === "C"),
            SatS: formattedSchedules.filter(s => s.day === "Sat" && s.onCallSession === "S"),
            SatC: formattedSchedules.filter(s => s.day === "Sat" && s.onCallSession === "C"),
        };

        // Tính toán số tuần và ngày bắt đầu
        const startDay = new Date(openAttendance.startDay);
        const endDay = new Date(openAttendance.endDay);
        const totalDays = (endDay - startDay) / (1000 * 60 * 60 * 24);
        const totalWeeks = Math.ceil(totalDays / 7);

        const registeredLecturersSet = new Set();
        Object.values(categorizedSchedules).forEach(scheduleList => {
            scheduleList.forEach(schedule => {
                registeredLecturersSet.add(schedule.userID.toString());
            });
        });
        const registeredLecturers = registeredLecturersSet.size;

        const registeredSessions = await RegisterSchedule.find({ openId, userID: userId });
        const transformedRegisteredSessions = registeredSessions.map(session => `${session.day}${session.onCallSession}`);

        return res.status(200).json({
            schoolYear: openAttendance.schoolYear,
            semester: openAttendance.semester,
            startDay,
            endDay,
            statusId: openAttendance.statusId,
            totalWeeks,
            schedules: categorizedSchedules,
            registeredLecturers,
            totalLecturers: lecturers.length,
            lecturers: lecturersWithAttendance,
            registeredSessions: transformedRegisteredSessions,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error." });
    }
};

async function deleteSchedule(req, res) {
    const { id } = req.params;

    try {
        const schedule = await RegisterSchedule.findById(id);
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found.' });
        }

        await RegisterSchedule.deleteOne({ _id: id });

        return res.status(200).json({ message: 'Schedule deleted successfully.' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

const registerSchedule = async (req, res) => {
    try {
        const { userId, schoolYear, startDay, endDay, semester, dayOfWeek } = req.body;

        // Validate dữ liệu đầu vào
        if (!userId || !schoolYear || !startDay || !endDay || !semester || !dayOfWeek) {
            return res.status(400).json({ message: 'Missing required fields!' });
        }

        const startDate = new Date(startDay);
        const endDate = new Date(endDay);
        if (startDate > endDate) {
            return res.status(400).json({ message: 'Start day cannot be after end day!' });
        }

        // Tạo bản ghi RegisterSchedule
        const registerSchedule = new RegisterSchedule({
            userID: userId,
            scheduleDetails: JSON.stringify(dayOfWeek)
        });
        const savedRegisterSchedule = await registerSchedule.save();

        // Tạo bản ghi OpenAttendance
        const openAttendance = new OpenAttendance({
            schoolYear,
            startDay: startDate,
            endDay: endDate,
            createBy: userId,
            createWhen: new Date(),
            statusId: 1 // Trạng thái mặc định
        });
        const savedAttendance = await openAttendance.save();

        // Tạo các bản ghi OnCallSchedule
        const dayMappings = { mon: 1, tues: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
        const schedules = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            for (const day of dayOfWeek) {
                const { day: weekDay, ca } = day;
                if (d.getDay() === dayMappings[weekDay.toLowerCase()]) {
                    schedules.push({
                        day: weekDay,
                        onCallSession: ca,
                        attendance: false,
                        openID: savedAttendance._id,
                        userID: userId
                    });
                }
            }
        }

        await OnCallSchedule.insertMany(schedules);

        res.status(201).json({
            message: 'Schedule registered successfully!',
            registerSchedule: savedRegisterSchedule,
            openAttendance: savedAttendance,
            schedules
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

async function exportToExcel(req, res) {
    try {
        const { openId } = req.body;
        const openAttendance = await OpenAttendance.findById(openId)

        const role = await Role.findOne({ role_name: "Giảng viên" });

        const lecturers = await User.aggregate([
            {
                $match: {
                    role: role._id,
                    isActive: true
                }
            },
            {
                $lookup: {
                    from: 'registerschedules',
                    localField: '_id',
                    foreignField: 'userID',
                    as: 'schedules'
                }
            },
            {
                $addFields: {
                    schedules: {
                        $filter: {
                            input: '$schedules',
                            as: 'schedule',
                            cond: { $eq: ['$$schedule.openId', new mongoose.Types.ObjectId(openId)] }
                        }
                    }
                }
            },
            {
                $project: {
                    id: '$_id',
                    fullName: 1,
                    codeProfessional: 1,
                    position: 1,
                    schedules: {
                        $map: {
                            input: '$schedules',
                            as: 'schedule',
                            in: { day: '$$schedule.day', session: '$$schedule.onCallSession' }
                        }
                    }
                }
            }
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([]);
        
        // Thêm và style các header
        const headerStyle = createHeaderStyle();
        
        // Header 1
        XLSX.utils.sheet_add_aoa(worksheet, [[{ 
            v: 'DANH SÁCH ĐĂNG KÝ LỊCH TRỰC CỦA GIẢNG VIÊN',
            t: 's',
            s: headerStyle
        }]], { origin: 'A1' });

        // Header 2
        XLSX.utils.sheet_add_aoa(worksheet, [[{
            v: `Năm học: ${openAttendance.schoolYear} Học kỳ: ${openAttendance.semester}`,
            t: 's',
            s: headerStyle
        }]], { origin: 'A2' });

        // Header 3
        XLSX.utils.sheet_add_aoa(worksheet, [[{
            v: `Ngày bắt đầu lịch trực: ${formatDate(openAttendance.startDay)} - Ngày kết thúc lịch trực: ${formatDate(openAttendance.endDay)}`,
            t: 's',
            s: headerStyle
        }]], { origin: 'A3' });

        // Thêm tiêu đề cột với style
        const columnHeaders = ['STT', 'Mã số', 'Họ và tên', 'Chức vụ', 
            'Sáng thứ 2', 'Chiều thứ 2',
            'Sáng thứ 3', 'Chiều thứ 3',
            'Sáng thứ 4', 'Chiều thứ 4',
            'Sáng thứ 5', 'Chiều thứ 5',
            'Sáng thứ 6', 'Chiều thứ 6',
            'Sáng thứ 7', 'Chiều thứ 7',
            'Tổng số buổi'
        ].map(header => ({ v: header, t: 's', s: createCellStyle() }));

        XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], { origin: 'A4' });

        // Merge cells cho headers
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 16 } }
        ];

        // Thêm dữ liệu giảng viên với style
        const cellStyle = createCellStyle();
        lecturers.forEach((lecturer, index) => {
            const sessions = {
                MonS: '', MonC: '', TueS: '', TueC: '',
                WedS: '', WedC: '', ThuS: '', ThuC: '',
                FriS: '', FriC: '', SatS: '', SatC: '',
            };

            lecturer.schedules.forEach(schedule => {
                if (schedule.day === 'Mon' && schedule.session === 'S') sessions.MonS = 'x';
                if (schedule.day === 'Mon' && schedule.session === 'C') sessions.MonC = 'x';
                if (schedule.day === 'Tue' && schedule.session === 'S') sessions.TueS = 'x';
                if (schedule.day === 'Tue' && schedule.session === 'C') sessions.TueC = 'x';
                if (schedule.day === 'Wed' && schedule.session === 'S') sessions.WedS = 'x';
                if (schedule.day === 'Wed' && schedule.session === 'C') sessions.WedC = 'x';
                if (schedule.day === 'Thu' && schedule.session === 'S') sessions.ThuS = 'x';
                if (schedule.day === 'Thu' && schedule.session === 'C') sessions.ThuC = 'x';
                if (schedule.day === 'Fri' && schedule.session === 'S') sessions.FriS = 'x';
                if (schedule.day === 'Fri' && schedule.session === 'C') sessions.FriC = 'x';
                if (schedule.day === 'Sat' && schedule.session === 'S') sessions.SatS = 'x';
                if (schedule.day === 'Sat' && schedule.session === 'C') sessions.SatC = 'x';
            });

            const rowData = [
                index + 1,
                lecturer.codeProfessional,
                lecturer.fullName,
                lecturer.position,
                sessions.MonS, sessions.MonC,
                sessions.TueS, sessions.TueC,
                sessions.WedS, sessions.WedC,
                sessions.ThuS, sessions.ThuC,
                sessions.FriS, sessions.FriC,
                sessions.SatS, sessions.SatC,
                lecturer.schedules.length,
            ].map(value => ({ v: value, t: 's', s: cellStyle }));

            XLSX.utils.sheet_add_aoa(worksheet, [rowData], { origin: -1 });
        });

        const adjustColumnWidths = (worksheet) => {
            worksheet['!cols'] = [];
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            for (let col = range.s.c; col <= range.e.c; col++) {
                let maxWidth = 0;
                for (let row = range.s.r; row <= range.e.r; row++) {
                    const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
                    if (cell && cell.v) {
                        const cellWidth = cell.v.toString().length;
                        maxWidth = Math.max(maxWidth, cellWidth);
                    }
                }
                if (col === 0) {
                    maxWidth = Math.min(maxWidth, 5);
                }
                worksheet['!cols'][col] = { width: maxWidth + 2 };
            }
        };

        adjustColumnWidths(worksheet);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh Sách');

        const filePath = path.join(__dirname, 'Danhsachdangky.xlsx');
        XLSX.writeFile(workbook, filePath);

        res.download(filePath, `Danhsachdangky_Hocky${openAttendance.semester}_${openAttendance.schoolYear}.xlsx`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Error sending file.');
            }
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi xuất Excel' });
    }
}

const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); 
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

module.exports = {
    createData,
    getDataByOpenId,
    deleteSchedule,
    exportToExcel,
};