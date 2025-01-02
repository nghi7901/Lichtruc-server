require('../utils/MongooseUtil');
const passport = require('passport');
const MicrosoftStrategy = require('passport-microsoft').Strategy
const User = require('../models/User');
const dotenv = require('dotenv');
const jwt = require("jsonwebtoken");

dotenv.config();

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ['user.read'],
      tenant: process.env.TENANT_ID,
      authorizationURL: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        const user = await User.findOrCreate(
          {
            _id: profile.id,
            userName: profile.displayName,
            email: profile.mail || profile.userPrincipalName,
          });
        user.accessToken = accessToken;
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware xác thực
const isAuthenticated = async(req, res, next) => {
  const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token);
    console.log("Thông tin token:", decoded);
    const user = await User.findById(decoded.oid).populate('role', '_id role_name').exec();
    if (user) {
      return next(); 
    }
  // Trả về mã lỗi 401
  res.status(401).json({ message: 'Unauthorized' });
};

// Xuất middleware và passport
module.exports = { passport, isAuthenticated };