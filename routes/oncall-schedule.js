const express = require('express');
const router = express.Router();

const { getDataByUserId, getData, exportAttendanceHistory } = require('../controller/OnCallScheduleController');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/', isAuthenticated, getDataByUserId);
router.get('/schedules/', isAuthenticated, getData);
router.post('/export/', isAuthenticated, exportAttendanceHistory);

module.exports = router;