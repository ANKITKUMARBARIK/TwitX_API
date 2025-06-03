import asyncHandler from "../utils/asyncHandler.util.js";
import ApiError from "../utils/ApiError.util.js";
import ApiResponse from "../utils/ApiResponse.util.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../services/cloudinary.service.js";
import generateSignupOtp from "../utils/generateSignupOtp.util.js";
import verifySignupMail from "../services/verifySignupMail.service.js";
import welcomeSignupMail from "../services/welcomeSignupMail.service.js";
import generateAccessAndRefreshToken from "../services/token.service.js";
import { sanitizeUser, setAuthCookies } from "../utils/auth.util.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import User from "../models/user.model.js";

export const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, email, password, bio, timezone } = req.body;
    if (
        [fullName, username, email, password, bio, timezone].some(
            (field) => !field?.trim()
        )
    )
        throw new ApiError(400, "all fields are required");

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (existedUser)
        throw new ApiError(409, "username or email already exists");

    let avatarLocalPath, coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.avatar) &&
        req.files.avatar.length > 0
    ) {
        avatarLocalPath = req.files.avatar[0].buffer;
    }
    if (!avatarLocalPath) throw new ApiError(400, "avatar file is required");

    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].buffer;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar?.url) throw new ApiError(400, "avatar file is required");

    const otpSignup = generateSignupOtp();
    const otpSignupExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const user = new User({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        bio,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        timezone,
        otpSignup,
        otpSignupExpiry,
    });
    try {
        await user.save();
    } catch (error) {
        console.log("user creation failed");
        if (avatar?.public_id) await deleteFromCloudinary(avatar.public_id);
        if (coverImage?.public_id)
            await deleteFromCloudinary(coverImage.public_id);
        throw new ApiError(
            500,
            "error saving user to database and images were deleted"
        );
    }

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!createdUser)
        throw new ApiError(
            500,
            "something went wrong while registering the user"
        );

    await verifySignupMail(
        createdUser.fullName,
        createdUser.email,
        createdUser.otpSignup
    );

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                createdUser,
                "user registered successfully....Please verify OTP !"
            )
        );
});

export const verifyOtpSignup = asyncHandler(async (req, res) => {
    const { otpSignup } = req.body;
    if (!otpSignup?.trim()) throw new ApiError(401, "otp is required");

    const existedUser = await User.findOneAndUpdate(
        { otpSignup, otpSignupExpiry: { $gt: new Date() } },
        {
            $unset: { otpSignup: 1, otpSignupExpiry: 1 },
            $set: { isVerified: true },
        },
        { new: true }
    );
    if (!existedUser) throw new ApiError(400, "invalid or expired otp");

    await welcomeSignupMail(existedUser.fullName, existedUser.email);

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        existedUser._id
    );

    const user = await sanitizeUser(existedUser._id);
    if (!user) throw new ApiError(404, "user not found");

    setAuthCookies(res, accessToken, refreshToken);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user, accessToken, refreshToken },
                "OTP verified & user logged in"
            )
        );
});

export const resendOtpSignup = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email?.trim()) throw new ApiError(400, "email is required");

    const existedUser = await User.findOne({ email });
    if (!existedUser) throw new ApiError(404, "email doesn't exists");

    if (existedUser.isVerified)
        throw new ApiError(400, "user is already verified");

    const isOtpExpired =
        !existedUser.otpSignupExpiry ||
        existedUser.otpSignupExpiry < new Date();
    if (isOtpExpired) {
        const otpSignup = generateSignupOtp();
        const otpSignupExpiry = new Date(Date.now() + 5 * 60 * 1000);

        const updatedUser = await User.findByIdAndUpdate(
            existedUser._id,
            { $set: { otpSignup, otpSignupExpiry } },
            { new: true }
        );

        await verifySignupMail(
            updatedUser.fullName,
            updatedUser.email,
            updatedUser.otpSignup
        );
    } else {
        await verifySignupMail(
            existedUser.fullName,
            existedUser.email,
            existedUser.otpSignup
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "OTP resent successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if ([username, email, password].some((field) => !field?.trim()))
        throw new ApiError(400, "all fields are required");

    const existedUser = await User.findOne({
        $and: [{ username }, { email }],
    });
    if (!existedUser) throw new ApiError(404, "user does not exists");

    const isPasswordValid = await existedUser.comparePassword(password);
    if (!isPasswordValid) throw new ApiError(401, "invalid user credentials");

    if (!existedUser.isVerified) {
        const isOtpExpired =
            !existedUser.otpSignupExpiry ||
            existedUser.otpSignupExpiry < new Date();
        if (isOtpExpired) {
            const otpSignup = generateSignupOtp();
            const otpSignupExpiry = new Date(Date.now() + 5 * 60 * 1000);

            const updatedUser = await User.findByIdAndUpdate(
                existedUser._id,
                { $set: { otpSignup, otpSignupExpiry } },
                { new: true }
            );

            await verifySignupMail(
                updatedUser.fullName,
                updatedUser.email,
                updatedUser.otpSignup
            );
        } else {
            await verifySignupMail(
                existedUser.fullName,
                existedUser.email,
                existedUser.otpSignup
            );
        }
        throw new ApiError(
            401,
            "your email is not verified. Please check your mail for OTP."
        );
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        existedUser._id
    );

    const user = await sanitizeUser(existedUser._id);
    if (!user) throw new ApiError(404, "user not found");

    setAuthCookies(res, accessToken, refreshToken);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user, accessToken, refreshToken },
                "user logged in successfully"
            )
        );
});

// OAuth manually (without passport.js)
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const googleOAuthLogin = asyncHandler(async (req, res) => {
    const { credential } = req.body;
    if (!credential) throw new ApiError(400, "credential is missing");

    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let existedUser = await User.findOne({ email });
    if (!existedUser) {
        const randomPassword = crypto.randomBytes(20).toString("hex");
        existedUser = new User({
            fullName: name,
            username: email.split("@")[0],
            email: email,
            password: randomPassword,
            avatar: picture,
            timezone: "Asia/Kolkata",
            authProvider: "google",
            isVerified: true,
        });
        await existedUser.save();

        await welcomeSignupMail(existedUser.fullName, existedUser.email);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        existedUser._id
    );

    const user = await sanitizeUser(existedUser._id);
    if (!user) throw new ApiError(404, "user not found");

    setAuthCookies(res, accessToken, refreshToken);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user, accessToken, refreshToken },
                "user - GOOGLE logged in successfully"
            )
        );
});

/* 
NOTE :-
    ->  ✅ How to get a valid Google ID Token from OAuth Playground for backend testing:

    ->  Go to Google Cloud Console
    ->  Select your project → Go to APIs & Services > Credentials
    ->  Click your OAuth 2.0 Client ID
    ->  In Authorized redirect URIs, add:
    ->  https://developers.google.com/oauthplayground
    ->  Save the changes ✅

    ->  Now go to Google OAuth Playground

    ->  Click the gear icon (⚙️) at the top right
    ->  Check "Use your own OAuth credentials"
    ->  Paste your Client ID and Client Secret (from Cloud Console)
    ->  Click Close

    ->  In Step 1:
    ->  Under "Select & authorize APIs", scroll down
    ->  Expand Google OAuth 2.0 API v2

    ->  Select:
    ->  https://www.googleapis.com/auth/userinfo.email  
    ->  https://www.googleapis.com/auth/userinfo.profile  
    ->  openid

    ->  Click Authorize APIs
    ->  Sign in with your Google account when prompted
    ->  In Step 2: Click Exchange authorization code for tokens
    ->  Scroll down and copy the id_token from the response
    ->  Now use this id_token as the credential field in your backend API (e.g. via Postman):

    ->  {
    ->      "credential": "PASTE_YOUR_ID_TOKEN_HERE"
    ->  }
*/
