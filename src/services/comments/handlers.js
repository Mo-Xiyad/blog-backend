import createHttpError from "http-errors";
import PostModel from "../../db/postSchema.js";

/*
q2m translates something like /books?limit=5&sort=-price&offset=15&price<10&category=fantasy into something that could be directly usable by mongo like
{
  criteria: { price: { '$lt': 10 }, category: 'fantasy' },
  options: { sort: { price: -1 }, skip: 15, limit: 5 }
}
*/

// const getComments = async (req, res, next) => {
//   try {
//     const id = req.params.postId;
//     const post = await PostModel.findById(req.params.postId);
//     if (post) {
//       const postComments = await PostModel.aggregate([
//         {
//           $project: {
//             comments: 1,
//             _id: 1,
//             numberOfComments: {
//               $cond: {
//                 if: { $isArray: "$comments" },
//                 then: { $size: "$comments" },
//                 else: "NA"
//               }
//             }
//           }
//         }
//       ]);
//       const comments = postComments.find((c) => c._id.toString() === id);

//       res.send(comments);
//     } else {
//       next(
//         createHttpError(404, `Post with id ${req.params.postId} not found!`)
//       );
//     }
//   } catch (error) {
//     console.log(error);
//     next(error);
//   }
// };

const getComments = async (req, res, next) => {
  try {
    const id = req.params.postId;
    const post = await PostModel.findById(id).populate({
      path: "comments.author",
      model: "User",
      select: "name avatar"
    });
    if (post) {
      const comments = post.comments;
      res.send(comments);
    } else {
      next(createHttpError(404, `Post with id ${id} not found!`));
    }
  } catch (error) {
    next(error);
  }
};

const createComments = async (req, res, next) => {
  try {
    // 1. Find the post in the Posts Collection by id
    const postToComment = await PostModel.findById(req.params.postId);

    if (postToComment) {
      const postToInsert = {
        ...req.body,
        author: req.user._id
      };
      const updatePostWithComment = await PostModel.findByIdAndUpdate(
        req.params.postId,
        { $push: { comments: postToInsert } },
        { new: true }
      );

      res.send(updatePostWithComment);
    } else {
      next(
        createHttpError(404, `Post with id ${req.params.postId} not found!`)
      );
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getCommentsById = async (req, res, next) => {
  try {
    const post = await PostModel.findById(req.params.postId);
    if (post) {
      const commentWithId = post.comments.find(
        (comment) => comment._id.toString() === req.params.commentId
      );
      if (commentWithId) {
        res.send(commentWithId);
      } else {
        next(
          createHttpError(
            404,
            `Comment with id ${req.params.commentId} not found!`
          )
        );
      }
    } else {
      next(
        createHttpError(404, `Post with id ${req.params.postId} not found!`)
      );
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};
const updateCommentsById = async (req, res, next) => {
  try {
    const post = await PostModel.findById(req.params.postId);
    if (post) {
      const commentIndex = post.comments.findIndex(
        (comment) => comment._id.toString() === req.params.commentId
      );

      if (commentIndex !== -1) {
        post.comments[commentIndex] = {
          ...post.comments[commentIndex].toObject(),
          ...req.body
        };

        await post.save();
        res.status(200).send(post.comments[commentIndex]);
      } else {
        next(
          createHttpError(404, `Post with id ${req.params.postId} not found!`)
        );
      }
    } else {
      next(
        createHttpError(404, `Post with id ${req.params.postId} not found!`)
      );
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};
const deleteCommentsById = async (req, res, next) => {
  try {
    const commentToDelete = await PostModel.findByIdAndUpdate(
      req.params.postId,
      { $pull: { comments: { _id: req.params.commentId } } },
      { new: true }
    );
    if (commentToDelete) {
      res.status(200).send("deleted successfully");
    } else {
      next(
        createHttpError(404, `Post with id ${req.params.postId} not found!`)
      );
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};
const handler = {
  getComments,
  createComments,
  getCommentsById,
  updateCommentsById,
  deleteCommentsById
};
export default handler;
