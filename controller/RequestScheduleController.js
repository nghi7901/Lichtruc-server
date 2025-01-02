require('../utils/MongooseUtil');
const OnCallSchedule = require('../models/OnCallSchedule');
const OpenAttendance = require('../models/OpenAttendance');
const RequestSchedule = require('../models/RequestSchedule');
const User = require('../models/User');
const Role = require('../models/Role');

const nodemailer = require('nodemailer');

const dotenv = require('dotenv');
dotenv.config();

// stutusId = 1: chờ duyệt
// stutusId = 2: từ chối
// stutusId = 3: đã duyệt

async function getData(req, res) {
    try {
        const userId = req.query.userId;
        const schoolYear = req.query.schoolYear;
        const semester = req.query.semester;

        const attendance = await OpenAttendance.findOne({ statusId: 4, schoolYear, semester });
        if (!attendance) return res.json([]);

        const curUser = await User.findOne({ _id: userId })
        if (!curUser) return;

        const userRole = await Role.findOne({ _id: curUser.role });
        if (!userRole) {
            return res.status(404).json({ message: 'Không tìm thấy vai trò người dùng.' });
        }

        let requestSchedule;
        if (userRole.role_name === "Giảng viên") {
            requestSchedule = await RequestSchedule.find({
                openId: attendance._id,
                userID: userId,
            }).sort({ createdAt: -1 });
        }
        else if ((userRole.role_name === "Ban chủ nhiệm" || userRole.role_name === "Quản trị")) {
            requestSchedule = await RequestSchedule.find({
                openId: attendance._id,
            }).populate({
                path: 'userID',
                select: 'fullName',
            }).sort({ createdAt: -1 });
        } else {
            return;
        }

        return res.status(200).json(requestSchedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi xử lý yêu cầu.', error });
    }
}

async function saveReq(req, res) {
    try {
        const { selectedOption, requestSchedule } = req.body;
        const { reason, dateFrom, dateTo, onCallSessionChange, userID, openId, onCallScheduleId } = requestSchedule;

        const curUser = await User.findOne({ _id: userID })
        if (!curUser) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedOption === 'absent' && !reason) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do vắng!' });
        }
        if (selectedOption === 'reschedule') {
            if (!dateTo || !onCallSessionChange) {
                return res.status(400).json({ success: false, message: 'Vui lòng chọn ngày và buổi thay thế!' });
            }
        }
        if (selectedOption === 'reschedule' && dateTo && new Date(dateTo) < today) {
            return res.status(400).json({ success: false, message: 'Ngày đổi không được trước ngày hiện tại!' });
        }

        const request = new RequestSchedule({
            userID,
            day: new Date(dateFrom).toLocaleString('en-us', { weekday: 'short' }),
            onCallSession: requestSchedule.onCallSession,
            dayChange: selectedOption === 'reschedule' ? new Date(dateTo).toLocaleString('en-us', { weekday: 'short' }) : null,
            openId: openId,
            onCallScheduleId,
            dateFrom: new Date(dateFrom),
            dateTo: selectedOption === 'reschedule' ? new Date(dateTo) : null,
            typeRequest: selectedOption === 'absent' ? 1 : 2,
            reason: selectedOption === 'absent' ? reason : '',
            statusId: 1,
            onCallSessionChange: selectedOption === 'reschedule' ? onCallSessionChange : null,
            note: '',
        });

        const savedRequest = await request.save();

        const updatedOnCall = await OnCallSchedule.findByIdAndUpdate(
            onCallScheduleId,
            {
                requestSchedule: true,
                requestId: savedRequest._id,
            },
            { new: true }
        );

        if (!updatedOnCall) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy buổi trực để cập nhật!' });
        }
        res.json({ success: true, message: 'Yêu cầu đã được gửi!' });

        setImmediate(async () => {
            try {
                const admins = await User.find({
                    "role": {
                        $in: [
                            await Role.findOne({ role_name: "Quản trị" }).then(role => role._id),
                            await Role.findOne({ role_name: "Ban chủ nhiệm" }).then(role => role._id)
                        ]
                    }
                });
                const adminEmails = admins.map((admin) => admin.email);

                if (adminEmails.length > 0) {
                    const formatDate = (dateString) => {
                        const date = new Date(dateString);
                        const day = date.getDate().toString().padStart(2, '0');
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                    };

                    const formattedDateFrom = formatDate(dateFrom);
                    const formattedDateTo = dateTo ? formatDate(dateTo) : null;

                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.SMTP_EMAIL,
                            pass: process.env.SMTP_PASSWORD,
                        },
                    });

                    const mailOptions = {
                        from: process.env.SMTP_EMAIL,
                        to: adminEmails.join(','),
                        subject: `Thông báo yêu cầu ${selectedOption === 'absent' ? 'xin vắng' : 'đổi lịch trực'}`,
                        text: `Giảng viên ${curUser.fullName} đã gửi một yêu cầu ${selectedOption === 'absent' ? 'xin vắng' : 'đổi lịch trực'}.\n
                            ${selectedOption === 'absent' ? `- Lý do: ${reason || 'Không có'}` : ''}    
                            ${selectedOption === 'absent' ? `- Buổi trực: ${requestSchedule.onCallSession === 'S' ? 'Sáng' : 'Chiều'} ngày ${formattedDateFrom}`
                                : `- Đổi từ buổi trực: ${requestSchedule.onCallSession === 'S' ? 'Sáng' : 'Chiều'} ngày ${formattedDateFrom}`}      
                            
                            ${selectedOption === 'reschedule' ? `- Sang buổi ${onCallSessionChange === 'S' ? 'Sáng' : 'Chiều'} ngày ${formattedDateTo}\n` : ''}
                            Vui lòng kiểm tra hệ thống để xử lý yêu cầu.`,
                    };
                    const formattedText = mailOptions.text
                        .replace(/^\s+/gm, '')
                        .replace(/\s+$/gm, '')
                        .replace(/\n\s*\n/g, '\n\n')

                    mailOptions.text = formattedText;
                    await transporter.sendMail(mailOptions);
                }
            } catch (error) {
                console.error("Failed to send email:", error);
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại!' });
    }
}

async function deleteReq(req, res) {
    try {
        const { reqId } = req.params;
        const request = await RequestSchedule.findById(reqId);
        if (!request) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        if (request.statusId === 1) {
            await RequestSchedule.deleteOne({ _id: reqId });

            const updatedOnCall = await OnCallSchedule.findByIdAndUpdate(
                request.onCallScheduleId
                ,
                {
                    requestSchedule: false,
                    requestId: undefined,
                },
                { new: true }
            );

            if (!updatedOnCall) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy buổi trực để cập nhật!' });
            }
        } else return res.status(404).json({ message: 'Cannot delete.' });

        return res.status(200).json({ message: 'Deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại!' });
    }
}

async function updateReq(req, res) {
    try {
        const { _id, statusId, note } = req.body;
        const request = await RequestSchedule.findById(_id);
        if (!request) {
            return res.status(404).json({ message: 'Request not found.' });
        }
        // Từ chối
        if (statusId === 2) {
            await RequestSchedule.updateOne({ _id: _id }, { statusId: statusId, note: note });
            res.status(200).json({ message: 'Updated successfully.' });
            setImmediate(async () => {
                try {
                    const user = await User.findById(request.userID);
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.SMTP_EMAIL,
                            pass: process.env.SMTP_PASSWORD,
                        },
                    });

                    const mailOptions = {
                        from: process.env.SMTP_EMAIL,
                        to: user.email,
                        subject: `Thông báo phản hồi yêu cầu ${request.typeRequest === 1 ? 'xin vắng' : 'đổi lịch trực'}`,
                        text: `Xin chào ${user.fullName},\n\n
                            Yêu cầu ${request.typeRequest === 1 ? 'xin vắng' : 'đổi lịch trực'} của bạn đã bị từ chối. 
                            Lý do: ${note || 'Không có lý do cụ thể.'}.\n
                            Vui lòng kiểm tra lại hệ thống để biết thêm chi tiết.\n\n
                            Trân trọng!`
                    };

                    const formattedText = mailOptions.text
                        .replace(/^\s+/gm, '')
                        .replace(/\s+$/gm, '')
                        .replace(/\n\s*\n/g, '\n\n')

                    mailOptions.text = formattedText;
                    await transporter.sendMail(mailOptions);
                } catch (emailError) {
                    console.error("Error sending email: ", emailError);
                }
            });
        }
        // Duyệt
        if (statusId === 3) {
            if (request.typeRequest === 1) {
                await RequestSchedule.updateOne({ _id: _id }, { statusId: statusId });
                res.status(200).json({ message: 'Duyệt yêu cầu thành công.' });
                setImmediate(async () => {
                    try {
                        const user = await User.findById(request.userID);
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: process.env.SMTP_EMAIL,
                                pass: process.env.SMTP_PASSWORD,
                            },
                        });

                        const mailOptions = {
                            from: process.env.SMTP_EMAIL,
                            to: user.email,
                            subject: `Thông báo phản hồi yêu cầu ${request.typeRequest === 1 ? 'xin vắng' : 'đổi lịch trực'}`,
                            text: `Xin chào ${user.fullName},\n\n
                                Yêu cầu ${request.typeRequest === 1 ? 'xin vắng' : 'đổi lịch trực'} của bạn đã được duyệt. 
                                Vui lòng kiểm tra lại hệ thống để biết thêm chi tiết.\n\n
                                Trân trọng!`
                        };

                        const formattedText = mailOptions.text
                            .replace(/^\s+/gm, '')
                            .replace(/\s+$/gm, '')
                            .replace(/\n\s*\n/g, '\n\n')

                        mailOptions.text = formattedText;
                        await transporter.sendMail(mailOptions);
                    } catch (emailError) {
                        console.error("Error sending email: ", emailError);
                    }
                });
            }
            if (request.typeRequest === 2) {
                let newDate = new Date(request.dateTo);
                const newOnCallSchedule = new OnCallSchedule({
                    day: request.dayChange,
                    onCallSession: request.onCallSessionChange,
                    userID: request.userID,
                    attendance: false,
                    openID: request.openId,
                    date: newDate,
                    checkinTime: null,
                    checkoutTime: null,
                });

                await OnCallSchedule.deleteOne({ _id: request.onCallScheduleId });
                const updatedOnCall = await OnCallSchedule.findByIdAndUpdate(
                    request.onCallScheduleId
                    ,
                    {
                        requestSchedule: false,
                        requestId: undefined,
                    },
                    { new: true }
                );
                await newOnCallSchedule.save();
                await RequestSchedule.updateOne({ _id: _id }, { statusId: statusId });

                res.json({ message: 'Duyệt yêu cầu thành công.' });
                setImmediate(async () => {
                    try {
                        const user = await User.findById(request.userID);
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: process.env.SMTP_EMAIL,
                                pass: process.env.SMTP_PASSWORD,
                            },
                            // debug: true,
                            // logger: true,
                        });

                        const mailOptions = {
                            from: process.env.SMTP_EMAIL,
                            to: user.email,
                            subject: `Thông báo phản hồi yêu cầu ${request.typeRequest === 1 ? 'xin vắng' : 'đổi lịch trực'}`,
                            text: `Xin chào ${user.fullName},\n\n
                                Yêu cầu ${request.typeRequest === 1 ? 'xin vắng' : 'đổi lịch trực'} của bạn đã được duyệt. 
                                Vui lòng kiểm tra lại hệ thống để biết thêm chi tiết.\n\n
                                Trân trọng!`
                        };

                        const formattedText = mailOptions.text
                            .replace(/^\s+/gm, '')
                            .replace(/\s+$/gm, '')
                            .replace(/\n\s*\n/g, '\n\n')

                        mailOptions.text = formattedText;
                        await transporter.sendMail(mailOptions);
                    } catch (emailError) {
                        console.error("Error sending email: ", emailError);
                    }
                });
            }
        }

    } catch (error) {
        res.status(500).json({ success: false, message: 'Có lỗi xảy ra, vui lòng thử lại!' });
    }
}


module.exports = {
    getData,
    saveReq,
    deleteReq,
    updateReq,
};