const express = require('express');
const router = express.Router();

const { getData, saveReq, deleteReq, updateReq } = require('../controller/RequestScheduleController');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/', isAuthenticated, getData);
router.post('/', isAuthenticated, saveReq);
router.put('/', isAuthenticated, updateReq);
router.delete('/:reqId', isAuthenticated, deleteReq);

module.exports = router;