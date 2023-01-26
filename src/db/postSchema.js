import mongoose from "mongoose";
const { Schema, model } = mongoose;

const comment = new Schema(
  {
    text: { type: String, required: true },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

const postSchema = new Schema(
  {
    category: { type: String },
    title: { type: String, required: true },
    cover: { type: String },
    readTime: {
      type: Object,
      required: false,
      nested: {
        value: {
          type: Number,
          required: true
        },
        unit: {
          type: String,
          default: "minutes"
        }
      }
    },
    author: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },
    content: { type: String, required: true },
    comments: {
      type: [comment]
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true // adds and manage createdAt and updatedAt fields
  }
);

export default model("Post", postSchema);
