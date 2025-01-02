require('../utils/MongooseUtil');
const passport = require('passport');
const MicrosoftStrategy = require('passport-microsoft').Strategy
const User = require('../models/User');
const dotenv = require('dotenv');

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
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); 
  }
  console.log('User not authenticated, returning 401...');

  // Trả về mã lỗi 401
  res.status(401).json({ message: 'Unauthorized' });
};

// Xuất middleware và passport
module.exports = { passport, isAuthenticated };