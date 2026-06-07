import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  getUnreadCounts,
  sendMessage,
  markMessagesAsRead,
  reactToMessage,
  editMessage,
  deleteMessage,
  pinMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/unread-counts", protectRoute, getUnreadCounts);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.put("/read/:id", protectRoute, markMessagesAsRead);

router.put("/react/:id", protectRoute, reactToMessage);
router.put("/edit/:id", protectRoute, editMessage);
router.delete("/delete/:id", protectRoute, deleteMessage);
router.put("/pin/:id", protectRoute, pinMessage);

export default router;
