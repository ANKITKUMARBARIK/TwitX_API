# 🕊️ TwitX-API

TwitX-API is a powerful, scalable and secure Twitter-style social media REST API built with **Node.js**, **Express.js**, **MongoDB**, and **Cloudinary**.  
It includes full **authentication**, **media uploads**, **email verification**, and **reset password** functionality — all designed for modern social apps.

---

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT, Bcrypt
- **Email Service**: Nodemailer (Gmail/SMTP)
- **Image Upload**: Multer + Cloudinary
- **Environment Variables**: dotenv

---

## 📁 Folder Structure

```
TwitX-API/
├── controllers/
├── models/
├── routes/
├── middlewares/
├── utils/
├── config/
├── uploads/ (temp multer storage)
├── .env
├── server.js
└── package.json
```

---

## 🔐 Authentication Flow

- ✅ `POST /api/auth/register` → Register user with email OTP verification
- ✅ `POST /api/auth/verify-email` → Verify account via OTP
- ✅ `POST /api/auth/login` → Login & get JWT token
- ✅ `POST /api/auth/logout` → Clear cookies/token
- 🔁 `POST /api/auth/forgot-password` → Send reset email
- 🔁 `POST /api/auth/reset-password` → Reset password via token

---

## 🧑 User Features

- `GET /api/users/me` → Get logged in user (Protected)
- `GET /api/users/:username` → Get public profile
- `PATCH /api/users/update` → Update profile info (bio, avatar, etc)
- `POST /api/users/avatar` → Upload profile image to Cloudinary

---

## 📝 Tweet Features

- `POST /api/tweets` → Create a tweet (text + optional image)
- `GET /api/tweets` → Get global feed
- `GET /api/tweets/:id` → Get specific tweet
- `DELETE /api/tweets/:id` → Delete your tweet

---

## ❤️ Reactions & Threads

- `POST /api/tweets/:id/like`
- `POST /api/tweets/:id/unlike`
- `POST /api/tweets/:id/retweet`
- `POST /api/tweets/:id/comment`

---

## ☁️ Image Upload Support

- Uses `Multer` for temporary storage
- Images uploaded to `Cloudinary`
- Supports profile pictures & tweet images

---

## 📩 Email Verification & Password Reset

- Sends email via **Nodemailer**
- OTP token for email verification
- Secure reset password token system

---

## ⚙️ Environment Variables (`.env`)

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

---

## 🛡 Middlewares

- `auth.middleware.js` → Protect routes using JWT
- `multer.middleware.js` → Handle file uploads
- `error.middleware.js` → Centralized error handler

---

## 🧪 Future Features

- 🔔 Real-time notifications (using socket.io)
- 🔎 Search (users & tweets)
- 📍 Location tagging
- 🧵 Threaded tweets with replies

---

## 👑 Made with ❤️ by Kumar

> This project is part of my full-stack learning journey. Feel free to fork, improve, or contribute!

---