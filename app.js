//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const md5 = require("md5");
//const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
//mongoose.set("useCreateIndex", true);//to deal with the deprication warning after introducing passportLocalMongoose

const userSchema = new mongoose.Schema ({
  fistname: String,
  lastname: String,
  googleID: String

});

userSchema.plugin(passportLocalMongoose);
//passportLocalMongoose is what we are going to use to hash our passwords and salt them and save our users to mongodb
//
userSchema.plugin(findOrCreate);

//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);
//Now we will create strategy (passportLocalMongoose) , will take care of serialise and deserealise .
passport.use(User.createStrategy());

//This one is a local approach
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//This one is a global approach! it's preferred to use this always, to be safe
passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, none){
  User.findById(id, function(err, user){
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  //this last line will help you if the google+ api deprecates!
 },
 function(accessToken, refreshToken, profile, cb){
   console.log(profile);
   User.findOrCreate({googleID: profile.id}, function(err,user){
     return cb(err, user);
   });
 }
));



app.get("/", function(req,res){
  res.render("home");
});

app.get("/auth/google", passport.authenticate('google', {scope: ["profile"]}));
//This above line helps us to get to the sign-in with google page.

app.get("/auth/google/secrets",
  passport.authenticate('google', {failureRedirect: "/login"}),
  function(req,res){
    res.redirect("/secrets");
  });

app.get("/login", function(req,res){
  res.render("login");
});

app.get("/register", function(req,res){
  res.render("register");
});

app.get("/secrets", function(req,res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }
    else{
      if(foundUsers){
        res.render("secrets", {userWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", function(req,res){
  if(req.isAunthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});

// document.querySelector(".sound").addEventListener("click", function(){
//   var audio = new Audio("public/sounds/1649505541152-voicemaker.in-speech.mp3");
//   audio.play();
// })

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req,res){
  // const newUser = new User({
  //   email: req.body.username,
  //   password: md5(req.body.password)
  // });
  //
  // newUser.save(function(err){
  //   if(err){
  //     console.log(err);
  //   }
  //   else{
  //     res.render("secrets");
  //   }
  // });
  User.register({username: req.body.firstname}, req.body.lastname, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");

      });
    }
  });
});

app.post("/login", function(req,res){
  // const username = req.body.username;
  // const password = req.body.password;
  //
  // User.findOne({email: username}, function(err, foundUser){
  //   if(err){
  //     console.log(err);
  //   }
  //   else{
  //     if(foundUser){
  //       if(foundUser.password === password){
  //         res.render("secrets");
  //
  //       }
  //     }
  //   }
  // });
  const user = new User({
    firstname: req.body.firstname,
    lastname: req.body.lastname
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});





app.listen(3000, function(){
  console.log("Server ready bro");
});
