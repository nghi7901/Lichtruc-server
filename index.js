const express = require('express');
const session = require('express-session');
const app = express();
const router = express.Router()
const PORT = process.env.PORT || 3000;
const cors = require('cors');
const { passport } = require('./middlewares/auth.js');
const dotenv = require('dotenv');

dotenv.config();

app.use(cors({
    origin: `${process.env.CLIENT_URL}`, 
    credentials: true,
    optionsSuccessStatus: 200 
}));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
  }));
  

  app.use(passport.initialize());
  app.use(passport.session());
  
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// apis
app.use('/api/accounts', require('./routes/accounts.js'));
app.use('/api/open-attendance', require('./routes/open-attendance.js'));
app.use('/api/users', require('./routes/users.js'));
app.use('/api', require('./routes/accounts.js')); 
app.use('/api/register-schedule', require('./routes/register-schedule.js')); 
app.use('/api/oncall-schedule', require('./routes/oncall-schedule.js')); 
app.use('/api/request-schedule', require('./routes/request-schedule.js')); 
app.use('/api/statistics', require('./routes/statistics.js')); 
