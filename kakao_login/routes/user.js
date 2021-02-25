const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const User = require("../models/user");
var LocalStrategy = require("passport-local").Strategy;
var router = express.Router();

passport.use(
  "local-login",
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, id, password, done) => {
      User.findOne({ id: id }, async (err, user) => {
        if (err) return done(err);
        if (!user) {
          return done(
            null,
            false,
            req.flash("loginMessage", "등록된 계정이 없습니다.")
          );
        }
        var checked = await user.checkPassword(password);

        if (!checked) {
          return done(
            null,
            false,
            req.flash("loginMessage", "비밀번호가 일치하지 않습니다.")
          );
        }
        return done(null, user);
      });
    }
  )
);

passport.use(
  "local-signup",
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, id, password, done) => {
      var checked = await User.findByEmail(id);
      if (checked) {
        return done(
          null,
          false,
          req.flash("signupMessage", "계정이 이미 있습니다.")
        );
      } else {
        var repassword = req.body.repassword;
        if (password != repassword) {
          return done(
            null,
            false,
            req.flash("signupMessage", "비밀번호가 일치하지 않음.")
          );
        }
        const nickname = req.body.nickname;
        var checknickname = await User.findOne({ nickname: nickname });
        if (checknickname) {
          return done(
            null,
            false,
            req.flash("signupMessage", "이미 존재하는 닉네임입니다.")
          );
        }
        var belong = req.body.belong;
        var communities = [
          req.body.community1,
          req.body.community2,
          req.body.community3,
        ];
        var ids = [];
        for (var i = 0; i < communities.length; i++) {
          if (communities[i] != undefined) {
            boards = await mongoose.connection.db.collection("board");
            var board = await boards.findOne({ name: communities[i] });
            ids.push(board._id);
          }
        }

        var user = new User({
          id: id,
          nickname: nickname,
          belong: belong,
          communities: ids,
        });
        await user.setPassword(password);
        user
          .save()
          .then(() => {
            return done(null, user);
          })
          .catch((e) => {
            console.error(e);
          });
      }
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

router.route("/login").get((req, res) => {
  res.render("login", { message: req.flash("loginMessage") });
});

router.route("/login").post(
  passport.authenticate("local-login", {
    successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.route("/signup").get((req, res) => {
  res.render("signup", { message: req.flash("signupMessage") });
});

router.route("/signup").post(
  passport.authenticate("local-signup", {
    successRedirect: "/setup",
    failureRedirect: "/signup",
    failureFlash: true,
  })
);

router.route("/setup").get(async (req, res) => {
  user_id = req.user;
  var user = await User.findById(user_id);
  res.render("setup", { user: user });
  return;
});

router.route("/setup").post(async (req, res) => {
  user_id = req.user;
  var user = await User.findById(user_id);
  if (user.belong == "highschool") {
    const goal = req.body.goal;
    await User.updateOne({ _id: user_id }, { goal: goal });
  } else if (user.belong == "college") {
    const college = req.body.college;
    await User.updateOne({ _id: user_id }, { college: college });
  }
  req.logout();
  res.redirect("/success_signup");
  return;
});

router.route("/success_signup").get((req, res) => {
  res.render("success_signup");
});
router.route("/home").get((req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  res.render("home");
  return;
});
router.route("/").get((req, res) => {
  if (!req.user) {
    res.redirect("/");
    return;
  }

  if (Array.isArray(req.user)) {
    res.render("home", { user: req.user[0]._doc });
  } else {
    res.render("home", { user: req.user });
  }
});
router.route("/profile/:user_id").get(async (req, res) => {
  var user_id = req.params.user_id;
  var user = await User.findOne({ _id: user_id }, { hashedPassword: false });
  console.log(user);
  res.render("profile", { user: user });
  return;
});
router.route("/logout").get((req, res) => {
  req.logout();
  res.redirect("/");
  return;
});

module.exports = router;
