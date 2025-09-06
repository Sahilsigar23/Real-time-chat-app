import { create } from "zustand";
import api from "../lib/axios"; // ✅ custom axios instance with credentials
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false, 
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // ✅ Check current user session
  checkAuth: async () => {
    console.log("useAuthStore: Checking auth...");
    try {
      const res = await api.get("/auth/check");
      console.log("useAuthStore: Auth check successful:", res.data);
      set({ authUser: res.data });
      get().connectSocket();
    } catch (err) {
      console.error("useAuthStore: Auth check failed:", err.response?.data || err.message);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // ✅ Signup
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await api.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  // ✅ Login
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // ✅ Logout
  logout: async () => {
    try {
      await api.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (err) {
      toast.error(err.response?.data?.message || "Logout failed");
    }
  },

  // ✅ Update Profile
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await api.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Error in update profile:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // ✅ Connect socket
  connectSocket: () => {
    const { authUser } = get();
    console.log("useAuthStore: Connecting socket for user:", authUser?._id);
    if (!authUser || get().socket?.connected) return;

    const socket = io(SOCKET_URL, {
      query: { userId: authUser._id },
      withCredentials: true,
    });

    socket.connect();
    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      console.log("useAuthStore: Received online users:", userIds);
      set({ onlineUsers: userIds });
    });
  },

  // ✅ Disconnect socket
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
