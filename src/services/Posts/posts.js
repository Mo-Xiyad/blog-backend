import { v2 as cloudinary } from "cloudinary";
import express from "express";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import q2m from "query-to-mongo";
import PostModel from "../../db/postSchema.js";
import { createPostPdf, estimateReadTime } from "../../lib/helpers.js";

import comments from "../comments/handlers.js";

import { JWTAuthMiddleware } from "../../auth/jwt-Tokens.js";

const blogPostsRouterDB = express.Router();
// ******************   DOWNLOAD POST AS PDF   ******************
blogPostsRouterDB.get("/:postId/download-post-pdf", async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await PostModel.findById(postId, {
      createdAt: 0,
      updatedAt: 0,
      __v: 0,
      _id: 0,
      author: 0
    });

    if (!post) {
      return res.status(404).send({ message: "Post not found." });
    }
    const pdfBuffer = await createPostPdf(post);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=post.pdf");
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
    res.sendStatus({ message: error.message });
  }
});

blogPostsRouterDB.get("/", JWTAuthMiddleware, async (req, res, next) => {
  try {
    // {{local}}/posts?limit=2&offset=2 URL
    const mongoQuery = q2m(req.query);
    const totalPosts = await PostModel.countDocuments(mongoQuery.criteria);
    const post = await PostModel.find(mongoQuery.criteria)
      .limit(mongoQuery.options.limit)
      .skip(mongoQuery.options.skip)
      .sort(mongoQuery.options.sort)
      .populate({ path: "author", select: "avatar name" });
    // .populate({ path: "author", select: "firstName lastName" });
    // populate "path" should be same the FIELD that is in the referenced model
    if (post) {
      res.send({
        links: mongoQuery.links("/posts", totalPosts),
        pageTotal: Math.ceil(totalPosts / mongoQuery.options.limit),
        totalPosts,
        post: post.reverse()
      });
    } else {
      next(
        createHttpError(404, `Post with id ${req.params.postId} not found!`)
      );
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});
blogPostsRouterDB.post("/", JWTAuthMiddleware, async (req, res, next) => {
  try {
    // reading time
    req.body.readTime.value = estimateReadTime(req.body.content);
    const newPost = new PostModel(req.body); // here happens validation of req.body, if it is not ok Mongoose will throw a "ValidationError" (btw user is still not saved in db yet)
    const { _id } = await newPost.save(); // this is the line in which the interaction with the db happens

    res.status(201).send({ _id });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

blogPostsRouterDB.get("/:postId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const id = req.params.postId;
    const post = await PostModel.findById(id, {
      createdAt: 0,
      updatedAt: 0,
      __v: 0
    }).populate("author");
    if (post) {
      res.send(post);
    } else {
      next(createHttpError(404, `Post with id ${id} not found`));
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

blogPostsRouterDB.put("/:postId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const id = req.params.postId;
    const updatePost = await PostModel.findByIdAndUpdate(id, req.body, {
      new: true
    });

    if (updatePost) {
      res.send(updatePost);
    } else {
      next(createHttpError(404, `Post with id ${id} not found`));
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

blogPostsRouterDB.delete(
  "/:postId",
  JWTAuthMiddleware,
  async (req, res, next) => {
    try {
      const id = req.params.postId;
      const deletePost = await PostModel.findByIdAndDelete(id);
      if (deletePost) {
        res.status(204).send();
      } else {
        next(createHttpError(404, `User with id ${id} not found!`));
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

// upload image
// POST PICTURS
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary, // CREDENTIALS, this line of code is going to search in your process.env for something called CLOUDINARY_URL
  params: {
    folder: "CodeCast-blog"
  }
});

blogPostsRouterDB.put(
  "/:postId/uploadImage",
  multer({ storage: cloudinaryStorage }).single("cover"),
  JWTAuthMiddleware,
  async (req, res, next) => {
    try {
      // if no file is uploaded just return the post
      if (!req.file) {
        const post = await PostModel.findById(req.params.postId);
        return res.send(post);
      }
      const imgUrl = req.file.path;
      const id = req.params.postId;
      const updatePost = await PostModel.findByIdAndUpdate(
        id,
        { $set: { cover: imgUrl } },
        {
          new: true
        }
      );
      if (updatePost) {
        res.status(200).send(updatePost);
      } else {
        console.log(res);
      }
      console.log(updatePost);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

blogPostsRouterDB.put(
  "/:postId/likes",
  JWTAuthMiddleware,
  async (req, res, next) => {
    try {
      const id = req.params.postId;
      const post = await PostModel.findById(id);
      if (post) {
        const liked = await PostModel.findOne({
          _id: id,
          likes: new mongoose.Types.ObjectId(req.body.userId)
        });
        if (!liked) {
          await PostModel.findByIdAndUpdate(
            id,
            { $push: { likes: req.body.userId } },
            { new: true }
          );
        } else {
          await PostModel.findByIdAndUpdate(
            id,
            { $pull: { likes: req.body.userId } },
            { new: true }
          );
        }
      } else {
        next(createHttpError(404, `User with id ${id} not found!`));
      }
      res.send(post);
    } catch (error) {}
  }
);

blogPostsRouterDB
  .route("/:postId/comments")
  .get(comments.getComments)
  .post(JWTAuthMiddleware, comments.createComments);

blogPostsRouterDB
  .route("/:postId/comments/:commentId")
  .get(JWTAuthMiddleware, comments.getCommentsById)
  .put(JWTAuthMiddleware, comments.updateCommentsById)
  .delete(JWTAuthMiddleware, comments.deleteCommentsById);

export default blogPostsRouterDB;
