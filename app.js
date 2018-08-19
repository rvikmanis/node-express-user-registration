var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var mysql = require('mysql');
var nodemailer = require('nodemailer');

var mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'zonamailbox2@gmail.com', // generated ethereal user
    pass: 'Aa123456!' // generated ethereal password
  }
});

var indexRouter = require('./routes/index');
var registerRouter = require('./routes/register');

var dbc = mysql.createConnection({
  host: 'YOUR_HOST',
  user: 'YOUR_USER',
  password: 'YOUR_PASS',
  database: 'YOUR_DB'
});

dbc.connect();

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  req.db = dbc;
  req.dbQuery = function (query) {
    return new Promise((resolve, reject) => {
      dbc.query(query, (errors, results) => {
        if (errors) {
          return reject(errors);
        }
        resolve(results)
      })
    })
  }

  req.sendVerificationMail = function (email_address, verification_string) {
    return new Promise((resolve, reject) => {
      let message = `Follow this link to verify your email address:
        http://localhost:3000/register/verify?vs=${verification_string}`

      let mailOptions = {
        from: '"Example" <zonamailbox2@gmail.com>', // sender address
        to: email_address, // list of receivers
        subject: 'Please verify your email address', // Subject line
        text: message, // plain text body
        html: message // html body
      };

      mailer.sendMail(mailOptions, (error, info) => {
        if (error) {
          return reject(error)
        }
        resolve(info)
      });
    })
  }

  next();
})

app.use('/', indexRouter);
app.use('/register', registerRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
