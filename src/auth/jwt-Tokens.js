import createHttpError from "http-errors";
import UserModel from "../db/usersSchema.js";
import { verifyJWT } from "./jwtTools.js";

export const JWTAuthMiddleware = async (req, res, next) => {
  if (!req.headers.authorization) {
    console.log("❌", "Accessing protected route without token 🤨");
    next(createHttpError(401, "Please provide token in Authorization header!"));
    return;
  }
  try {
    const token = req.headers.authorization.split(" ")[1];
    // 3. Verify token, if everything goes fine we are getting back the payload of the token ({_id: "iojasodjoasjd"}), otherwise an error will be thrown by jwt library
    const decodedToken = await verifyJWT(removeQuote(token));
    // 4. If token is valid we are going to attach him/her to request object
    const user = await UserModel.findById(decodedToken._id);
    if (!user) {
      next(createHttpError(404, "User not found"));
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(createHttpError(401, "Token not valid!"));
  }
};

function removeQuote(s) {
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}
