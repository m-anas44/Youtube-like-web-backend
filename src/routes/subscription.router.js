import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/channel/:userID").get(getSubscribedChannels);
router.route("/channel/:channelID").post(toggleSubscription);
router.route("/user/:channelID").get(getUserChannelSubscribers);

export default router;
