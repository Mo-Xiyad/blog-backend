import bcrypt from "bcrypt";
import mongoose from "mongoose";
import validator from "validator";

const { isEmail } = validator;
const { model, Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    surname: { type: String },
    email: {
      type: String,
      required: true,
      validate: [isEmail, "invalid email"],
      unique: true
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      }
    },
    avatar: { type: String },
    role: { type: String },
    refreshToken: { type: String },
    googleId: {
      type: String,
      required: function () {
        return !this.password;
      }
    }
  },
  { timestamps: true }
);

// this get run every time before it gets saved into the DB "pre" is a mongoose schema method
UserSchema.pre("save", async function (next) {
  // I'm NOT using arrows here because of "this"
  // BEFORE saving the user in database, hash the password
  const newUser = this; // "this" represents the current user I'm trying to save in db
  const plainPw = newUser.password;
  if (newUser.isModified("password")) {
    // only if user is modifying his password field we are going to use some CPU cycles to hash the pw
    const hash = await bcrypt.hash(plainPw, 10);
    newUser.password = hash;
  }
  next();
});

UserSchema.methods.toJSON = function () {
  // this function is called automatically by express EVERY TIME it does res.send()

  const userDocument = this;
  const userObject = userDocument.toObject();
  delete userObject.password; // THIS IS NOT GOING TO AFFECT THE DATABASE
  delete userObject.__v;

  return userObject;
};

UserSchema.statics.checkCredentials = async function (email, plainPw) {
  // 1. find the user by email
  const user = await this.findOne({ email }); // "this" refers to the UserModel

  if (user) {
    // 2. if user its found --> compare plainPw with hashed one
    const isMatch = await bcrypt.compare(plainPw, user.password);
    if (isMatch) {
      // 3. if they match --> return a proper response
      return user;
    } else {
      // 4. if they don't --> return null
      return null;
    }
  } else {
    return null; // also if email is not ok --> return null
  }
};

// usage --> await UserModel.checkCredentials("asd@asd.com", "mypw")

export default model("User", UserSchema);

// subscribersSchema
