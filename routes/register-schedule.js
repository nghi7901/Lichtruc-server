const express = require('express');
const router = express.Router();

const { createData, getDataByOpenId, deleteSchedule, exportToExcel } = require('../controller/RegisterScheduleController');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/', isAuthenticated, getDataByOpenId);
router.post('/', isAuthenticated,  createData);
router.delete('/:id', isAuthenticated,  deleteSchedule);
router.post('/export-excel', isAuthenticated,  exportToExcel);

module.exports = router;