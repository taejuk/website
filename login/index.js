require('dotenv').config();

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var static = require('serve-static');
var path = require('path');
var auth = require('./auth');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');

function generateToken(email, uid) {
  const token = jwt.sign(
    {
      email: email,
      uid: uid,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    },
  );
  return token;
}

var app = express();
var router = express.Router();

app.set('port', process.env.PORT || 3000);

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(cookieParser());

app.use('/', static(path.join(__dirname, '')));

router.route('/process/signup/').post(function (req, res) {
  var id = req.body.id || req.params.id;
  var password = req.body.password || req.params.password;

  auth.signUpWithEmailPasswoerd(id, password);
  const token = generateToken(id);
  res.cookie(
    'access_token',
    {
      token,
    },
    {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
    },
  );

  res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
  res.write('<p>토큰 전달 완료</p>');
  res.end();
});
router.route('/process/login/').post(function (req, res) {
  const id = req.body.id;
  const password = req.body.password;

  auth
    .signInWithEmailPassword(id, password)
    .then((user) => {
      const uid = user['user']['uid'];
      const token = generateToken(id, uid);
      res.cookie(
        'access_token',
        {
          token,
        },
        {
          maxAge: 1000 * 60 * 60 * 24 * 7,
          httpOnly: true,
        },
      );

      res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
      res.write('<a href = "/process/logout">로그아웃</a>');
      res.write('<br />');
      res.write('<a href="/process/product">상품 보기</a>');
      res.end();
    })
    .catch((error) => {
      console.log(error);
      res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
      res.write('<div>로그인 실패</div>');
      res.end();
    });
});
router.route('/process/product').get(function (req, res) {
  const token = req.cookies['access_token'];
  if (!token) {
    console.log('token이 없습니다.');
    res.redirect('/login.html');
    return;
  }
  try {
    const decoded = jwt.verify(token['token'], process.env.JWT_SECRET);
    res.redirect('/product.html');
  } catch (e) {
    console.error(e);
  }
});
router.route('/process/logout').get(function (req, res) {
  res.clearCookie('access_token');
  res.redirect('/login.html');
});

app.use('/', router);

http.createServer(app).listen(app.get('port'), function () {
  console.log('익스프레스 서버를 시작했습니다.');
});
