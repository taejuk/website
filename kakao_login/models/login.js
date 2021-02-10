var mongoose = require("mongoose");
var bcrypt = require("bcrypt");

const { Schema } = mongoose;

const UserSchema = new Schema({
  id: String,
  hashedPassword: String,
  name: String,
  provider: String,
  authToken: String,
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
