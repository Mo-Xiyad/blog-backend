import mongoose from "mongoose";
import validator from "validator";

const { isEmail } = validator;
const { model, Schema } = mongoose;
const SubscriberSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      validate: [isEmail, "invalid email"],
      unique: true
    }
  },
  { timestamps: true }
);
export const Subscriber = model("Subscriber", SubscriberSchema);
