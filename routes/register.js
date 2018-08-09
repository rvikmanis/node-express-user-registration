var express = require('express');
var form = require('express-form');
var randomstring = require("randomstring");
var field = form.field;
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.render('register', { errors: "", input: {} });
});

var registrationForm = form(
  field("username").trim().required().is(/^[a-zA-Z0-9]+$/),
  field("password").trim().required().is(/^.+$/),
  field("email").required().trim().isEmail()
);

router.get('/verify', function (req, res, next) {
  var verification_string = req.query.vs;
  req.db.query(`
    SELECT * FROM users WHERE verification_string = ${req.db.escape(verification_string)}
  `, function (errors, results) {
      if (errors) {
        next();
      } else {
        req.db.query(
          `UPDATE users SET verified = '1' WHERE id = ${req.db.escape(results[0].id)}`,
          function (errors) {
            if (errors) {
              res.send(JSON.stringify(errors));
            } else {
              res.render('verified');
            }
          }
        )
      }
    })
})

router.post("/", registrationForm, function (req, res, next) {
  if (req.form.isValid) {
    var verification_string = randomstring.generate();
    req.db.query(`
      INSERT INTO
        users (
          username, 
          email, 
          password,
          verification_string
        )
        VALUES (
          ${req.db.escape(req.form.username)},
          ${req.db.escape(req.form.email)},
          ${req.db.escape(req.form.password)},
          ${req.db.escape(verification_string)}
        )
    `, function (errors, results) {
        if (!errors) {
          let message = `Follow this link to
          verify your email address: http://localhost:3000/register/verify?vs=${verification_string}`

          let mailOptions = {
            from: '"Example" <zonamailbox2@gmail.com>', // sender address
            to: req.form.email, // list of receivers
            subject: 'Please verify your email address', // Subject line
            text: message, // plain text body
            html: message // html body
          };

          req.mailer.sendMail(mailOptions, (error, info) => {
            if (error) {
              res.render('register', {
                input: {},
                errors: JSON.stringify(error)
              })
            } else {
              res.render('success')
            }
          });
        } else {
          res.render('register', {
            input: {},
            errors: JSON.stringify(errors)
          })
        }
      })
  } else {
    res.render('register', {
      errors: JSON.stringify(req.form.errors),
      input: req.form
    })
  }
})

module.exports = router;
