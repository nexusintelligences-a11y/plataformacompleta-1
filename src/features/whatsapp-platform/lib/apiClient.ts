// API client for making requests to the Express backend

const API_BASE = "";  // Same origin since Express serves both frontend and API
const USER_ID_WHATSAPP = "default";  // Default user ID for single-user WhatsApp setup

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok && response.status !== 400) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

export { USER_ID_WHATSAPP };
