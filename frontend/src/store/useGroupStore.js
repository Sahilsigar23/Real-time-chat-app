import { create } from "zustand";
import toast from "react-hot-toast";
import api from "../lib/axios.js";

import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  isCreatingGroup: false,
  groupUnread: {}, // { groupId: count }

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await api.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      console.error("Failed to get groups:", error);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async ({ name, members, avatar }) => {
    set({ isCreatingGroup: true });
    try {
      const res = await api.post("/groups", { name, members, avatar });
      set({ groups: [res.data, ...get().groups] });
      toast.success("Group created");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return null;
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  selectGroup: (group) => {
    // Selecting a group clears any open 1-on-1 chat
    useChatStore.getState().setSelectedUser(null);
    set({ selectedGroup: group });
    if (group) {
      const { groupUnread } = get();
      if (groupUnread[group._id]) {
        const next = { ...groupUnread };
        delete next[group._id];
        set({ groupUnread: next });
      }
      get().getGroupMessages(group._id);
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await api.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  sendGroupMessage: async (messageData) => {
    const { selectedGroup, groupMessages } = get();
    if (!selectedGroup) return;
    try {
      const res = await api.post(`/groups/${selectedGroup._id}/messages`, messageData);
      set({ groupMessages: [...groupMessages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  addMembers: async (groupId, memberIds) => {
    try {
      const res = await api.put(`/groups/${groupId}/members`, { memberIds });
      get().applyGroupUpdate(res.data);
      toast.success("Members added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
    }
  },

  removeMember: async (groupId, userId) => {
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      // Refresh the affected group
      const res = await api.get("/groups");
      const updated = res.data.find((g) => g._id === groupId);
      set({ groups: res.data });
      if (get().selectedGroup?._id === groupId && updated) {
        set({ selectedGroup: updated });
      }
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  },

  updateGroup: async (groupId, data) => {
    try {
      const res = await api.put(`/groups/${groupId}`, data);
      get().applyGroupUpdate(res.data);
      toast.success("Group updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
    }
  },

  toggleAdmin: async (groupId, userId) => {
    try {
      const res = await api.put(`/groups/${groupId}/admins/${userId}`);
      get().applyGroupUpdate(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update admin");
    }
  },

  leaveGroup: async (groupId) => {
    const myId = useAuthStore.getState().authUser?._id;
    try {
      await api.delete(`/groups/${groupId}/members/${myId}`);
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
      });
      toast.success("Left group");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await api.delete(`/groups/${groupId}`);
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
      });
      toast.success("Group deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  },

  // Replace a group in state (and selectedGroup if it's the open one)
  applyGroupUpdate: (group) => {
    set({
      groups: get().groups.map((g) => (g._id === group._id ? group : g)),
      selectedGroup:
        get().selectedGroup?._id === group._id ? group : get().selectedGroup,
    });
  },

  subscribeToGroups: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newGroupMessage", (message) => {
      const { selectedGroup, groupMessages, groupUnread, groups } = get();
      const isOpen = selectedGroup && message.groupId === selectedGroup._id;

      if (isOpen) {
        set({ groupMessages: [...groupMessages, message] });
      } else {
        set({
          groupUnread: {
            ...groupUnread,
            [message.groupId]: (groupUnread[message.groupId] || 0) + 1,
          },
        });
        const group = groups.find((g) => g._id === message.groupId);
        const sender = message.senderId?.fullName || "Someone";
        const preview =
          message.text ||
          (message.image ? "📷 Photo" : message.file ? "📎 File" : "New message");
        toast(`${group?.name || "Group"} · ${sender}: ${preview}`, {
          icon: "👥",
          duration: 4000,
        });
      }
    });

    socket.on("groupCreated", (group) => {
      if (get().groups.some((g) => g._id === group._id)) return;
      set({ groups: [group, ...get().groups] });
      toast(`Added to group "${group.name}"`, { icon: "👥" });
    });

    socket.on("groupUpdated", (group) => {
      if (!get().groups.some((g) => g._id === group._id)) {
        set({ groups: [group, ...get().groups] });
      } else {
        get().applyGroupUpdate(group);
      }
    });

    socket.on("groupDeleted", ({ groupId }) => {
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
      });
    });

    socket.on("removedFromGroup", ({ groupId }) => {
      set({
        groups: get().groups.filter((g) => g._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
      });
      toast("You were removed from a group", { icon: "👥" });
    });
  },

  unsubscribeFromGroups: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newGroupMessage");
    socket.off("groupCreated");
    socket.off("groupUpdated");
    socket.off("groupDeleted");
    socket.off("removedFromGroup");
  },

  setSelectedGroup: (selectedGroup) => set({ selectedGroup }),
}));
