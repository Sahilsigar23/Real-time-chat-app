import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getMyGroups,
  getGroupMessages,
  sendGroupMessage,
  addMembers,
  removeMember,
  updateGroup,
  toggleAdmin,
  deleteGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getMyGroups);

router.get("/:id/messages", protectRoute, getGroupMessages);
router.post("/:id/messages", protectRoute, sendGroupMessage);

router.put("/:id", protectRoute, updateGroup);
router.delete("/:id", protectRoute, deleteGroup);

router.put("/:id/members", protectRoute, addMembers);
router.delete("/:id/members/:userId", protectRoute, removeMember);
router.put("/:id/admins/:userId", protectRoute, toggleAdmin);

export default router;
