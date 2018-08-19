var express = require('express');
var form = require('express-form');
var randomstring = require("randomstring");
var field = form.field;
var router = express.Router();

var registrationForm = form(
  field("username").trim().required().is(/^[a-zA-Z0-9]+$/),
  field("password").trim().required().is(/^.+$/),
  field("email").required().trim().isEmail()
);

router.get('/', function (req, res, next) {
  res.render('register', { errors: "", input: {} });
});

router.post("/", registrationForm, async function (req, res, next) {
  try {
    if (!req.form.isValid) {
      throw req.form.errors
    }
    var verification_string = randomstring.generate();
    await req.dbQuery(`
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
    `)
    await req.sendVerificationMail(req.form.email, verification_string)
    res.render('success', { heading: "Registration successful" });
  }
  catch (e) {
    res.render('register', {
      errors: JSON.stringify(e),
      input: req.form
    })
  }
})

router.get('/update-email', function (req, res, next) {
  res.render('update-email', { errors: "", input: {} });
});

router.post("/update-email", registrationForm, async function (req, res, next) {
  try {
    if (!req.form.isValid) {
      throw req.form.errors
    }
    var verification_string = randomstring.generate();

    var results = await req.dbQuery(`
      SELECT * FROM users
        WHERE username = ${req.db.escape(req.form.username)}
          AND password = ${req.db.escape(req.form.password)}
    `)
    if (!results[0]) {
      throw "Invalid username or password"
    }

    await req.dbQuery(`
      UPDATE users
        SET
          email = ${req.db.escape(req.form.email)},
          verified = '0',
          verification_string = ${req.db.escape(verification_string)}
        WHERE id = ${req.db.escape(results[0].id)}
    `)
    await req.sendVerificationMail(req.form.email, verification_string)
    res.render('success', { heading: "Email address updated" });
  }
  catch (e) {
    res.render('update-email', {
      errors: JSON.stringify(e),
      input: req.form
    })
  }
})

router.get('/verify', async function (req, res, next) {
  try {
    var verification_string = req.query.vs;
    var results = await req.dbQuery(`
      SELECT * FROM users WHERE verification_string = ${req.db.escape(verification_string)}
    `)
    if (!results[0]) {
      throw "Invalid verification string"
    }
    await req.dbQuery(
      `UPDATE users SET verified = '1' WHERE id = ${req.db.escape(results[0].id)}`,
    )
    res.render('verified');
  }
  catch (e) {
    res.send(JSON.stringify(e))
  }
})

module.exports = router;
