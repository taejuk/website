var mongoose = require("mongoose");
var Comment = require("./comments");
const { Schema } = mongoose;

const PostSchema = new Schema({
  author: String,
  board_id: { type: Number, default: 0 },
  community: String,
  title: String,
  body: String,
  date: { type: Date, default: Date.now },
  comments: [Comment],
});

const Post = mongoose.model("Post", PostSchema);

module.exports = Post;
