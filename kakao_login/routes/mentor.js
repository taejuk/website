var express = require("express");
var router = express.Router();
var User = require("../models/user");

router.route("/findmentor").get(async (req, res) => {
  var user_id = req.user;
  var user = await User.findOne({ _id: user_id });
  var college = user.goal;
  var mentors = await User.find({ college: college });
  res.render("mentorlist", { mentors: mentors });
  return;
});
router.route("/applymentees").get(async (req, res) => {
  var mentor_id = req.user;
  var mentor = await User.findById(mentor_id);
  var mentee_ids = mentor.apply;
  var mentees = [];
  for (var i = 0; i < mentee_ids.length; i++) {
    var mentee = await User.findById(mentee_ids[i]);
    mentees.push(mentee);
  }
  res.render("menteelist", { mentees: mentees });
  return;
});
router.route("/apply/:mentor_id").get(async (req, res) => {
  var user_id = req.user;
  var mentor_id = req.params.mentor_id;

  await User.updateOne({ _id: user_id }, { $push: { apply: mentor_id } });

  await User.updateOne({ _id: mentor_id }, { $push: { apply: user_id } });

  res.redirect("/profile");
  return;
});
router.route("/accept/:mentee_id").get(async (req, res) => {
  var mentee_id = req.params.mentee_id;
  var mentor_id = req.user;

  await User.updateOne({ _id: mentee_id }, { $push: { accept: mentor_id } });
  await User.updateOne({ _id: mentor_id }, { $push: { accept: mentee_id } });
  res.redirect("/profile");
  return;
});

module.exports = router;
