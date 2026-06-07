import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Number of unread messages per sender, for sidebar badges
export const getUnreadCounts = async (req, res) => {
  try {
    const myId = req.user._id;

    const counts = await Message.aggregate([
      { $match: { receiverId: myId, status: { $ne: "read" } } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

    const result = {};
    for (const c of counts) result[c._id.toString()] = c.count;

    res.status(200).json(result);
  } catch (error) {
    console.log("Error in getUnreadCounts controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      // Exclude messages this user deleted just for themselves
      deletedFor: { $ne: myId },
    }).populate("replyTo", "text image file senderId isDeleted");

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Resolve the socket id of the conversation partner relative to the acting user
const getPartnerSocketId = (message, actingUserId) => {
  const partnerId = message.senderId.equals(actingUserId)
    ? message.receiverId
    : message.senderId;
  return getReceiverSocketId(partnerId.toString());
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Non-image attachment (document, etc.) — resource_type "auto" handles any file
    let fileData;
    if (file?.data) {
      const uploadResponse = await cloudinary.uploader.upload(file.data, {
        resource_type: "auto",
      });
      fileData = {
        url: uploadResponse.secure_url,
        name: file.name || "file",
        type: file.type || "",
      };
    }

    // If the receiver is currently connected, the message is delivered instantly
    const receiverSocketId = getReceiverSocketId(receiverId);

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      file: fileData,
      replyTo: replyTo || null,
      status: receiverSocketId ? "delivered" : "sent",
    });

    await newMessage.save();
    // Populate the replied-to preview so both sides can render it
    if (newMessage.replyTo) {
      await newMessage.populate("replyTo", "text image file senderId isDeleted");
    }

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const myId = req.user._id;

    if (!emoji) return res.status(400).json({ message: "Emoji is required" });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Toggle: same emoji from same user removes it, otherwise replace this user's reaction
    const existing = message.reactions.find((r) => r.userId.equals(myId));
    if (existing && existing.emoji === emoji) {
      message.reactions = message.reactions.filter((r) => !r.userId.equals(myId));
    } else {
      message.reactions = message.reactions.filter((r) => !r.userId.equals(myId));
      message.reactions.push({ emoji, userId: myId });
    }

    await message.save();

    const partnerSocketId = getPartnerSocketId(message, myId);
    if (partnerSocketId) {
      io.to(partnerSocketId).emit("messageReaction", {
        messageId: message._id.toString(),
        reactions: message.reactions,
      });
    }

    res.status(200).json(message.reactions);
  } catch (error) {
    console.log("Error in reactToMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const myId = req.user._id;

    if (!text || !text.trim())
      return res.status(400).json({ message: "Text is required" });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (!message.senderId.equals(myId))
      return res.status(403).json({ message: "You can only edit your own messages" });
    if (message.isDeleted)
      return res.status(400).json({ message: "Cannot edit a deleted message" });

    message.text = text.trim();
    message.isEdited = true;
    await message.save();

    const partnerSocketId = getPartnerSocketId(message, myId);
    if (partnerSocketId) {
      io.to(partnerSocketId).emit("messageEdited", {
        messageId: message._id.toString(),
        text: message.text,
        isEdited: true,
      });
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { scope = "me" } = req.body; // "me" | "everyone"
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (scope === "everyone") {
      if (!message.senderId.equals(myId))
        return res
          .status(403)
          .json({ message: "You can only delete your own messages for everyone" });

      message.isDeleted = true;
      message.text = "";
      message.image = "";
      message.reactions = [];
      await message.save();

      const partnerSocketId = getPartnerSocketId(message, myId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit("messageDeleted", {
          messageId: message._id.toString(),
        });
      }
    } else {
      // Delete for me: just hide it from this user
      if (!message.deletedFor.some((id) => id.equals(myId))) {
        message.deletedFor.push(myId);
        await message.save();
      }
    }

    res.status(200).json({ success: true, scope });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params; // the other user whose messages I'm reading
    const myId = req.user._id;

    // Mark every message that senderId sent to me as read
    await Message.updateMany(
      { senderId, receiverId: myId, status: { $ne: "read" } },
      { $set: { status: "read" } }
    );

    // Let the original sender update their UI in real time
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { readerId: myId.toString() });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { pinned } = req.body;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.isDeleted)
      return res.status(400).json({ message: "Cannot pin a deleted message" });

    message.isPinned = !!pinned;
    await message.save();

    const partnerSocketId = getPartnerSocketId(message, myId);
    if (partnerSocketId) {
      io.to(partnerSocketId).emit("messagePinned", {
        messageId: message._id.toString(),
        isPinned: message.isPinned,
      });
    }

    res.status(200).json({ messageId: message._id.toString(), isPinned: message.isPinned });
  } catch (error) {
    console.log("Error in pinMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
