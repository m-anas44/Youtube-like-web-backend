import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/publishVideo").post(
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishVideo
);
router.route("/watch/:videoID").get(getVideoById);
router
  .route("/updateVideoData/:videoID")
  .patch(upload.single("thumbnail"), updateVideo);
router.route("/deleteVideo/:videoID").delete(deleteVideo);
router.route("/getAllVideos").get(getAllVideos)

export default router;
