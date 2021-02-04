router.route('/process/showCookie').get(function (req, res) {
  console.log('/process/showCookie 호출됨');

  res.send(req.cookies);
});

router.route('/process/setUserCookie').get(function (req, res) {
  console.log('/process/setUserCookie 호출됨.');

  res.cookie('user', {
    id: 'mike',
    name: '소녀시대',
    authorized: true,
  });

  res.redirect('/process/showCookie');
});

router.route('/process/product').get(function (req, res) {
  console.log('/process/product 호출됨.');

  if (req.session.user) {
    res.redirect('/product.html');
  } else {
    res.redirect('/login.html');
  }
});

router.route('/process/login').post(function (req, res) {
  console.log('/process/login 호출됨.');

  var paramId = req.body.id || req.query.id;
  var paramPassword = req.body.password || req.query.password;

  if (req.session.user) {
    console.log('이미 로그인되어 상품 페이지로 이동합니다.');

    res.redirect('/product.html');
  } else {
    //세션 저장
    req.session.user = {
      id: paramId,
      name: '소녀시대',
      authorized: true,
    };

    res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
    res.write('<h1>로그인 성공</h1>');
    res.write('<div><p>Param id: ' + paramId + '</p></div>');
    res.write('<div><p>Param Password: ' + paramPassword + '</p></div>');
    res.write("<br><a href='/process/product'>상품 페이지로 이동하기</a>");
    res.end();
  }
});

router.route('/process/logout').get(function (req, res) {});
