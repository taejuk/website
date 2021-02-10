const { number } = require("@hapi/joi");
var mongoose = require("mongoose");

var { Schema } = mongoose;

var CommentSchema = Schema({
  board_id: Number,
  depth: { type: Number, default: 0 },
  bundle_id: { type: Number, default: 0 },
  text: String,
  user_id: String,
  is_deleted: { type: Boolean, default: false },
  create_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

var Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;
