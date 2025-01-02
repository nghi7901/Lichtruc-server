const express = require('express');
const router = express.Router();

const { getUsers, createUser, editUser, deleteUser, getLecturersWithImages } = require('../controller/UserController');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/', isAuthenticated, getUsers);
router.post('/', isAuthenticated, createUser);
router.put('/:id', isAuthenticated, editUser);
router.delete('/:id', isAuthenticated, deleteUser);
router.get('/images', isAuthenticated, getLecturersWithImages);

module.exports = router;