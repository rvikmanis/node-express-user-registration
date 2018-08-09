var express = require('express');
var form = require('express-form');
var randomstring = require("randomstring");
var field = form.field;
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.render('update-email', { errors: "", input: {} });
});

var registrationForm = form(
  field("username").trim().required().is(/^[a-zA-Z0-9]+$/),
  field("password").trim().required().is(/^.+$/),
  field("email").required().trim().isEmail()
);

router.post("/", registrationForm, function (req, res, next) {
  if (req.form.isValid) {
    var verification_string = randomstring.generate();
    req.db.query(`
      SELECT * FROM users
        WHERE username = ${req.db.escape(req.form.username)}
          AND password = ${req.db.escape(req.form.password)}
    `, function (errors, results) {
        if (errors || !results[0]) {
          if (!results[0]) {
            errors = 'Invalid username or password';
          }

          res.render('update-email', {
            errors: JSON.stringify(errors),
            input: req.form
          })
        } else {

          // AA
          req.db.query(`
            UPDATE users
              SET
                email = ${req.db.escape(req.form.email)},
                verified = '0',
                verification_string = ${req.db.escape(verification_string)}
              WHERE id = ${req.db.escape(results[0].id)}
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
                    res.render('update-email', {
                      input: {},
                      errors: JSON.stringify(error)
                    })
                  } else {
                    res.render('success')
                  }
                });
              } else {
                res.render('update-email', {
                  input: {},
                  errors: JSON.stringify(errors)
                })
              }
            })
          // aa

        }
      })
  } else {
    res.render('update-email', {
      errors: JSON.stringify(req.form.errors),
      input: req.form
    })
  }
})

module.exports = router;
