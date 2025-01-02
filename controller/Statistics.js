require('../utils/MongooseUtil');
const OnCallSchedule = require('../models/OnCallSchedule');
const OpenAttendance = require('../models/OpenAttendance');
const RequestSchedule = require('../models/RequestSchedule');
const User = require('../models/User');
const Role = require('../models/Role');

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createHeaderStyle, createCellStyle } = require('../utils/excelStyles');

async function getData(req, res) {
    try {
        const schoolYear = req.query.schoolYear;
        const semester = req.query.semester;

        const openAttendance = await OpenAttendance.findOne({ statusId: 4, schoolYear, semester });
        if (!openAttendance) return res.json([]);

        const schedules = await OnCallSchedule.find({ openID: openAttendance._id });

        // Gom nhóm dữ liệu theo giảng viên (userID)
        const statistics = schedules.reduce((acc, schedule) => {
            const { userID, attendance, date } = schedule;
            const currentDate = new Date();

            if (!acc[userID]) {
                acc[userID] = {
                    userID,
                    totalRegistered: 0,
                    totalPresent: 0,
                    totalAbsent: 0,
                    totalPending: 0,
                };
            }

            acc[userID].totalRegistered++;

            if (new Date(date) <= currentDate) {
                if (attendance) {
                    acc[userID].totalPresent++;
                } else {
                    acc[userID].totalAbsent++;
                }
            } else {
                acc[userID].totalPending++;
            }

            return acc;
        }, {});

        const lecturers = await User.find()
            .populate({
                path: 'role',
                match: { role_name: "Giảng viên" }
            });

        const requestSchedules = await RequestSchedule.find({ openId: openAttendance._id });
        const requestStats = requestSchedules.reduce((acc, request) => {
            const { userID, statusId } = request;
            if (!acc[userID]) {
                acc[userID] = {
                    totalRequests: 0,
                    totalApproved: 0,
                    totalRejected: 0,
                    totalPendingRequests: 0,
                };
            }

            acc[userID].totalRequests++;

            if (statusId === 3) {
                acc[userID].totalApproved++;
            } else if (statusId === 2) {
                acc[userID].totalRejected++;
            } else if (statusId === 1) {
                acc[userID].totalPendingRequests++;
            }

            return acc;
        }, {});

        const result = lecturers.map((lecturer) => {
            const stat = statistics[lecturer._id] || {
                totalRegistered: 0,
                totalPresent: 0,
                totalAbsent: 0,
                totalPending: 0,
            };
            const requestStat = requestStats[lecturer._id] || {
                totalRequests: 0,
                totalApproved: 0,
                totalRejected: 0,
                totalPendingRequests: 0,
            };

            return {
                userID: lecturer._id,
                fullName: lecturer.fullName,
                codeProfessional: lecturer.codeProfessional,
                totalRegistered: stat.totalRegistered,
                totalPresent: stat.totalPresent,
                totalAbsent: stat.totalAbsent,
                totalPending: stat.totalPending,
                totalRequests: requestStat.totalRequests,
                totalApproved: requestStat.totalApproved,
                totalRejected: requestStat.totalRejected,
                totalPendingRequests: requestStat.totalPendingRequests,
            };
        });

        const totalStatistics = result.reduce(
            (totals, current) => {
                totals.totalRegistered += current.totalRegistered;
                totals.totalPresent += current.totalPresent;
                totals.totalAbsent += current.totalAbsent;
                totals.totalPending += current.totalPending;

                totals.totalRequests += current.totalRequests;
                totals.totalApproved += current.totalApproved;
                totals.totalRejected += current.totalRejected;
                totals.totalPendingRequests += current.totalPendingRequests;
                return totals;
            },
            {
                totalRegistered: 0,
                totalPresent: 0,
                totalAbsent: 0,
                totalPending: 0,
                totalRequests: 0,
                totalApproved: 0,
                totalRejected: 0,
                totalPendingRequests: 0,
            }
        );

        res.status(200).json({
            lecturers: result,
            totals: totalStatistics,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi lấy dữ liệu." });
    }
}

async function exportToExcel(req, res) {
    try {
        const { schoolYear, semester } = req.body;
        
        // Lấy dữ liệu thống kê từ getData
        const openAttendance = await OpenAttendance.findOne({ statusId: 4, schoolYear, semester });
        if (!openAttendance) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin về lịch trực' });
        }

        const schedules = await OnCallSchedule.find({ openID: openAttendance._id });

        // Gom nhóm dữ liệu theo giảng viên (userID)
        const statistics = schedules.reduce((acc, schedule) => {
            const { userID, attendance, date } = schedule;
            const currentDate = new Date();

            if (!acc[userID]) {
                acc[userID] = {
                    userID,
                    totalRegistered: 0,
                    totalPresent: 0,
                    totalAbsent: 0,
                    totalPending: 0,
                };
            }

            acc[userID].totalRegistered++;

            if (new Date(date) <= currentDate) {
                if (attendance) {
                    acc[userID].totalPresent++;
                } else {
                    acc[userID].totalAbsent++;
                }
            } else {
                acc[userID].totalPending++;
            }

            return acc;
        }, {});

        const lecturers = await User.find()
            .populate({
                path: 'role',
                match: { role_name: "Giảng viên" }
            });

        const requestSchedules = await RequestSchedule.find({ openId: openAttendance._id });
        const requestStats = requestSchedules.reduce((acc, request) => {
            const { userID, statusId } = request;
            if (!acc[userID]) {
                acc[userID] = {
                    totalRequests: 0,
                    totalApproved: 0,
                    totalRejected: 0,
                    totalPendingRequests: 0,
                };
            }

            acc[userID].totalRequests++;

            if (statusId === 3) {
                acc[userID].totalApproved++;
            } else if (statusId === 2) {
                acc[userID].totalRejected++;
            } else if (statusId === 1) {
                acc[userID].totalPendingRequests++;
            }

            return acc;
        }, {});

        const result = lecturers.map((lecturer) => {
            const stat = statistics[lecturer._id] || {
                totalRegistered: 0,
                totalPresent: 0,
                totalAbsent: 0,
                totalPending: 0,
            };
            const requestStat = requestStats[lecturer._id] || {
                totalRequests: 0,
                totalApproved: 0,
                totalRejected: 0,
                totalPendingRequests: 0,
            };

            return {
                userID: lecturer._id,
                fullName: lecturer.fullName,
                codeProfessional: lecturer.codeProfessional,
                totalRegistered: stat.totalRegistered,
                totalPresent: stat.totalPresent,
                totalAbsent: stat.totalAbsent,
                totalPending: stat.totalPending,
                totalRequests: requestStat.totalRequests,
                totalApproved: requestStat.totalApproved,
                totalRejected: requestStat.totalRejected,
                totalPendingRequests: requestStat.totalPendingRequests,
            };
        });

        // Tạo bảng Excel
        const worksheet = XLSX.utils.aoa_to_sheet([]);
        const headerStyle = createHeaderStyle();

        // Header 1
        XLSX.utils.sheet_add_aoa(worksheet, [[{ 
            v: 'DANH SÁCH GIẢNG VIÊN VÀ THỐNG KÊ',
            t: 's',
            s: headerStyle
        }]], { origin: 'A1' });

        // Header 2
        XLSX.utils.sheet_add_aoa(worksheet, [[{
            v: `Năm học: ${schoolYear} Học kỳ: ${semester}`,
            t: 's',
            s: headerStyle
        }]], { origin: 'A2' });

        // Thêm tiêu đề cột với style
        const columnHeaders = ['STT', 'Mã giảng viên', 'Họ và tên', 'Số buổi đăng ký', 'Số buổi đã trực', 
            'Số buổi vắng', 'Số buổi chưa tới lịch', 'Số yêu cầu', 'Yêu cầu được duyệt',
            'Yêu cầu bị từ chối', 'Yêu cầu chưa phản hồi'].map(header => ({ v: header, t: 's', s: createCellStyle() }));

        XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], { origin: 'A4' });

        // Thêm dữ liệu giảng viên với style
        result.forEach((lecturer, index) => {
            const rowData = [
                index + 1,
                lecturer.codeProfessional,
                lecturer.fullName,
                lecturer.totalRegistered,
                lecturer.totalPresent,
                lecturer.totalAbsent,
                lecturer.totalPending,
                lecturer.totalRequests,
                lecturer.totalApproved,
                lecturer.totalRejected,
                lecturer.totalPendingRequests,
            ].map(value => ({ v: value, t: 's', s: createCellStyle() }));

            XLSX.utils.sheet_add_aoa(worksheet, [rowData], { origin: -1 });
        });

        // Điều chỉnh độ rộng cột
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
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Thống kê giảng viên');

        const filePath = path.join(__dirname, 'ThongKeGiangVien.xlsx');
        XLSX.writeFile(workbook, filePath);

        res.download(filePath, `ThongKe_${schoolYear}_${semester}.xlsx`, (err) => {
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

async function getLecturersLateStatistics(req, res) {
    try {
        const schoolYear = req.query.schoolYear;
        const semester = req.query.semester;

        const openAttendance = await OpenAttendance.findOne({ statusId: 4, schoolYear, semester });
        if (!openAttendance) return res.json([]);

        const schedules = await OnCallSchedule.find({ openID: openAttendance._id });

        const statistics = schedules.reduce((acc, schedule) => {
            const { userID, date, checkinTime, checkoutTime, onCallSession } = schedule;

            const dateStr = new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD
            const time_In_S = new Date(`${dateStr}T${openAttendance.time_In_S}:00.000Z`);
            const time_Out_S = new Date(`${dateStr}T${openAttendance.time_Out_S}:00.000Z`);
            const time_In_C = new Date(`${dateStr}T${openAttendance.time_In_C}:00.000Z`);
            const time_Out_C = new Date(`${dateStr}T${openAttendance.time_Out_C}:00.000Z`);

            const lateThreshold_S = new Date(time_In_S.getTime() + 60 * 60 * 1000); 
            const earlyThreshold_S = new Date(time_Out_S.getTime() - 60 * 60 * 1000);
            const lateThreshold_C = new Date(time_In_C.getTime() + 60 * 60 * 1000); 
            const earlyThreshold_C = new Date(time_Out_C.getTime() - 60 * 60 * 1000);

            if (!acc[userID]) {
                acc[userID] = {
                    userID,
                    totalPresentLate: 0,
                    totalLeaveEarly: 0,
                    totalNoCheckout: 0,
                };
            }

            if (checkinTime) {
                const checkinDate = new Date(checkinTime);
                const lateThreshold = onCallSession === 'S' ? lateThreshold_S : lateThreshold_C;
                if (checkinDate > lateThreshold) {
                    acc[userID].totalPresentLate++;
                }
            }

            if (checkoutTime) {
                const checkoutDate = new Date(checkoutTime);
                const earlyThreshold = onCallSession === 'S' ? earlyThreshold_S : earlyThreshold_C;
                if (checkoutDate < earlyThreshold) {
                    acc[userID].totalLeaveEarly++;
                }
            }

            if (checkinTime && !checkoutTime) {
                acc[userID].totalNoCheckout++;
            }
            return acc;
        }, {});

        const userIDs = Object.keys(statistics);
        const users = await User.find({ _id: { $in: userIDs } }, { _id: 1, fullName: 1, codeProfessional: 1 });

        const result = Object.values(statistics).map((stat) => {
            const user = users.find((u) => u._id.toString() === stat.userID);
            return {
                ...stat,
                fullName: user ? user.fullName : '',
                codeProfessional: user ? user.codeProfessional : '',
            };
        });

        const totalLate = result.reduce((sum, lecturer) => sum + lecturer.totalPresentLate, 0);
        const totalLeaveEarly = result.reduce((sum, lecturer) => sum + lecturer.totalLeaveEarly, 0);
        const totalNoCheckout = result.reduce((sum, lecturer) => sum + lecturer.totalNoCheckout, 0);

        res.status(200).json({
            lecturers: result, 
            totals: {
                totalLate,
                totalLeaveEarly,
                totalNoCheckout,
            }
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi lấy dữ liệu." });
    }
}

async function exportLateStatisticsToExcel(req, res) {
    try {
        const schoolYear = req.body.schoolYear;
        const semester = req.body.semester;

        const openAttendance = await OpenAttendance.findOne({ statusId: 4, schoolYear, semester });
        if (!openAttendance) return res.json([]);

        const schedules = await OnCallSchedule.find({ openID: openAttendance._id });

        const statistics = schedules.reduce((acc, schedule) => {
            const { userID, date, checkinTime, checkoutTime, onCallSession } = schedule;

            const dateStr = new Date(date).toISOString().split('T')[0]; 
            const time_In_S = new Date(`${dateStr}T${openAttendance.time_In_S}:00.000Z`);
            const time_Out_S = new Date(`${dateStr}T${openAttendance.time_Out_S}:00.000Z`);
            const time_In_C = new Date(`${dateStr}T${openAttendance.time_In_C}:00.000Z`);
            const time_Out_C = new Date(`${dateStr}T${openAttendance.time_Out_C}:00.000Z`);

            const lateThreshold_S = new Date(time_In_S.getTime() + 60 * 60 * 1000); 
            const earlyThreshold_S = new Date(time_Out_S.getTime() - 60 * 60 * 1000);
            const lateThreshold_C = new Date(time_In_C.getTime() + 60 * 60 * 1000); 
            const earlyThreshold_C = new Date(time_Out_C.getTime() - 60 * 60 * 1000);

            if (!acc[userID]) {
                acc[userID] = {
                    userID,
                    totalPresentLate: 0,
                    totalLeaveEarly: 0,
                    totalNoCheckout: 0,
                };
            }

            if (checkinTime) {
                const checkinDate = new Date(checkinTime);
                const lateThreshold = onCallSession === 'S' ? lateThreshold_S : lateThreshold_C;
                if (checkinDate > lateThreshold) {
                    acc[userID].totalPresentLate++;
                }
            }

            if (checkoutTime) {
                const checkoutDate = new Date(checkoutTime);
                const earlyThreshold = onCallSession === 'S' ? earlyThreshold_S : earlyThreshold_C;
                if (checkoutDate < earlyThreshold) {
                    acc[userID].totalLeaveEarly++;
                }
            }

            if (checkinTime && !checkoutTime) {
                acc[userID].totalNoCheckout++;
            }
            return acc;
        }, {});

        const userIDs = Object.keys(statistics);
        const users = await User.find({ _id: { $in: userIDs } }, { _id: 1, fullName: 1, codeProfessional: 1 });

        const result = Object.values(statistics).map((stat) => {
            const user = users.find((u) => u._id.toString() === stat.userID);
            return {
                ...stat,
                fullName: user ? user.fullName : '',
                codeProfessional: user ? user.codeProfessional : '',
            };
        });

        const totalLate = result.reduce((sum, lecturer) => sum + lecturer.totalPresentLate, 0);
        const totalLeaveEarly = result.reduce((sum, lecturer) => sum + lecturer.totalLeaveEarly, 0);
        const totalNoCheckout = result.reduce((sum, lecturer) => sum + lecturer.totalNoCheckout, 0);

        // Tạo bảng Excel
        const worksheet = XLSX.utils.aoa_to_sheet([]);
        const headerStyle = createHeaderStyle();

        // Header 1
        XLSX.utils.sheet_add_aoa(worksheet, [[{ 
            v: 'THỐNG KÊ ĐẾN TRỄ, VỀ SỚM VÀ KHÔNG CHECK OUT',
            t: 's',
            s: headerStyle
        }]], { origin: 'A1' });

        // Header 2
        XLSX.utils.sheet_add_aoa(worksheet, [[{
            v: `Năm học: ${schoolYear} Học kỳ: ${semester}`,
            t: 's',
            s: headerStyle
        }]], { origin: 'A2' });

        // Thêm tiêu đề cột với style
        const columnHeaders = ['STT', 'Mã giảng viên', 'Họ và tên', 'Số buổi đến trễ', 'Số buổi về sớm', 
            'Số buổi không check out'].map(header => ({ v: header, t: 's', s: createCellStyle() }));

        XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], { origin: 'A4' });

        // Thêm dữ liệu giảng viên với style
        result.forEach((lecturer, index) => {
            const rowData = [
                index + 1,
                lecturer.codeProfessional || '',
                lecturer.fullName || '',
                lecturer.totalPresentLate || 0,
                lecturer.totalLeaveEarly || 0,
                lecturer.totalNoCheckout || 0,
            ].map(value => ({ v: value, t: typeof value === 'number' ? 'n' : 's', s: createCellStyle() }));
            

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
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Thống kê không check out');

        const filePath = path.join(__dirname, 'ThongKeNoCheckout.xlsx');
        XLSX.writeFile(workbook, filePath);

        res.download(filePath, `Thong-Ke-No-CheckOut_${schoolYear}_${semester}.xlsx`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Error sending file.');
            }
            fs.unlinkSync(filePath);
        });

    } catch (error) {
        console.error("Error exporting to Excel:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi xuất dữ liệu ra Excel." });
    }
}

module.exports = {
    getData,
    exportToExcel,
    getLecturersLateStatistics,
    exportLateStatisticsToExcel,
};