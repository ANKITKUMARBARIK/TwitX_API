import { Router } from "express";
import {
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getCurrentUser,
    updateUserRole,
} from "../controllers/user.controller.js";
import verifyAuthentication from "../middlewares/authentication.middleware.js";
import upload from "../middlewares/multer.middleware.js";
import verifyAuthorization from "../middlewares/authorization.middleware.js";
import ROLES from "../config/role.js";

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

router.route("/current-user").get(verifyAuthentication, getCurrentUser);

router
    .route("/make-admin/:id")
    .patch(
        verifyAuthentication,
        verifyAuthorization(ROLES.ADMIN),
        updateUserRole
    );

export default router;
