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

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                email: existedUser.email,
                isVerified: existedUser.isVerified,
            },
            "otp is verified successfully"
        )
    );
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
        await verifySignupMail(
            existedUser.fullName,
            existedUser.email,
            existedUser.otpSignup
        );
        throw new ApiError(
            401,
            "Your email is not verified..Please verify OTP"
        );
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        existedUser._id
    );

    const user = await User.findById(existedUser._id).select(
        "-password -refreshToken"
    );
    if (!user) throw new ApiError(404, "user not found");

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: user, accessToken, refreshToken },
                "user logged in successfully"
            )
        );
});
