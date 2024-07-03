import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelDetails,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
router.route("/login").post(loginUser);

// secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/changePassword").post(verifyJWT, changeCurrentPassword)
router.route("currentUser").get(verifyJWT, getCurrentUser)
router.route("updateAccount").patch(verifyJWT, updateAccountDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/coverImage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/channel/:username").get(verifyJWT, getUserChannelDetails)
router.route("/history").get(verifyJWT, getWatchHistory)

export default router;
