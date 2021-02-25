require("dotenv").config();
var express = require("express");
var http = require("http");
var static = require("serve-static");
var path = require("path");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var expressSession = require("express-session")({
  secret: "my key",
  resave: false,
  saveUninitialized: true,
});
var errorHandler = require("errorhandler");
var mongoose = require("mongoose");
var expressErrorHandler = require("express-error-handler");
var socketio = require("socket.io")();
var cors = require("cors");
var sharedsession = require("express-socket.io-session");
var passport = require("passport");
var flash = require("connect-flash");
var User = require("./models/user");

var app = express();
var router = express.Router();
var loginrouter = require("./routes/user");
var boardrouter = require("./routes/community");
var mentorrouter = require("./routes/mentor");
var chatrouter = require("./routes/chat");
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
app.use(expressSession);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use("/", static(path.join(__dirname, "public")));
router.route("/").get((req, res) => {
  res.render("index");
});
app.use(cors());
app.use("/", router);
app.use(loginrouter);
app.use(boardrouter);
app.use(mentorrouter);
app.use(chatrouter);
var errorHandler = expressErrorHandler({
  static: {
    404: "./public/404.html",
  },
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);
var server = http.createServer(app).listen(app.get("port"), function () {
  console.log(`${app.get("port")}로 시작되었습니다.`);
});

var io = socketio.listen(server);
console.log("socket.io 요청을 받아들일 준비가 되었습니다.");

//응답을 해서 클라이언트 쪽으로 전송하는 것.
io.use(sharedsession(expressSession));
var login_ids = {};

function getRoomList(cur_user) {
  var roomList = [];
  var rooms = io.sockets.adapter.sids;
  var user = login_ids[cur_user];

  for (let [key, value] of rooms) {
    if (user == key) {
      value.forEach(function (room) {
        if (room != user) {
          roomList.push(room);
        }
      });
    }
  }
  console.log(user, ": ", roomList);
  return roomList;
}
io.sockets.on("connection", async function (socket) {
  //socket: 클라이언트에서 이벤트 발생시킨 객체라고 보면 된다.
  const { user } = socket.handshake.session.passport;
  console.log("user_id: ", user);
  var cur_user = await User.findById(user, { hashedPassword: false });
  login_ids[user] = socket.id;
  socket.login_id = user;
  console.log("login ids: ", login_ids);
  console.log(`connection info: ${socket.request.connection._peername}`);

  socket.remoteAddress = socket.request.connection._peername.address;
  socket.remotePort = socket.request.connection._peername.port;

  socket.on("message", async function (message) {
    console.log("message 이벤트를 받았습니다.");
    console.dir(message);
    message["sender"] = cur_user.nickname;
    var recepient_user = await User.findOne({ nickname: message.recepient });

    if (message.recepient == "ALL") {
      console.log("나를 포함한 모든 클라이언트에게 message 이벤트 전송합니다.");
      io.sockets.emit("message", message);
    } else {
      if (message.command == "chat") {
        if (login_ids[recepient_user._id]) {
          io.to(login_ids[recepient_user._id]).emit("message", message);
        } else {
          console.log("id를 찾을 수 없습니다.");
        }
      } else if (message.command == "groupchat") {
        io.sockets.in(message.recepient).emit("message", message);
      }
    }
  });
  socket.on("room", function (room) {
    console.log("room 이벤트를 받았습니다.");
    console.dir(room);

    if (room.command == "create") {
      if (io.sockets.adapter.rooms.get(room.roomId)) {
        console.log("방은 이미 만들어져 있습니다.");
      } else {
        console.log("방을 새로 만듭니다.");
        socket.join(room.roomId); //join: 방이 있으면 입장, 없으면 방을 새로 만든다.
        var curRoom = io.sockets.adapter.rooms.get(room.roomId);
        curRoom.id = room.roomId;
        curRoom.name = room.roomName;
        curRoom.owner = cur_user.nickname;
      }
    } else if (room.command == "update") {
      var curRoom = io.sockets.adapter.rooms.get(room.roomId);
      if (curRoom.owner == cur_user.nickname) {
        curRoom.id = room.roomId;
        curRoom.name = room.roomName;
        curRoom.owner = cur_user.nickname;
      } else {
        console.log("owner만 변경할 수 있습니다.");
      }
    } else if (room.command == "delete") {
      socket.leave(room.roomId);
      if (io.sockets.adapter.rooms.get(room.roomId)) {
        delete io.sockets.adapter.rooms[room.roomId];
      } else {
        console.log("방이 만들어져 있지 않습니다.");
      }
    } else if (room.command == "join") {
      console.log("방 입장을 시도합니다.");
      socket.join(room.roomId);
    } else if (room.command == "leave") {
      socket.leave(room.roomId);
    }
    var roomList = getRoomList(user);

    var output = { command: "list", rooms: roomList };
    console.log("클라이언트로 보낼 데이터: " + JSON.stringify(output));
    io.emit("room", output);
    console.dir(io.sockets.adapter.sids);
  });
});
