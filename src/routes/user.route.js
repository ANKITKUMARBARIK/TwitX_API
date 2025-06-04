import { Router } from "express";
import { changeCurrentPassword } from "../controllers/user.controller.js";
import verifyAuthentication from "../middlewares/authentication.middleware.js";

const router = Router();

router
    .route("/change-password")
    .patch(verifyAuthentication, changeCurrentPassword);

export default router;
