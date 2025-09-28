/**
 * User Service - API integration for user/employee management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class UserService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/users`;
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const token = localStorage.getItem('liquor_pos_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Get all users with optional filtering
   */
  async getUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filtering parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.role) queryParams.append('role', params.role);
      if (params.is_active) queryParams.append('is_active', params.is_active);
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = queryParams.toString() ? `${this.baseURL}?${queryParams}` : this.baseURL;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.users || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get a specific user by ID
   */
  async getUser(userId) {
    try {
      const response = await fetch(`${this.baseURL}/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.user || data,
        message: data.message || 'User created successfully'
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(userId, userData) {
    try {
      const response = await fetch(`${this.baseURL}/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.user || data,
        message: data.message || 'User updated successfully'
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete/deactivate a user
   */
  async deleteUser(userId) {
    try {
      const response = await fetch(`${this.baseURL}/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: data.message || 'User deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId, passwordData) {
    try {
      const response = await fetch(`${this.baseURL}/${userId}/password`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: data.message || 'Password updated successfully'
      };
    } catch (error) {
      console.error('Error updating password:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const response = await fetch(`${this.baseURL}/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

export default new UserService();
