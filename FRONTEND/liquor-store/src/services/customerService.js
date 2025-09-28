/**
 * Customer Service - API integration for customer management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class CustomerService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/customers`;
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
   * Get all customers with optional filtering
   */
  async getCustomers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filtering parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
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
        data: data.customers || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching customers:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get a specific customer by ID
   */
  async getCustomer(customerId) {
    try {
      const response = await fetch(`${this.baseURL}/${customerId}`, {
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
      console.error('Error fetching customer:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new customer
   */
  async createCustomer(customerData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(customerData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.customer || data,
        message: data.message || 'Customer created successfully'
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(customerId, customerData) {
    try {
      const response = await fetch(`${this.baseURL}/${customerId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(customerData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.customer || data,
        message: data.message || 'Customer updated successfully'
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete/deactivate a customer
   */
  async deleteCustomer(customerId) {
    try {
      const response = await fetch(`${this.baseURL}/${customerId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: data.message || 'Customer deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customer sales history
   */
  async getCustomerSales(customerId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = queryParams.toString() 
        ? `${this.baseURL}/${customerId}/sales?${queryParams}` 
        : `${this.baseURL}/${customerId}/sales`;

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
        data: data.sales || [],
        customer: data.customer,
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching customer sales:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Activate a customer
   */
  async activateCustomer(customerId) {
    try {
      const response = await fetch(`${this.baseURL}/${customerId}/activate`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.customer || data,
        message: data.message || 'Customer activated successfully'
      };
    } catch (error) {
      console.error('Error activating customer:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats() {
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
      console.error('Error fetching customer stats:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

export default new CustomerService();
