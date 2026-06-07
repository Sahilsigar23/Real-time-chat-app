import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowList = [allowedOrigin];
      if (process.env.CORS_EXTRA_ORIGINS) {
        const extras = process.env.CORS_EXTRA_ORIGINS.split(",").map((o) => o.trim());
        allowList.push(...extras);
      }
      try {
        const hostname = new URL(origin).hostname;
        if (allowList.includes(origin) || /\.onrender\.com$/.test(hostname)) {
          return callback(null, true);
        }
      } catch (_) {}
      return callback(new Error("Socket CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Emit an event to every connected user in `userIds`, optionally excluding one
export function emitToUsers(userIds, event, payload, excludeUserId) {
  for (const id of userIds) {
    const uid = id.toString();
    if (excludeUserId && uid === excludeUserId.toString()) continue;
    const socketId = userSocketMap[uid];
    if (socketId) io.to(socketId).emit(event, payload);
  }
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Typing indicators: relay typing state to the targeted receiver only
  socket.on("typing", ({ receiverId }) => {
    if (!userId || !receiverId) return;
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    if (!userId || !receiverId) return;
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStopTyping", { senderId: userId });
    }
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Persist and broadcast last-seen so peers can show "Last seen ..."
    if (userId) {
      try {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { lastSeen });
        io.emit("userLastSeen", { userId, lastSeen });
      } catch (error) {
        console.log("Error updating lastSeen on disconnect:", error.message);
      }
    }
  });
});

export { io, app, server };
