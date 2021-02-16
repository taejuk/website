const express = require("express");
const Joi = require("@hapi/joi");
const Post = require("../models/posts");
const Comment = require("../models/comments");

var router = express.Router();

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
  res.render("post", { post: post, user: req.user.id });
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
  res.render("post", { post: post, user: req.user.id });
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
  const post = await Post.findOne({ board_id: board_id });
  const length = post.comments.length;
  var comment = {
    comment_id: length,
    text: text,
    user_id: user_id,
  };
  await Post.updateOne(
    { board_id: board_id },
    { $push: { comments: comment } }
  );
  res.render("post", { post: post, user: req.user.id });
});
router.route("/recomment/:id");
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
