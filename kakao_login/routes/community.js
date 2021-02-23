const express = require("express");
const Joi = require("@hapi/joi");
const Post = require("../models/posts");
const User = require("../models/user");

var router = express.Router();

router.route("/communityList").get((req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  res.render("communities");
  return;
});

router.route("/createPost/:name").get((req, res) => {
  const community = req.params.name;
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  res.render("createPost", { error: "", community: community });
  return;
});
router.route("/createPost/:name").post(async (req, res) => {
  const community = req.params.name;
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
      community: community,
    });
    await post.save();
    res.redirect(`/listPost/${community}`);
    return;
  } else {
    lastId = lastId + lastPost[0].board_id;
    console.log("last:", lastId);
    var post = new Post({
      author: req.user.id,
      title: title,
      body: body,
      board_id: lastId + 1,
      community: community,
    });
    await post.save();
    res.redirect(`/listPost/${community}`);
    return;
  }
});

router.route("/listPost/:name").get(async (req, res) => {
  const community = req.params.name;
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  var posts = await Post.find({ community: community }).sort({ date: -1 });
  res.render("postList", { posts: posts, community: community });
  return;
});

router.route("/listPost/:name/:id").get(async (req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  var board_id = req.params.id;
  var community = req.params.name;
  const post = await Post.findOne({ board_id: board_id });
  if (!post) {
    res.status(404).render("error", { error: "게시물이 존재하지 않습니다." });
    return;
  }
  res.render("post", { post: post, user: req.user.id, community: community });
});

router.route("/modifyPost/:name/:id").get(async (req, res) => {
  const board_id = req.params.id;
  const community = req.params.name;
  const post = await Post.findOne({ board_id: board_id });
  if (!post) {
    res.status(404).render("error", { error: "게시물이 존재하지 않습니다." });
    return;
  }
  res.render("modifyPost", { post: post, community: community });
  return;
});

router.route("/modifyPost/:name/:id").post(async (req, res) => {
  const board_id = req.params.id;
  const community = req.params.name;
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
  res.render("post", { post: post, user: req.user.id, community: community });
  return;
});
router.route("/comment/:name/:id").post(async (req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  var community = req.params.name;
  var board_id = req.params.id;
  var text = req.body.comment;
  var user_id = req.user.id;
  //  const post = await Post.findOne({ board_id: board_id });
  var comment = {
    board_id: board_id,
    user_id: user_id,
    text: text,
  };

  await Post.updateOne(
    { board_id: board_id },
    { $push: { comments: comment } }
  );
  res.redirect(`/listPost/${community}/${board_id}`);
  return;
});
router
  .route("/recomment/:name/:board_id/:comment_id")
  .post(async (req, res) => {
    const text = req.body.recomment;
    const board_id = req.params.board_id;
    const comment_id = req.params.comment_id;
    const community = req.params.name;
    var user = await User.findById(req.user);
    const recomment = {
      comment_id: comment_id,
      text: text,
      nickname: user.nickname,
    };
    (await Post.find({ board_id: board_id })).forEach(function (post) {
      post.comments.forEach(async function (comment) {
        if (comment._id == comment_id) {
          comment.recomment.push(recomment);
        }
      });
      post.save();
    });
    res.redirect(`/listPost/${community}/${board_id}`);
    return;
  });
/*
router.route("/comment/delete/:id").get(async (req, res) => {
  var id = req.params.id;
  var comment = await Comment.findById(id);
  console.log(comment);
  await Comment.updateOne(comment, { is_deleted: true });
  res.redirect(`/postList/${comment.board_id}`);
  return;
});
*/
module.exports = router;
