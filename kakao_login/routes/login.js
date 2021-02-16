const express = require("express");
const passport = require("passport");
const Joi = require("@hapi/joi");
const User = require("../models/login");
var LocalStrategy = require("passport-local").Strategy;
const KakaoStrategy = require("passport-kakao").Strategy;
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
        var user = new User({ id: id });
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
passport.use(
  "kakao",
  new KakaoStrategy(
    {
      clientID: "ed7f08e287c41fcc26080f6b33ddebe5",
      callbackURL: "/auth/kakao/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      var schema = Joi.object().keys({
        _id: Joi.object().required(),
        id: Joi.string().required(),
        name: Joi.string().required(),
        provider: Joi.string().required(),
        authToken: Joi.string().required(),
      });
      var user = new User({
        id: String(profile.id),
        name: profile.username,
        provider: "kakao",
        authToken: accessToken,
      });
      const result = schema.validate(user._doc);
      if (result.error) {
        done(result.error, null);
      }
      var checked = await User.findOne({ id: user.id });
      if (checked) {
        await User.updateOne(checked, { authToken: accessToken });
        return done(null, user);
      }
      user.save(function (err) {
        return done(err, user);
      });
      return done(null, user);
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
router.route("/auth/kakao").get(
  passport.authenticate("kakao", {
    successRedirect: "/profile",
    failureRedirect: "/login",
    failureFlash: true,
  })
);
router.get(
  "/auth/kakao/callback",
  passport.authenticate("kakao", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/profile");
  }
);

router.route("/login").get((req, res) => {
  res.render("login", { message: req.flash("loginMessage") });
});

router.route("/login").post(
  passport.authenticate("local-login", {
    successRedirect: "/profile",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.route("/signup").get((req, res) => {
  res.render("signup", { message: req.flash("signupMessage") });
});

router.route("/signup").post(
  passport.authenticate("local-signup", {
    successRedirect: "/profile",
    failureRedirect: "/signup",
    failureFlash: true,
  })
);
router.route("/profile").get((req, res) => {
  if (!req.user) {
    res.redirect("/");
    return;
  }

  if (Array.isArray(req.user)) {
    res.render("profile", { user: req.user[0]._doc });
  } else {
    res.render("profile", { user: req.user });
  }
});
router.route("/logout").get((req, res) => {
  req.logout();
  res.redirect("/");
  return;
});

module.exports = router;
