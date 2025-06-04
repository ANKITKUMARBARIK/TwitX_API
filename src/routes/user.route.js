import { Router } from "express";
import {
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
} from "../controllers/user.controller.js";
import verifyAuthentication from "../middlewares/authentication.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();

router
    .route("/change-password")
    .patch(verifyAuthentication, changeCurrentPassword);

router
    .route("/update-account")
    .patch(verifyAuthentication, updateAccountDetails);

router
    .route("/update-avatar")
    .patch(verifyAuthentication, upload.single("avatar"), updateUserAvatar);

router
    .route("/update-coverImage")
    .patch(
        verifyAuthentication,
        upload.single("coverImage"),
        updateUserCoverImage
    );

export default router;
