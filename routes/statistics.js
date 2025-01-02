const express = require('express');
const router = express.Router();

const { getData, exportToExcel, getLecturersLateStatistics, exportLateStatisticsToExcel } = require('../controller/Statistics');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/overview', isAuthenticated, getData);
router.post('/export-excel', isAuthenticated, exportToExcel);
router.get('/late',  getLecturersLateStatistics);
router.post('/export-excel/late', isAuthenticated, exportLateStatisticsToExcel);

module.exports = router;