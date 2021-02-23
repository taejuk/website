var mongoose = require("mongoose");
var Comment = require("./comments");
const { Schema } = mongoose;

const PostSchema = new Schema({
  author: String, //user의 nicknamedmfh 설정
  board_id: { type: Number, default: 0 },
  title: String,
  body: String,
  date: { type: Date, default: Date.now },
  comments: [Comment],
});

const Post = mongoose.model("Post", PostSchema);

module.exports = Post;
