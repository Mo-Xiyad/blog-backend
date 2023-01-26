import cors from "cors";
import express from "express";
import listEndpoints from "express-list-endpoints";
import mongoose from "mongoose";
import passport from "passport";
import { join } from "path";

import swaggerUI from "swagger-ui-express";
import yaml from "yamljs";

import GoogleStrategy from "./auth/googleOAuth.js";
import blogPostsRouterDB from "./services/Posts/posts.js";

import {
  badRequestHandler,
  forbiddenHandler,
  genericErrorHandler,
  notFoundHandler,
  unauthorizedHandler
} from "./errorHandlers.js";
import subscribersRouter from "./services/subscriber/index.js";
import usersRouterDB from "./services/Users/usersRout.js";

// Run the api on the server side url Ex, "localhost:3001"
const yamlAPIDocument = yaml.load(join(process.cwd(), "./src/apiDoc.yml"));

const server = express();

// ******************** Global middleware **********************
const loggerMiddleWare = (req, res, next) => {
  console.log(
    `Req Method ${req.method} --- Req URL ${req.url} -- ${new Date()}`
  );
  next();
};
// ******************** CORS SETUP FOR CLOUD HOSTING **********************

const whitelist = [
  process.env.FE_LOCAL_URL,
  process.env.FE_PROD_URL,
  "https://blog-frontend-mf4z.vercel.app" // this is bad
];

const corsOptions = {
  origin: function (origin, next) {
    console.log("CURRENT ORIGIN AT:", origin);
    if (!origin || whitelist.indexOf(origin) !== -1) {
      next(null, true);
    } else {
      next(new Error("CORS ERROR"));
    }
  }
};

// ****************************** MIDDLEWARE'S ******************************

passport.use("google", GoogleStrategy);

server.use(cors(corsOptions));
server.use(loggerMiddleWare);
server.use(express.json());

server.use(passport.initialize());

// ************************ ENDPOINTS **********************

const staticFolderPath = join(process.cwd(), "./public");
server.use(express.static(staticFolderPath));
// server.use("/users", usersRouter); //normal routes for json
// server.use("/usersFromDb", usersRouterDB);
server.use("/users", usersRouterDB);
server.use("/subscribe", subscribersRouter);
// server.use("/posts", blogPostsRouter); //normal routes for json
// server.use("/postsFromDb", blogPostsRouterDB);
server.use("/posts", blogPostsRouterDB);
server.use("/docsAPI", swaggerUI.serve, swaggerUI.setup(yamlAPIDocument));

// ************************ END **********************

// ******************** ERROR MIDDLEWARE **********************
// this error handlers are generic to all the endpoints
server.use(badRequestHandler);
server.use(unauthorizedHandler);
server.use(notFoundHandler);
server.use(forbiddenHandler);
server.use(genericErrorHandler);

// ******************** END ERROR MIDDLEWARE **********************

// this port is coming from the evn file from local dev machine
const port = process.env.PORT;

// console.table(listEndpoints(server));

// server.listen(port, () => {
//   console.log("Server running on port:", port);
// });
mongoose.connect(process.env.MONGODB_CONNECTION);

mongoose.connection.on("connected", () => {
  console.log("📊 Mongo Connected❗️");

  server.listen(port, () => {
    console.table(listEndpoints(server));

    console.log(`Server running in port ${port} 📍`);
  });
});

mongoose.connection.on("error", (error) => {
  console.log(`Error on connection 💣`, error);
});
