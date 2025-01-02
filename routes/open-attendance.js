const express = require('express');
const router = express.Router();

const {createOpen, getData, changeDataById, deleteOpenAttendance, details, getScheduleByDate} = require('../controller/OpenAttendanceController');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/', isAuthenticated, getData);
router.post('/', isAuthenticated, createOpen);
router.put('/statusId/:id', isAuthenticated, changeDataById);
router.delete('/:id', isAuthenticated, deleteOpenAttendance);
router.get('/details/:id', isAuthenticated, details);
router.get('/get-by-date', isAuthenticated, getScheduleByDate)

module.exports = router;