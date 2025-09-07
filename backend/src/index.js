import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const __dirname = path.resolve();

// Ensure Express knows it's behind a proxy (Render) so secure cookies and protocol are handled
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
// CORS configuration suitable for Render deployments and local dev
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) and same-origin
      if (!origin) return callback(null, true);

      const allowedOrigins = [FRONTEND_URL];

      // Also allow Render preview apps if configured via env var (comma separated)
      if (process.env.CORS_EXTRA_ORIGINS) {
        const extras = process.env.CORS_EXTRA_ORIGINS.split(",").map((o) => o.trim());
        allowedOrigins.push(...extras);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Optionally allow any subdomain of onrender.com for previews
      if (/\.onrender\.com$/.test(new URL(origin).hostname)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
