import asyncHandler from "../utils/asyncHandler.util.js";
import ApiError from "../utils/ApiError.util.js";
import ApiResponse from "../utils/ApiResponse.util.js";
import User from "../models/user.model.js";

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (
        [oldPassword, newPassword, confirmPassword].some(
            (field) => !field?.trim()
        )
    )
        throw new ApiError(400, "all fields are required");

    if (oldPassword === newPassword)
        throw new ApiError(401, "old and new password must be different");

    if (newPassword !== confirmPassword)
        throw new ApiError(401, "new and confirm password must be same");

    const existedUser = await User.findById(req.user?._id);
    if (!existedUser) throw new ApiError(400, "user not found");

    const isPasswordValid = await existedUser.comparePassword(oldPassword);
    if (!isPasswordValid) throw new ApiError(401, "invalid old password");

    existedUser.password = confirmPassword;
    await existedUser.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password changed successfully"));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, username, email, bio, timezone } = req.body;
    if ([fullName, username, email, timezone].some((field) => !field?.trim()))
        throw new ApiError(400, "all fields are required");

    const existedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, username, email, bio, timezone } },
        { new: true }
    ).select("-password -refreshToken");
    if (!existedUser)
        throw new ApiError(401, "something wrong while updating account");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                existedUser,
                "account details updated successfully"
            )
        );
});
