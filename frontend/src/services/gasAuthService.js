import { API_URL as BASE_API_URL } from '../config';
const API_URL = `${BASE_API_URL}/auth`;

export const gasAuthService = {
  async requestReset(email) {
    try {
      const response = await fetch(`${API_URL}/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await response.json();
    } catch (error) {
      console.error("Auth Service Error:", error);
      return { success: false, message: "Error de comunicación con el servidor." };
    }
  },

  async verifyPin(email, pin) {
    try {
      const response = await fetch(`${API_URL}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      return await response.json();
    } catch (error) {
      console.error("Auth Service Error:", error);
      return { success: false, message: "Error de comunicación con el servidor." };
    }
  },

  async updatePassword(email, pin, newPassword) {
    try {
      const response = await fetch(`${API_URL}/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin, new_password: newPassword }),
      });
      return await response.json();
    } catch (error) {
      console.error("Auth Service Error:", error);
      return { success: false, message: "Error de comunicación con el servidor." };
    }
  }
};
