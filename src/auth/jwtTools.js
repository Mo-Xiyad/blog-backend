import CryptoJS from "crypto-js";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import UserModel from "../db/usersSchema.js";
function isTokenExpired(token) {
  // Get the current time
  let currentTime = Math.floor(Date.now() / 1000);

  // Decode the token to get the payload
  let payload = JSON.parse(
    CryptoJS.enc.Base64.parse(token.split(".")[1]).toString(CryptoJS.enc.Utf8)
  );

  // Check if the expiry time in the payload is less than the current time
  return payload.exp < currentTime;
}

export const JWTAuthenticate = async (user) => {
  console.log("=======> INside the JWTAuthenticate Function", user);
  // 1. given the user generates tokens (access and refresh)
  const accessToken = await generateAccessJWTToken({ _id: user._id });
  const refreshToken = await generateRefreshToken({ _id: user._id });

  // 2. refresh token should be saved in db
  user.refreshToken = refreshToken;
  await user.save();
  return { accessToken, refreshToken };
};

const generateAccessJWTToken = (payload) =>
  new Promise((resolve, reject) =>
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
      (err, token) => {
        if (err) reject(err);
        else resolve(token);
      }
    )
  );
/* on the terminal
--> node
Welcome to Node.js v14.18.0.
Type ".help" for more information.
> require("crypto").randomBytes(64).toString("hex")
 */
const generateRefreshToken = (payload) =>
  new Promise((resolve, reject) =>
    jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "1 week" },
      (err, token) => {
        if (err) reject(err);
        else resolve(token);
      }
    )
  );

export const verifyJWT = (token) =>
  new Promise((res, rej) =>
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) rej(err);
      else res(decodedToken);
    })
  );

export const verifyRefreshToken = (token) =>
  new Promise((res, rej) =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decodedToken) => {
      if (err) rej(err);
      else res(decodedToken);
    })
  );

export const verifyRefreshAndGenerateTokens = async (currentRefreshToken) => {
  // 1. check the validity of current refresh token (exp date and integrity)
  // Decoded used ID
  try {
    const { _id } = await verifyRefreshToken(currentRefreshToken);

    const user = await UserModel.findById(_id);

    if (!user) throw new createHttpError(404, "User not found!");

    if (user.refreshToken && user.refreshToken === currentRefreshToken) {
      // 3. if everything is fine we are going to generate a new pair of tokens
      const refreshToken = await generateRefreshToken({ _id: user._id });
      const accessToken = await generateAccessJWTToken({ _id: user._id });
      user.refreshToken = refreshToken;
      await user.save();
      // 4. return tokens
      console.log("✅");
      return { accessToken, refreshToken };
    } else {
      throw new createHttpError(401, "User token not valid!");
    }
  } catch (error) {
    throw new createHttpError(404, "Token not valid!");
  }
};

/* FE EXAMPLE
await fetch("/whateverResource", {headers: {Authorization: accessToken}})
  if(401) {
    const {newAccessToken, newRefreshToken} = await fetch("/users/refreshToken", {method: "POST", body: {currentRefreshToken: "uih1ih3i21h3iuh21iu3hiu21"}})
    localStorage.setItem("accessToken", newAccessToken)
    localStorage.setItem("refreshToken", refreshToken)
    await fetch("/whateverResource", {headers: {Authorization: newAccessToken}})
  }
  */
