var express = require("express");
var router = express.Router();
var User = require("../models/user");
router.route("/chat").all(async (req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  var user = await User.findById(req.user);
  res.render("chat", { nickname: user.nickname });
  return;
});

module.exports = router;
