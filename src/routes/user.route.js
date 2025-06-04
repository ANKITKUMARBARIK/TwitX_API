import { Router } from "express";
import {
    changeCurrentPassword,
    updateAccountDetails,
} from "../controllers/user.controller.js";
import verifyAuthentication from "../middlewares/authentication.middleware.js";

const router = Router();

router
    .route("/change-password")
    .patch(verifyAuthentication, changeCurrentPassword);

router
    .route("/update-account")
    .patch(verifyAuthentication, updateAccountDetails);

export default router;
