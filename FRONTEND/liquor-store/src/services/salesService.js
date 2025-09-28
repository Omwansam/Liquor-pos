/**
 * Sales Service - API integration for sales management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class SalesService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/sales`;
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
   * Get all sales with optional filtering
   */
  async getSales(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filtering parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.payment_method) queryParams.append('payment_method', params.payment_method);
      if (params.employee_id) queryParams.append('employee_id', params.employee_id);
      if (params.customer_id) queryParams.append('customer_id', params.customer_id);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
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
        data: data.sales || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching sales:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get a specific sale by ID
   */
  async getSale(saleId) {
    try {
      const response = await fetch(`${this.baseURL}/${saleId}`, {
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
      console.error('Error fetching sale:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new sale
   */
  async createSale(saleData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(saleData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.sale || data,
        message: data.message || 'Sale created successfully'
      };
    } catch (error) {
      console.error('Error creating sale:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update an existing sale
   */
  async updateSale(saleId, saleData) {
    try {
      const response = await fetch(`${this.baseURL}/${saleId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(saleData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.sale || data,
        message: data.message || 'Sale updated successfully'
      };
    } catch (error) {
      console.error('Error updating sale:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete a sale
   */
  async deleteSale(saleId) {
    try {
      const response = await fetch(`${this.baseURL}/${saleId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: data.message || 'Sale deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting sale:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get sale by receipt number
   */
  async getSaleByReceipt(receiptNumber) {
    try {
      const response = await fetch(`${this.baseURL}/receipt/${receiptNumber}`, {
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
      console.error('Error fetching sale by receipt:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get sales statistics
   */
  async getSalesStats(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.days) queryParams.append('days', params.days);

      const url = queryParams.toString() 
        ? `${this.baseURL}/stats?${queryParams}` 
        : `${this.baseURL}/stats`;

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
        data
      };
    } catch (error) {
      console.error('Error fetching sales stats:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

export default new SalesService();
