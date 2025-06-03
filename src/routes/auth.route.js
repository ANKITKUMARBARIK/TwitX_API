import { Router } from "express";
import {
    registerUser,
    verifyOtpSignup,
    resendOtpSignup,
    loginUser,
    googleOAuthLogin,
} from "../controllers/auth.controller.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser
);

router.route("/verify-signup").post(verifyOtpSignup);

router.route("/resend-signup").post(resendOtpSignup);

router.route("/login").post(loginUser);

router.route("/google").post(googleOAuthLogin);

export default router;
