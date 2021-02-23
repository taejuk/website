const { number } = require("@hapi/joi");
var mongoose = require("mongoose");

var { Schema } = mongoose;

var Comment = new Schema({
  board_id: Number,
  text: String,
  user_id: String,
  is_deleted: { type: Boolean, default: false },
  create_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = Comment;
