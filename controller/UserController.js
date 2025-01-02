require('../utils/MongooseUtil');
const User = require('../models/User');
const Role = require('../models/Role');
const mongoose = require('mongoose');

const formatUser = (user, existingRole) => {
    return {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: {
            _id: existingRole._id,
            role_name: existingRole.role_name 
        },
        isActive: user.isActive,
        codeProfessional: user.codeProfessional,
        phoneNumber:  user.phoneNumber,
        position:  user.position,
        lastAccessed: user.lastAccessed,
    };
};

async function getUsers(req, res) {
    const users = await User.find().populate('role').sort({ _id: -1 });
    return res.status(200).json(users);
}

async function createUser(req, res) {
    const { email, fullName, codeProfessional, role, phoneNumber, position } = req.body;

    try {
        // Kiểm tra xem email đã tồn tại chưa
        const userExist = await User.findOne({ email });

        if (userExist) {
            return res.status(409).json({ message: 'Email đã tồn tại.' });
        }

        const codeProfessionalExist = await User.findOne({ codeProfessional });

        if (codeProfessionalExist) {
            return res.status(409).json({ message: 'Mã giảng viên đã tồn tại.' });
        }

        const existingRole = await Role.findOne({ role_name: role });
        if (!existingRole) {
            return res.status(400).json({ message: 'Vai trò không tồn tại trong hệ thống' });
        }

        const newUser = new User({
            _id: new mongoose.Types.ObjectId(),
            email,
            fullName,
            role: existingRole._id,
            isActive: true,
            codeProfessional,
            phoneNumber,
            position,
        });

        await newUser.save();

        const formattedUser = formatUser(newUser, existingRole);
        return res.status(201).json(formattedUser);
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}


async function editUser(req, res) {
    const { id } = req.params; 
    const { email, fullName, codeProfessional, role, phoneNumber, position, isActive } = req.body; 

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        const codeProfessionalExist = await User.findOne({ codeProfessional, _id: { $ne: id } });
        if (codeProfessionalExist) {
            return res.status(409).json({ message: 'Mã giảng viên đã tồn tại.' });
        }

        const existingRole = await Role.findOne({ role_name: role });
        if (!existingRole) {
            return res.status(400).json({ message: 'Vai trò không tồn tại trong hệ thống' });
        }

        user.fullName = fullName;
        user.role = existingRole._id;
        user.isActive = isActive;
        user.codeProfessional = codeProfessional;
        user.phoneNumber = phoneNumber;
        user.position = position;

        await user.save();
        const formattedUser = formatUser(user, existingRole);
        return res.status(200).json(formattedUser); 
    } catch (error) {
        console.error('Error editing user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

async function deleteUser(req, res) {
    const { id } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await User.deleteOne({ _id: id });

        return res.status(200).json({ message: 'User deleted successfully.' }); 
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

async function getLecturersWithImages(req, res) {
    try {
        const lecturers = await User.find()
            .populate({
                path: 'role',
                match: { role_name: "Giảng viên" }
            })
            .sort({ _id: -1 });

        const filteredLecturers = lecturers.filter(user => user.role);

        const lecturersWithImages = filteredLecturers.map(user => ({
            email: user.email,
            fullName: user.fullName,
            codeProfessional: user.codeProfessional,
            position: user.position,
            images: user.images
                .map(image => {
                    try {
                        const base64Image = `data:image/jpeg;base64,${image.data.toString("base64")}`;

                        const timestamp = new Date(image.timestamp);
                        const vietnamTime = new Date(
                            timestamp.getTime() + 7 * 60 * 60 * 1000 
                        );

                        const formattedTimestamp = vietnamTime.toISOString().replace("Z", "+07:00");

                        return {
                            image: base64Image,
                            timestamp: formattedTimestamp,
                        };
                    } catch (err) {
                        console.error(`Lỗi khi xử lý ảnh của user ${user.email}:`, err.message);
                        return null;
                    }
                })
                .filter(image => image !== null) 
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        }));

        return res.status(200).json(lecturersWithImages);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách giảng viên:", error);
        return res.status(500).json({ message: "Không thể lấy danh sách giảng viên." });
    }
}

module.exports = {
    getUsers,
    createUser,
    editUser,
    deleteUser,
    getLecturersWithImages
};
