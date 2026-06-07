import { create } from "zustand";
import toast from "react-hot-toast";
import api from "../lib/axios.js";

import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: [], // userIds currently typing to me

  getUsers: async () => {
    console.log("useChatStore: Getting users...");
    set({ isUsersLoading: true });
    try {
      const res = await api.get("/messages/users");
      console.log("useChatStore: Users response:", res.data);
      set({ users: res.data });
    } catch (error) {
      console.error("useChatStore: Error getting users:", error);
      toast.error(error.response?.data?.message || "Failed to get users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await api.get(`/messages/${userId}`);
      set({ messages: res.data });
      // Opening the conversation reads any messages this user sent us
      get().markMessagesAsRead(userId);
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  markMessagesAsRead: async (userId) => {
    try {
      await api.put(`/messages/read/${userId}`);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await api.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Reset typing state whenever we (re)subscribe to a conversation
    set({ typingUsers: [] });

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
      // The conversation is open, so this incoming message is immediately read
      get().markMessagesAsRead(selectedUser._id);
    });

    // Sender side: our messages were read by the peer -> flip their status
    socket.on("messagesRead", ({ readerId }) => {
      if (readerId !== selectedUser._id) return;
      set({
        messages: get().messages.map((m) =>
          m.senderId !== selectedUser._id ? { ...m, status: "read" } : m
        ),
      });
    });

    socket.on("userTyping", ({ senderId }) => {
      if (senderId !== selectedUser._id) return;
      if (get().typingUsers.includes(senderId)) return;
      set({ typingUsers: [...get().typingUsers, senderId] });
    });

    socket.on("userStopTyping", ({ senderId }) => {
      set({ typingUsers: get().typingUsers.filter((id) => id !== senderId) });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("userTyping");
    socket.off("userStopTyping");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
