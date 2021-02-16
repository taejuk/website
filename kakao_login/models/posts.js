var mongoose = require("mongoose");

const { Schema } = mongoose;

const PostSchema = new Schema({
  author: String,
  board_id: { type: Number, default: 0 },
  title: String,
  body: String,
  date: { type: Date, default: Date.now },
  comments: { type: Object },
});

const Post = mongoose.model("Post", PostSchema);

module.exports = Post;
