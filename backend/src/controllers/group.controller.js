import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import cloudinary from "../lib/cloudinary.js";
import { emitToUsers } from "../lib/socket.js";

const isAdmin = (group, userId) => group.admins.some((a) => a.equals(userId));
const isMember = (group, userId) => group.members.some((m) => m.equals(userId));

// Emit a populated group to its members so their sidebar updates live
const broadcastGroupUpdate = async (groupId, excludeUserId) => {
  const populated = await Group.findById(groupId)
    .populate("members", "-password")
    .populate("admins", "-password");
  if (populated) {
    emitToUsers(
      populated.members.map((m) => m._id),
      "groupUpdated",
      populated,
      excludeUserId
    );
  }
  return populated;
};

export const createGroup = async (req, res) => {
  try {
    const { name, members = [], avatar } = req.body;
    const myId = req.user._id;

    if (!name || !name.trim())
      return res.status(400).json({ message: "Group name is required" });

    let avatarUrl = "";
    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar);
      avatarUrl = uploadResponse.secure_url;
    }

    // Creator is always a member and an admin
    const memberSet = new Set([myId.toString(), ...members.map((m) => m.toString())]);

    const group = await Group.create({
      name: name.trim(),
      avatar: avatarUrl,
      members: [...memberSet],
      admins: [myId],
      createdBy: myId,
    });

    const populated = await Group.findById(group._id)
      .populate("members", "-password")
      .populate("admins", "-password");

    // Notify the other members in real time
    emitToUsers(
      populated.members.map((m) => m._id),
      "groupCreated",
      populated,
      myId
    );

    res.status(201).json(populated);
  } catch (error) {
    console.log("Error in createGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const myId = req.user._id;
    const groups = await Group.find({ members: myId })
      .populate("members", "-password")
      .populate("admins", "-password")
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.log("Error in getMyGroups controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, myId))
      return res.status(403).json({ message: "Not a group member" });

    const messages = await GroupMessage.find({
      groupId,
      deletedFor: { $ne: myId },
    }).populate("senderId", "fullName profilePic");

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { text, image, file } = req.body;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, myId))
      return res.status(403).json({ message: "Not a group member" });

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

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

    const message = await GroupMessage.create({
      groupId,
      senderId: myId,
      text,
      image: imageUrl,
      file: fileData,
    });

    // Bump group order and deliver to other members
    group.updatedAt = new Date();
    await group.save();

    const populated = await message.populate("senderId", "fullName profilePic");
    emitToUsers(group.members, "newGroupMessage", populated, myId);

    res.status(201).json(populated);
  } catch (error) {
    console.log("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addMembers = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { memberIds = [] } = req.body;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isAdmin(group, myId))
      return res.status(403).json({ message: "Only admins can add members" });

    const existing = new Set(group.members.map((m) => m.toString()));
    for (const id of memberIds) existing.add(id.toString());
    group.members = [...existing];
    await group.save();

    const populated = await broadcastGroupUpdate(groupId);
    res.status(200).json(populated);
  } catch (error) {
    console.log("Error in addMembers controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Admins can remove anyone; members may remove themselves (leave)
    const removingSelf = myId.toString() === userId;
    if (!isAdmin(group, myId) && !removingSelf)
      return res.status(403).json({ message: "Only admins can remove members" });

    group.members = group.members.filter((m) => m.toString() !== userId);
    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    // Tell the removed user so their sidebar drops the group
    emitToUsers([userId], "removedFromGroup", { groupId });
    await broadcastGroupUpdate(groupId, userId);

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in removeMember controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { name, avatar } = req.body;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isAdmin(group, myId))
      return res.status(403).json({ message: "Only admins can edit the group" });

    if (name && name.trim()) group.name = name.trim();
    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar);
      group.avatar = uploadResponse.secure_url;
    }
    await group.save();

    const populated = await broadcastGroupUpdate(groupId);
    res.status(200).json(populated);
  } catch (error) {
    console.log("Error in updateGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleAdmin = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isAdmin(group, myId))
      return res.status(403).json({ message: "Only admins can manage admins" });
    if (!group.members.some((m) => m.toString() === userId))
      return res.status(400).json({ message: "User is not a member" });

    if (group.admins.some((a) => a.toString() === userId)) {
      group.admins = group.admins.filter((a) => a.toString() !== userId);
    } else {
      group.admins.push(userId);
    }
    await group.save();

    const populated = await broadcastGroupUpdate(groupId);
    res.status(200).json(populated);
  } catch (error) {
    console.log("Error in toggleAdmin controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isAdmin(group, myId))
      return res.status(403).json({ message: "Only admins can delete the group" });

    const memberIds = group.members.map((m) => m.toString());
    await GroupMessage.deleteMany({ groupId });
    await group.deleteOne();

    emitToUsers(memberIds, "groupDeleted", { groupId });
    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in deleteGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
