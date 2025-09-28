/**
 * Supplier Service - API integration for supplier management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class SupplierService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/suppliers`;
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
   * Get all suppliers with optional filtering
   */
  async getSuppliers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filtering parameters
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
        data: data.suppliers || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get a specific supplier by ID
   */
  async getSupplier(supplierId) {
    try {
      const response = await fetch(`${this.baseURL}/${supplierId}`, {
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
      console.error('Error fetching supplier:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new supplier
   */
  async createSupplier(supplierData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(supplierData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.supplier || data,
        message: data.message || 'Supplier created successfully'
      };
    } catch (error) {
      console.error('Error creating supplier:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update an existing supplier
   */
  async updateSupplier(supplierId, supplierData) {
    try {
      const response = await fetch(`${this.baseURL}/${supplierId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(supplierData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.supplier || data,
        message: data.message || 'Supplier updated successfully'
      };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete/deactivate a supplier
   */
  async deleteSupplier(supplierId) {
    try {
      const response = await fetch(`${this.baseURL}/${supplierId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: data.message || 'Supplier deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get supplier products
   */
  async getSupplierProducts(supplierId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = queryParams.toString() 
        ? `${this.baseURL}/${supplierId}/products?${queryParams}` 
        : `${this.baseURL}/${supplierId}/products`;

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
        data: data.products || [],
        supplier: data.supplier,
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get supplier statistics
   */
  async getSupplierStats() {
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
      console.error('Error fetching supplier stats:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

export default new SupplierService();
