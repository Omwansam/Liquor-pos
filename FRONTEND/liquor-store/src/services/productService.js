/**
 * Product Service - API integration for product management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class ProductService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/products`;
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
   * Get authentication headers for file uploads
   */
  getAuthHeadersForUpload() {
    const token = localStorage.getItem('liquor_pos_token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Get all products with optional filtering
   */
  async getProducts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filtering parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
      if (params.status) queryParams.append('status', params.status);
      if (params.active_only) queryParams.append('active_only', params.active_only);
      if (params.low_stock) queryParams.append('low_stock', params.low_stock);
      if (params.employee_pos) queryParams.append('employee_pos', params.employee_pos);
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
        data: data.products || [],
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId) {
    try {
      const response = await fetch(`${this.baseURL}/${productId}`, {
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
      console.error('Error fetching product:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new product
   */
  async createProduct(productData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.product || data,
        message: data.message || 'Product created successfully'
      };
    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Upload product image
   */
  async uploadProductImage(productId, imageFile, isPrimary = true) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('is_primary', isPrimary);

      const response = await fetch(`${API_BASE_URL}/product-images/product/${productId}`, {
        method: 'POST',
        headers: this.getAuthHeadersForUpload(),
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data,
        message: data.message || 'Image uploaded successfully'
      };
    } catch (error) {
      console.error('Error uploading product image:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId, productData) {
    try {
      const response = await fetch(`${this.baseURL}/${productId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.product || data,
        message: data.message || 'Product updated successfully'
      };
    } catch (error) {
      console.error('Error updating product:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete/deactivate a product
   */
  async deleteProduct(productId) {
    try {
      const response = await fetch(`${this.baseURL}/${productId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: data.message || 'Product deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId, stockData) {
    try {
      const response = await fetch(`${this.baseURL}/${productId}/stock`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(stockData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: data.product || data,
        message: data.message || 'Stock updated successfully'
      };
    } catch (error) {
      console.error('Error updating stock:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = queryParams.toString() 
        ? `${this.baseURL}/low-stock?${queryParams}` 
        : `${this.baseURL}/low-stock`;

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
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats() {
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
      console.error('Error fetching product stats:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

export default new ProductService();
