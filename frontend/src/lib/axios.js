import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5000/api"
      : "/api",
  withCredentials: true, // ✅ allow cookies (JWT)
});

// Also export as default for backward compatibility
export default axiosInstance;
