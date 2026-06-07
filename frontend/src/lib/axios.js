import axios from "axios";

// VITE_API_URL lets a separately-deployed frontend point at the backend's
// absolute URL (e.g. https://<backend>.onrender.com/api). Falls back to a
// relative "/api" for combined single-origin deployments, and to localhost
// during local dev.
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === "development" ? "http://localhost:5000/api" : "/api");

export const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // ✅ allow cookies (JWT)
});

// Also export as default for backward compatibility
export default axiosInstance;
