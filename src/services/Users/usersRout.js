import { v2 as cloudinary } from "cloudinary";
import express from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import passport from "passport";
import { adminOnlyMiddleware } from "../../auth/admin.js";
import { JWTAuthMiddleware } from "../../auth/jwt-Tokens.js";
import {
  JWTAuthenticate,
  verifyJWT,
  verifyRefreshAndGenerateTokens,
  verifyRefreshToken
} from "../../auth/jwtTools.js";
import UserModel from "../../db/usersSchema.js";
import { authorsValidationMiddleware } from "./validation.js";

const usersRouterDB = express.Router();

const anotherLoggerMiddleware = (req, res, next) => {
  console.log(`Another thing -- ${new Date()}`);
  next();
};

// 1.
usersRouterDB.post("/", authorsValidationMiddleware, async (req, res, next) => {
  try {
    const errorsList = validationResult(req);

    if (!errorsList.isEmpty) {
      next(createHttpError(400, { errorsList }));
    } else {
      const newUser = new UserModel(req.body);
      const { _id } = await newUser.save();
      res.status(201).send({ _id });
    }
  } catch (error) {
    console.log(error);
    next(createHttpError(400, { errorsList }));
  }
});

// 2.
usersRouterDB.get("/", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const users = await UserModel.find();
    res.send(users);
  } catch (error) {
    next(createHttpError(400));
  }
});

usersRouterDB.get("/me", JWTAuthMiddleware, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (error) {
    next(error);
  }
});

usersRouterDB.get(
  "/googleLogin",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })
); // This endpoint receives Google Login requests from our FE, and it is going to redirect them to Google Consent Screen

usersRouterDB.get(
  "/googleRedirect",
  passport.authenticate("google"),
  async (req, res, next) => {
    // This endpoint URL needs to match EXACTLY to the one configured on google.cloud dashboard
    try {
      // Thanks to passport.serialize we are going to receive the tokens in the request
      // TODO: Not safe but for now this works
      res.redirect(
        `${process.env.FE_LOCAL_URL}?accessToken=${req.user.tokens.accessToken}&refreshToken=${req.user.tokens.refreshToken}`
      );
    } catch (error) {
      next(error);
    }
  }
);

// 3.
usersRouterDB.get("/:userId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.userId, {
      __v: 0 //this second parameter is projecting what not to show
    });
    if (user) {
      res.send(user);
    } else {
      next(
        createHttpError(
          404,
          "Please provide credentials in the Authorization header!"
        )
      );
    }
  } catch (error) {
    next(
      createHttpError(
        404,
        `User with id ${req.params.userId} not found or not allowed to access!`
      )
    );
    // Errors that happen here need to be 500 errors (Generic Server Error)
  }
});

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary, // this line of code is going to search in your process.env for something called CLOUDINARY_URL
  params: {
    folder: "CodeCast-blog"
  }
});
const upload = multer({ storage: cloudinaryStorage });
usersRouterDB.put(
  "/me",
  JWTAuthMiddleware,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const user = await UserModel.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let avatar = null;

      if (req.file) {
        avatar = req.file.path;
      }
      // Update user name and avatar
      user.name = req.body?.name ? req.body?.name : user.name;
      user.avatar = avatar;

      // Save updated user to the database
      await user.save();

      // Send back the updated user
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
);

// 4.
usersRouterDB.put(
  "/:userId",
  JWTAuthMiddleware,
  adminOnlyMiddleware,
  async (req, res, next) => {
    try {
      const id = req.params.userId;
      const updatedUser = await UserModel.findByIdAndUpdate(id, req.body, {
        new: true
      });
      if (updatedUser) {
        res.send(updatedUser);
      } else {
        next(
          createHttpError(
            404,
            `User with id ${req.params.userId} not found! Or has no permission!`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

usersRouterDB.delete("/me", JWTAuthMiddleware, async (req, res, next) => {
  try {
    await req.user.deleteOne();
    res.status(204).send();
  } catch (error) {
    next(createHttpError(404, `User with id ${req.params.userId} not found!`));
  }
});

usersRouterDB.delete(
  "/:userId",
  JWTAuthMiddleware,
  adminOnlyMiddleware,
  async (req, res, next) => {
    try {
      const id = req.params.userId;
      const deleteUsersById = await UserModel.findByIdAndDelete(id);
      if (deleteUsersById) {
        res.status(204).send();
      } else {
        next(
          createHttpError(404, `User with id ${req.params.userId} not found!`)
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

usersRouterDB.post("/login", async (req, res, next) => {
  try {
    // 1. Get credentials from req.body
    const { email, password } = req.body;

    // 2. Verify credentials
    const user = await UserModel.checkCredentials(email, password);

    if (user) {
      // console.log(password);
      // 3. If credentials are fine we are going to generate an access token
      const { accessToken, refreshToken } = await JWTAuthenticate(user);
      res.send({ accessToken, refreshToken });
    } else {
      // 4. If they are not --> error (401)
      next(createHttpError(401, "Credentials not ok!"));
    }
  } catch (error) {
    console.log("login error", error);
    next(error);
  }
});

usersRouterDB.post("/signup", async (req, res, next) => {
  try {
    // 1. Get credentials from req.body
    const { email, password, name } = req.body;

    // Validate if user already exists
    const user = await UserModel.findOne({ email });
    if (!user) {
      //  create a new user
      console.log("User does not exist!");
      const newUser = new UserModel({ email, password, name });
      const nUser = await newUser.save();
      console.log(nUser);
      const { accessToken, refreshToken } = await JWTAuthenticate(nUser);
      res.send({ accessToken, refreshToken });
    }
    next(createHttpError(400, "User already exists!"));
  } catch (error) {
    next(error);
  }
});
usersRouterDB.post("/refreshToken", async (req, res, next) => {
  try {
    // 1. Receive the current refresh token from req.body
    const { refresh_token } = req.body;

    // 2. Check the validity of that (check if it is not expired, check if it hasn't been compromised, check if it is in db)
    // 3. If everything is fine --> generate a new pair of tokens (accessToken and refreshToken)
    const { accessToken, refreshToken } = await verifyRefreshAndGenerateTokens(
      refresh_token
    );

    // 4. Send tokens back as a response
    res.send({ accessToken, refreshToken });
  } catch (error) {
    res
      .status(401)
      .send("Something broke while trying to generate a refreshToken!");
  }
});
usersRouterDB.post("/verifyToken", async (req, res, next) => {
  const { access_token, refresh_token } = req.body;

  let accessTokenIsValid = false;
  let refreshTokenIsValid = false;
  try {
    await verifyJWT(access_token);
    accessTokenIsValid = true;
  } catch (err) {
    console.log(err);
  }

  try {
    await verifyRefreshToken(refresh_token);
    refreshTokenIsValid = true;
  } catch (err) {
    console.log(err);
  }

  if (accessTokenIsValid && refreshTokenIsValid) {
    res.send({ isValid: true });
  } else {
    res.send({ isValid: false });
  }
});

usersRouterDB.get("/test", async (req, res, next) => {
  try {
    res.status(204).send("its working");
  } catch (err) {
    console.log(err);
  }
});

export default usersRouterDB;
