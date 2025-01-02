//CLI: npm install mongoose --save
const mongoose = require('mongoose');
const MyConstants = require('./MyConstants');
const User = require('../models/User');
const Role = require('../models/Role');
const OnCallSchedule = require('../models/OnCallSchedule');
// const { ObjectId } = mongoose.Types

const uri = 'mongodb+srv://' + MyConstants.DB_USER + ':' + MyConstants.DB_PASS + '@' + MyConstants.DB_SERVER + '/' + MyConstants.DB_DATABASE;
mongoose.connect(uri, { useNewUrlParser: true })
  .then(() => { console.log('Connected to ' + MyConstants.DB_SERVER + '/' + MyConstants.DB_DATABASE); })
  .catch((err) => { console.error(err); });

  const userDataList = [
    {
        email: "minh.hl@vlu.edu.vn",
        fullName: "Hoàng Lê Minh",
        phoneNumber: "",
        codeProfessional: "2001100116",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "phung.bm@vlu.edu.vn",
        fullName: "Bùi Minh Phụng",
        phoneNumber: "",
        codeProfessional: "2001100008",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "duc.nt@vlu.edu.vn",
        fullName: "Nguyễn Tuấn Đức",
        phoneNumber: "",
        codeProfessional: "2001102297",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "linh.ntm@vlu.edu.vn",
        fullName: "Nguyễn Thị Mỹ Linh",
        phoneNumber: "",
        codeProfessional: "2001101911",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "thoa.vtk@vlu.edu.vn",
        fullName: "Võ Thị Kim Thoa",
        phoneNumber: "",
        codeProfessional: "2001100059",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "anh.th@vlu.edu.vn",
        fullName: "Tống Hùng Anh",
        phoneNumber: "",
        codeProfessional: "2001100531",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "anh.ntd@vlu.edu.vn",
        fullName: "Nguyễn Thị Diễm Anh",
        phoneNumber: "",
        codeProfessional: "2001100108",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "chau.lth@vlu.edu.vn",
        fullName: "Lý Thị Huyền Châu",
        phoneNumber: "",
        codeProfessional: "2001100581",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "dien.nh@vlu.edu.vn",
        fullName: "Nguyễn Hồng Diên",
        phoneNumber: "",
        codeProfessional: "2001100524",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "duy.pn@vlu.edu.vn",
        fullName: "Phạm Ngọc Duy",
        phoneNumber: "",
        codeProfessional: "2001100601",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "hai.nt@vlu.edu.vn",
        fullName: "Nguyễn Thái Hải",
        phoneNumber: "",
        codeProfessional: "2001100532",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "hieu.lc@vlu.edu.vn",
        fullName: "Lê Công Hiếu",
        phoneNumber: "",
        codeProfessional: "2001100102",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "hoa.dd@vlu.edu.vn",
        fullName: "Đặng Đình Hòa",
        phoneNumber: "",
        codeProfessional: "2001100520",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "hong.pt@vlu.edu.vn",
        fullName: "Phan Thị Hồng",
        phoneNumber: "",
        codeProfessional: "2001100627",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "hung.hd@vlu.edu.vn",
        fullName: "Hà Đồng Hưng",
        phoneNumber: "",
        codeProfessional: "2001100428",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "linh.nt@vlu.edu.vn",
        fullName: "Nguyễn Tuyên Linh",
        phoneNumber: "",
        codeProfessional: "2001100169",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "linh.mtk@vlu.edu.vn",
        fullName: "Mai Thị Kiều Linh",
        phoneNumber: "",
        codeProfessional: "2001100305",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "mi.ndq@vlu.edu.vn",
        fullName: "Nguyễn Đắc Quỳnh Mi",
        phoneNumber: "",
        codeProfessional: "2001100603",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "minh.td@vlu.edu.vn",
        fullName : "Trần Đức Minh",
        phoneNumber: "",
        codeProfessional: "2001100438",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "nhat.tq@vlu.edu.vn",
        fullName: "Trần Quang Nhật",
        phoneNumber: "",
        codeProfessional: "2001100402",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "quang.nt@vlu.edu.vn",
        fullName: "Nguyễn Thế Quang",
        phoneNumber: "",
        codeProfessional: "2001100010",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "thanh.tc@vlu.edu.vn",
        fullName: "Trần Công Thanh",
        phoneNumber: "",
        codeProfessional: "2001100659",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "trung.nv@vlu.edu.vn",
        fullName: "Nguyễn Văn Trung",
        phoneNumber: "",
        codeProfessional: "2001100112",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "tuan.ht@vlu.edu.vn",
        fullName: "Huỳnh Thanh Tuấn",
        phoneNumber: "",
        codeProfessional: "2001100724",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "van.tkm@vlu.edu.vn",
        fullName: "Trần Kim Mỹ Vân",
        phoneNumber: "",
        codeProfessional: "2001100533",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "viet.tn@vlu.edu.vn",
        fullName: "Trần Ngọc Việt",
        phoneNumber: "",
        codeProfessional: "2001100189",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "quyen.nt@vlu.edu.vn",
        fullName: "Nguyễn Thị Quyên",
        phoneNumber: "",
        codeProfessional: "2001101046",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "huy.nq@vlu.edu.vn",
        fullName: "Ngô Quốc Huy",
        phoneNumber: "",
        codeProfessional: "2001101064",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "tan.nm@vlu.edu.vn",
        fullName: "Nguyễn Minh Tân",
        phoneNumber: "",
        codeProfessional: "2001101100",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "hoc.ht@vlu.edu.vn",
        fullName: "Huỳnh Thái Học",
        phoneNumber: "",
        codeProfessional: "2001100124",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "truong.phv@vlu.edu.vn",
        fullName: "Phan Hồ Viết Trường",
        phoneNumber: "",
        codeProfessional: "2001101105",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "trang.nth@vlu.edu.vn",
        fullName: "Nguyễn Thị Huyền Trang",
        phoneNumber: "",
        codeProfessional: "2001102407",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "tien.va@vlu.edu.vn",
        fullName: "Võ Anh Tiến",
        phoneNumber: "",
        codeProfessional: "2001102245",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "quan.dohuu@vlu.edu.vn",
        fullName: "Đỗ Hữu Quân",
        phoneNumber: "",
        codeProfessional: "2001300990",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "khang.nt@vlu.edu.vn",
        fullName: "Nguyễn Trương Khang",
        phoneNumber: "",
        codeProfessional: "2001102510",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "cuong.bd@vlu.edu.vn",
        fullName: "Bùi Duy Cương",
        phoneNumber: "",
        codeProfessional: "2001102538",
        position: "Giảng viên",
        role: "Giảng viên"
    },
    {
        email: "anh.nt@vlu.edu.vn",
        fullName: "Nguyễn Thái Anh",
        phoneNumber: "",
        codeProfessional: "2001102558",
        position: "Giảng viên",
        role: "Giảng viên"
    }
];
  
// Role.insertMany([
//     {
//       "role_name": "Quản trị",
//     },
//     {
//         "role_name": "Thư ký",
//       },
//       {
//         "role_name": "Giảng viên",
//       },
//       {
//         "role_name": "Ban chủ nhiệm",
//       },
//       {
//         "role_name": "Người dùng",
//       },
//   ]);
  // Hàm tạo người dùng
//   async function createUsers() {
//       for (const userData of userDataList) {
//         const newUser  = new User({
//           _id: new mongoose.Types.ObjectId(),
//           email: userData.email,
//           fullName: userData.fullName,
//           role: "67550632bbc88bad13b12d0b", 
//           isActive: true,
//           codeProfessional: userData.codeProfessional,
//           phoneNumber: userData.phoneNumber,
//           position: userData.position,
//       });

//       await newUser .save();
//       }
//   }
  
  // Gọi hàm để tạo người dùng
//   createUsers();

// OnCallSchedule.insertMany([
//     {
//       "day": "Sat", 
//       "onCallSession": "C",
//       "attendance": false, 
//       "openID": new ObjectId("671cbf472aba8f3fdffcb095"), 
//       "userID": "2ab8a6c8-0f91-414f-959f-54ccc836a845", 
//       "checkinTime": null,
//       "checkoutTime": null,
//       "date": new Date("2024-12-07T00:00:00Z"), 
//     },
//   ]);
  