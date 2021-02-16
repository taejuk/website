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

var passport = require("passport");
var flash = require("connect-flash");

var app = express();
var router = express.Router();
var loginrouter = require("./routes/login");
var boardrouter = require("./routes/board");
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
app.use("/", static(path.join(__dirname, "public")));
router.route("/").get((req, res) => {
  res.render("index");
});

app.use("/", router);
app.use("/", loginrouter);
app.use("/", boardrouter);
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
