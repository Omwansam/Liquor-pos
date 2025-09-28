/**
 * Inventory Service - API integration for inventory management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class InventoryService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/inventory`;
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
   * Get all inventory transactions with optional filtering
   */
  async getTransactions(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filtering parameters
      if (params.product_id) queryParams.append('product_id', params.product_id);
      if (params.transaction_type) queryParams.append('transaction_type', params.transaction_type);
      if (params.created_by) queryParams.append('created_by', params.created_by);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = queryParams.toString() ? `${this.baseURL}/transactions?${queryParams}` : `${this.baseURL}/transactions`;
      
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
        data: data.transactions || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get a specific inventory transaction by ID
   */
  async getTransaction(transactionId) {
    try {
      const response = await fetch(`${this.baseURL}/transactions/${transactionId}`, {
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
      console.error('Error fetching transaction:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new inventory transaction
   */
  async createTransaction(transactionData) {
    try {
      const response = await fetch(`${this.baseURL}/transactions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(transactionData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.transaction || data,
        message: data.message || 'Transaction created successfully'
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Restock a product
   */
  async restockProduct(productId, restockData) {
    try {
      const response = await fetch(`${this.baseURL}/restock`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          product_id: productId,
          ...restockData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.transaction || data,
        message: data.message || 'Product restocked successfully'
      };
    } catch (error) {
      console.error('Error restocking product:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Adjust inventory
   */
  async adjustInventory(productId, adjustmentData) {
    try {
      const response = await fetch(`${this.baseURL}/adjust`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          product_id: productId,
          ...adjustmentData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.transaction || data,
        message: data.message || 'Inventory adjusted successfully'
      };
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(params = {}) {
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
      console.error('Error fetching inventory stats:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get product inventory history
   */
  async getProductHistory(productId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = queryParams.toString() 
        ? `${this.baseURL}/products/${productId}/history?${queryParams}` 
        : `${this.baseURL}/products/${productId}/history`;

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
        data: data.transactions || [],
        product: data.product,
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching product history:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

export default new InventoryService();
