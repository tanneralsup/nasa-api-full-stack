require('dotenv').config();
const express = require("express");
const app = express();
const models = require('./models');
const bodyParser = require("body-parser");
const session = require("express-session");
var pbkdf2 = require('pbkdf2');
var salt = process.env.SALT_KEY;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

app.use(session({
  secret: "randomtext", 
  resave: false, 
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));

/*  PASSPORT SETUP  */
passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
  models.user.findOne({ where: { id: id } }).then(function (user) {
    cb(null, user);
  });
});

app.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/error'); }
    req.logIn(user, function (err) {
      if (err) { return next(err); }
      console.log(req.user.username)
      return res.redirect(`/success`);
    });
  })(req, res, next);
});

app.get('/success', function (req, res, next) {
  if (req.isAuthenticated()) {
    //req.login();
    res.send("Welcome " + req.user.username + "!!");
    next();
  } else {
    res.send("username and pass not recognized.");
  }
});

app.post("/sign-up", function (req, response) {
  models.user.create({ 
    username: req.body.username, 
    password: encryptionPassword(req.body.password)
  })
    .then(function (user) {
      response.send(user);
    });
});


app.get('/logout', function(req, res) {
  if(req.isAuthenticated()){
    console.log("user logging out");
    req.logOut();
    res.send("user has logged out");
  } else {
    res.send("You don't have a session open");
  }
});

app.get('/error', (req, res) => res.send("wow error logging in"));


/* PASSPORT LOCAL AUTHENTICATION */
passport.use(new LocalStrategy(
  function (username, password, done) {
    models.user.findOne({
      where: {
        username: username
      }
    }).then(function (user) {
      if (!user) {
        return done(null, false);
      }

      if (user.password != encryptionPassword(password)) {
        return done(null, false);
      }
      return done(null, user);
    }).catch(function (err) {
      return done(err);
    });
  }
));

function encryptionPassword(password) {
  var key = pbkdf2.pbkdf2Sync(
    password, salt, 36000, 256, 'sha256'
  );
  var hash = key.toString('hex');

  return hash;
}


app.listen(process.env.PORT, function () {
  console.log('server listening on port ' + 
  process.env.PORT + ' app name = ' + 
  process.env.PROJECT_NAME);
})