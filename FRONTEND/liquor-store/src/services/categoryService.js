/**
 * Category Service - API integration for category management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class CategoryService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/categories`;
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
   * Get all categories
   */
  async getCategories(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.search) queryParams.append('search', params.search);
      if (params.active_only) queryParams.append('active_only', params.active_only);
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
        data: data.categories || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get a specific category by ID
   */
  async getCategory(categoryId) {
    try {
      const response = await fetch(`${this.baseURL}/${categoryId}`, {
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
      console.error('Error fetching category:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.category || data,
        message: data.message || 'Category created successfully'
      };
    } catch (error) {
      console.error('Error creating category:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(categoryId, categoryData) {
    try {
      const response = await fetch(`${this.baseURL}/${categoryId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.category || data,
        message: data.message || 'Category updated successfully'
      };
    } catch (error) {
      console.error('Error updating category:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete/deactivate a category
   */
  async deleteCategory(categoryId) {
    try {
      const response = await fetch(`${this.baseURL}/${categoryId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: data.message || 'Category deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats() {
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
      console.error('Error fetching category stats:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

export default new CategoryService();
