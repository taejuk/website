require("dotenv").config();
var express = require("express");
var http = require("http");
var static = require("serve-static");
var path = require("path");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var expressSession = require("express-session");
var errorHandler = require("errorhandler");
var mongoose = require("mongoose");
var expressErrorHandler = require("express-error-handler");
var Joi = require("@hapi/joi");
var User = require("./models/login");
var Post = require("./models/posts");
var Comment = require("./models/comments");
var passport = require("passport");
var flash = require("connect-flash");
var LocalStrategy = require("passport-local").Strategy;
const KakaoStrategy = require("passport-kakao").Strategy;
var app = express();
var router = express.Router();

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((e) => {
    console.error(e);
  });

app.set("port", process.env.PORT || 3000);

app.use(bodyParser.urlencoded({ extended: false }));

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  expressSession({
    secret: "my key",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

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

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.use("/", static(path.join(__dirname, "public")));

router.route("/").get((req, res) => {
  res.render("index");
});
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

router.route("/createPost").get((req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  res.render("createPost", { error: "" });
  return;
});
router.route("/createPost").post(async (req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  var { title, body } = req.body;
  var schema = Joi.object().keys({
    title: Joi.string().required(),
    body: Joi.string().required(),
  });
  const result = schema.validate({ title: title, body: body });
  if (result.error) {
    res.render("createPost", { error: "내용을 입력해주세요" });
    return;
  }
  const lastPost = await Post.find().sort({ board_id: -1 });
  var lastId = 0;
  if (lastPost.length == 0) {
    var post = new Post({
      author: req.user.id,
      title: title,
      body: body,
    });
    await post.save();
    res.redirect("/postList");
    return;
  } else {
    lastId = lastId + lastPost[0].board_id;
    console.log("last:", lastId);
    var post = new Post({
      author: req.user.id,
      title: title,
      body: body,
      board_id: lastId + 1,
    });
    await post.save();
    res.redirect("/postList");
    return;
  }
});

router.route("/postList").get(async (req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  var posts = await Post.find().sort({ date: -1 });
  res.render("postList", { posts: posts });
  return;
});

router.route("/postList/:id").get(async (req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  var board_id = req.params.id;
  const post = await Post.findOne({ board_id: board_id });
  if (!post) {
    res.status(404).render("error", { error: "게시물이 존재하지 않습니다." });
    return;
  }
  var comments = await Comment.find({ board_id: board_id, is_deleted: false });
  res.render("post", { post: post, user: req.user.id, comments: comments });
});

router.route("/modifyPost/:id").get(async (req, res) => {
  const board_id = req.params.id;
  const post = await Post.findOne({ board_id: board_id });
  console.log("post:", post);
  if (!post) {
    res.status(404).render("error", { error: "게시물이 존재하지 않습니다." });
    return;
  }
  res.render("modifyPost", { post: post });
});

router.route("/modifyPost/:id").post(async (req, res) => {
  const board_id = req.params.id;
  const post = await Post.findOne({ board_id: board_id });
  if (!req.user || req.user.id != post.author) {
    res.redirect("/login");
    return;
  }
  if (!post) {
    res.status(404).render("error", { error: "게시물이 존재하지 않습니다." });
    return;
  }
  await Post.updateOne(post, { title: req.body.title, body: req.body.body });
  var comments = await Comment.find({ board_id: board_id });
  res.render("post", { post: post, user: req.user.id, comments: comments });
  return;
});
router.route("/comment/:id").post(async (req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  var board_id = req.params.id;
  var text = req.body.comment;
  var user_id = req.user.id;
  var lastComment = await Comment.find({ board_id: board_id }).sort({
    bundle_id: -1,
  });
  if (lastComment.length == 0) {
    var comment = new Comment({
      board_id: board_id,
      user_id: user_id,
      text: text,
    });
    await comment.save();

    res.redirect(`/postList/${board_id}`);
    return;
  } else {
    var bundle_id = lastComment[0].bundle_id + 1;
    var comment = new Comment({
      board_id: board_id,
      user_id: user_id,
      text: text,
      bundle_id: bundle_id,
    });
    await comment.save();
    res.redirect(`/postList/${board_id}`);
    return;
  }
});
router.route("/comment/delete/:id").get(async (req, res) => {
  var id = req.params.id;
  var comment = await Comment.findById(id);
  console.log(comment);
  await Comment.updateOne(comment, { is_deleted: true });
  res.redirect(`/postList/${comment.board_id}`);
  return;
});
app.use("/", router);

var errorHandler = expressErrorHandler({
  static: {
    404: "./public/404.html",
  },
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);
http.createServer(app).listen(app.get("port"), function () {
  console.log(`${app.get("port")}로 시작되었습니다.`);
});
