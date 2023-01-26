import sgMail from "@sendgrid/mail";
import express from "express";
import { Subscriber } from "../../db/Subscriber.js";
// import { emailService } from "../email/index.js";

const subscribersRouter = express.Router();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
subscribersRouter.post("/", async (req, res) => {
  try {
    const emailRegex = new RegExp(
      "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$"
    );
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({ msg: "Please enter a valid email" });
    }
    // see if the user already exists
    const existingSubscriber = await Subscriber.findOne({
      email: req.body.email
    });
    if (existingSubscriber) {
      return res.status(400).json({ msg: "User already exists" });
    }
    const subscriber = new Subscriber({ email: req.body.email });
    try {
      await subscriber.save();
    } catch (error) {
      return res.status(400).json({ msg: error.message });
    }
    const msg = {
      to: req.body.email,
      from: "xziyad92@gmail.com",
      subject: "Welcome to our newsletter",
      text: "Thank you for subscribing!",
      html: "<strong>Thank you for subscribing!</strong>"
    };
    await sgMail.send(msg);
    res.send(subscriber);
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});
export default subscribersRouter;
