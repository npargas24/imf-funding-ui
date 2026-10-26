// Locally the API runs on its own port; in Azure it shares the same address as the React app
const BASE_URL = import.meta.env.DEV ? "http://localhost:5258/api" : "/api";

export const getToken = () => localStorage.getItem("token");

export const getUser = () => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

export const saveSession = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export async function api(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // An expired or invalid token: clear the session and go back to the login page
  if (res.status === 401 && token) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Your session has expired. Please log in again.");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // Validation errors come back as { errors: { Field: ["message"] } }
    const validation = data?.errors ? Object.values(data.errors).flat().join(" ") : null;
    throw new Error(validation || data?.title || `Request failed (${res.status})`);
  }

  return data;
}
