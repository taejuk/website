var mongoose = require("mongoose");
var bcrypt = require("bcrypt");

const { Schema } = mongoose;
const UserSchema = new Schema({
  id: { type: String },
  hashedPassword: { type: String },
  nickname: { type: String },
  communities: [Schema.Types.ObjectId],
  belong: { type: String, enum: ["highschool", "college"] },
  college: { type: String },
  goal: { type: String },
  apply: [Schema.Types.ObjectId],
  accept: [Schema.Types.ObjectId],
  mypost: [Schema.Types.ObjectId],
});

UserSchema.methods.setPassword = async function (password) {
  const hash = await bcrypt.hash(password, 10);
  this.hashedPassword = hash;
};

UserSchema.methods.checkPassword = async function (password) {
  const result = await bcrypt.compare(password, this.hashedPassword);
  return result;
};

UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ id: email });
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
