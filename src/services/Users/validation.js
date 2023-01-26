import { body } from "express-validator";

export const authorsValidationMiddleware = [
  body("name").exists().withMessage("Name is a mandatory field!"),
  body("email").exists().withMessage("Email is a mandatory field!"),
  body("password").exists().withMessage("Password is a mandatory field!"),
];
