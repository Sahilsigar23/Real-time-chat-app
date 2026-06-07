import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    file: {
      url: { type: String },
      name: { type: String },
      type: { type: String },
    },
    // System messages describe group activity ("X added Y", "X left")
    isSystem: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage;
