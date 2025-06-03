import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { fileSize } from "./constants.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true, limit: fileSize }));
app.use(express.json({ limit: fileSize }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import authRouter from "./routes/auth.route.js";

// routes define
app.use("/api/v1/auth", authRouter);

export default app;
