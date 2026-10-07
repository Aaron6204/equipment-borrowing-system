import axios from "axios";

// Where the API lives. If VITE_API_URL is not set, the API is assumed to run on
// the same computer that serves this page, on port 5000. Because it uses the
// address in the browser bar, it works on the laptop (localhost) and on a phone
// that opened the site through the laptop's Wi-Fi address.
const defaultApiUrl = `http://${window.location.hostname}:5000/api`;

// The single axios instance used by the whole application.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
  headers: { "Content-Type": "application/json" },
});

// Send the signed-in user's token with every protected API request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sebs-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turns any failed request into a readable message.
// The server always answers errors as { "message": "..." }.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.code === "ERR_NETWORK") return "Cannot reach the server. Is the API running?";
    return error.message;
  }
  return "Something went wrong";
}

export default api;
