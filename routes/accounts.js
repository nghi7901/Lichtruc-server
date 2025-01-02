const express = require('express');
const router = express.Router();
const passport = require('passport');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');

// Route để lấy thông tin đăng nhập
router.get('/login', (req, res) => {
    res.json({
        message: 'Log in with your Identity Provider',
        loginUrl: '/auth'
    });
});

// Route để xác thực OAuth 2.0
router.get('/auth', passport.authenticate('microsoft'));

// Route callback cho OAuth 2.0
router.get('/auth/callback', passport.authenticate('microsoft', { failureRedirect: '/dashboard' }), async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('role', '_id role_name').exec();
        const userData = {
            _id: req.user._id,
            fullName: req.user.fullName,
            email: req.user.email,
            accessToken: req.user.accessToken,
            isActive: req.user.isActive,
            role: user.role,
        };

        const redirectURL = `${process.env.CLIENT_URL}/dashboard?token=${userData.accessToken}&role=${userData.role}`;
        return res.redirect(redirectURL);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Authentication failed', error });
    }
});

router.get('/user', async (req, res) => {
    if (req.isAuthenticated()) {
        const user = await User.findById(req.user._id).populate('role', '_id role_name').exec();
        const userData = {
            _id: req.user._id,
            fullName: req.user.fullName,
            email: req.user.email,
            accessToken: req.user.accessToken,
            isActive: req.user.isActive,
            role: user.role,
        };
        res.json({
            user: userData
        });
    } else {
        res.status(401).json({ message: 'User not authenticated' });
    }
});

// Route để đăng xuất
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed', error: err });
        }
        res.json({ message: 'Logout successful' });
    });
});

module.exports = router;