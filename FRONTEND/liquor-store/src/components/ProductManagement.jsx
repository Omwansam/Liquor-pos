import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductService from '../services/productService';
import CategoryService from '../services/categoryService';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Package, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
  Grid3X3,
  List,
  Bell
} from 'lucide-react';

const ProductManagement = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    category_id: '',
    barcode: '',
    price: '',
    cost: '',
    stock: '',
    min_stock_level: '',
    max_stock_level: '',
    description: '',
    brand: '',
    size: '',
    alcohol_content: '',
    country_of_origin: '',
    supplier: '',
    is_active: true
  });

  const [stockData, setStockData] = useState({
    stock: ''
  });

  // Load products and categories on component mount
  useEffect(() => {
    loadProducts();
    loadCategories();
    loadStats();
  }, [currentPage, searchTerm, selectedCategory, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        per_page: 20
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (statusFilter !== 'all') params.status = statusFilter;

      const result = await ProductService.getProducts(params);
      
      if (result.success) {
        setProducts(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.error || 'Failed to load products');
      }
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await CategoryService.getCategories({ active_only: true });
      if (result.success) {
        setCategories(result.data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadStats = async () => {
    try {
      const result = await ProductService.getProductStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'In Stock':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Low Stock':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'Out of Stock':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const productData = {
        name: formData.name,
        category: formData.category,
        category_id: parseInt(formData.category_id) || null,
        barcode: formData.barcode || '',
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        stock: parseInt(formData.stock),
        min_stock_level: parseInt(formData.min_stock_level),
        max_stock_level: parseInt(formData.max_stock_level),
        description: formData.description || '',
        brand: formData.brand || '',
        size: formData.size || '',
        alcohol_content: formData.alcohol_content ? parseFloat(formData.alcohol_content) : null,
        country_of_origin: formData.country_of_origin || '',
        supplier: formData.supplier || '',
        is_active: formData.is_active
      };

      let result;
      if (editingProduct) {
        result = await ProductService.updateProduct(editingProduct.id, productData);
      } else {
        result = await ProductService.createProduct(productData);
      }

      if (result.success) {
        setShowModal(false);
        setEditingProduct(null);
        resetForm();
        loadProducts();
        loadStats();
        // Show success message
        setError(null);
        // You could add a success notification here
      } else {
        setError(result.error || 'Failed to save product');
      }
    } catch (err) {
      setError('Failed to save product');
      console.error('Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const result = await ProductService.updateStock(selectedProduct.id, {
        stock: parseInt(stockData.stock)
      });

      if (result.success) {
        setShowStockModal(false);
        setSelectedProduct(null);
        setStockData({ stock: '' });
        loadProducts();
        loadStats();
        setError(null);
        // You could add a success notification here
      } else {
        setError(result.error || 'Failed to update stock');
      }
    } catch (err) {
      setError('Failed to update stock');
      console.error('Error updating stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    navigate(`/admin/products/edit/${product.id}`);
  };

  const handleStockUpdateClick = (product) => {
    setSelectedProduct(product);
    setStockData({ stock: product.stock.toString() });
    setShowStockModal(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setLoading(true);
        const result = await ProductService.deleteProduct(productId);
        
        if (result.success) {
          loadProducts();
          loadStats();
          setError(null);
          // You could add a success notification here
        } else {
          setError(result.error || 'Failed to delete product');
        }
      } catch (err) {
        setError('Failed to delete product');
        console.error('Error deleting product:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const openModal = () => {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      category_id: '',
      barcode: '',
      price: '',
      cost: '',
      stock: '',
      min_stock_level: '10',
      max_stock_level: '100',
      description: '',
      brand: '',
      size: '',
      alcohol_content: '',
      country_of_origin: '',
      supplier: '',
      is_active: true
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading products...</span>
      </div>
    );
  }

  // Get categories for filter buttons - use all available categories, not just from current products
  const allCategories = ['All', ...categories.map(cat => cat.name)];

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'In Stock':
        return 'text-green-400';
      case 'Low Stock':
        return 'text-yellow-400';
      case 'Out of Stock':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getProductImage = (product) => {
    // Check if product has images and get the primary image
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find(img => img.is_primary) || product.images[0];
      const imageUrl = primaryImage.image_url.startsWith('http') 
        ? primaryImage.image_url 
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${primaryImage.image_url}`;
      return imageUrl;
    }
    
    // Fallback to category-based background colors
    const categoryColors = {
      'Whiskey': 'bg-amber-800',
      'Vodka': 'bg-gray-300',
      'Champagne': 'bg-orange-400',
      'Cognac': 'bg-amber-700',
      'Tequila': 'bg-teal-600',
      'Wine': 'bg-red-800',
      'Gin': 'bg-blue-400'
    };
    return categoryColors[product.category] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Header with Title and Add Button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Products Management</h1>
          <button
            onClick={() => navigate('/admin/products/add')}
            className="flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            + Add Product
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-4 mb-8 overflow-x-auto">
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => {
                if (category === 'All') {
                  setSelectedCategory('all');
                } else {
                  setSelectedCategory(category);
                }
                setCurrentPage(1);
              }}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                (category === 'All' && selectedCategory === 'all') || 
                (category !== 'All' && selectedCategory === category)
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'card' 
                  ? 'bg-primary text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <Grid3X3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table' 
                  ? 'bg-primary text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          
          {stats && (
            <div className="text-sm text-white/60">
              Showing {products.length} of {stats.total_products} products
            </div>
          )}
      </div>

      {/* Error Message */}
      {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
          <button 
            onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 group">
                {/* Product Image */}
                <div className="h-48 relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={getProductImage(product)} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-full h-full ${getProductImage(product)} flex items-center justify-center ${
                      product.images && product.images.length > 0 ? 'hidden' : ''
                    }`}
                    style={{ display: product.images && product.images.length > 0 ? 'none' : 'flex' }}
                  >
                    <Package className="h-16 w-16 text-white/30" />
                  </div>
                  
                  {/* Action buttons overlay */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <Edit className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={() => handleStockUpdateClick(product)}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4 text-white" />
                      </button>
          <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
          >
                        <Trash2 className="h-4 w-4 text-white" />
          </button>
        </div>
              </div>
            </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1 truncate">{product.name}</h3>
                  <p className="text-white/60 text-sm mb-2">{product.category}</p>
                  <p className="text-xl font-bold text-white mb-2">${product.price.toFixed(2)}</p>
                  <p className={`text-sm font-medium ${getStockStatusColor(product.status)}`}>
                    {product.status}
                  </p>
            </div>
            </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="glassmorphism rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
                <thead className="bg-white/5">
              <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Product
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Category
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Price
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Stock
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Status
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
                <tbody className="bg-transparent divide-y divide-white/10">
              {products.map((product) => (
                    <tr key={product.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center mr-3 overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={getProductImage(product)} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to placeholder if image fails to load
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full ${getProductImage(product)} flex items-center justify-center ${
                                product.images && product.images.length > 0 ? 'hidden' : ''
                              }`}
                              style={{ display: product.images && product.images.length > 0 ? 'none' : 'flex' }}
                            >
                              <Package className="h-5 w-5 text-white/70" />
                            </div>
                          </div>
                      <div>
                            <div className="text-sm font-medium text-white">{product.name}</div>
                            <div className="text-sm text-white/60">{product.barcode}</div>
                      </div>
                    </div>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {product.category}
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    ${product.price.toFixed(2)}
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {product.stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(product.status)}
                          <span className="ml-2 text-sm text-white">{product.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                            className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStockUpdateClick(product)}
                            className="text-green-400 hover:text-green-300"
                        title="Update Stock"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                            className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.has_prev}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-4 py-2 text-white/60">
                Page {currentPage} of {pagination.pages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.has_next}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <input
                      type="text"
                      value={formData.size}
                      onChange={(e) => setFormData({...formData, size: e.target.value})}
                      placeholder="e.g., 750ml, 1L"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                    <input
                      type="number"
                      value={formData.min_stock_level}
                      onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
                    <input
                      type="number"
                      value={formData.max_stock_level}
                      onChange={(e) => setFormData({...formData, max_stock_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alcohol Content (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.alcohol_content}
                      onChange={(e) => setFormData({...formData, alcohol_content: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
                    <input
                      type="text"
                      value={formData.country_of_origin}
                      onChange={(e) => setFormData({...formData, country_of_origin: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Stock - {selectedProduct.name}
              </h3>
              
              <form onSubmit={handleStockUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock: {selectedProduct.stock}</label>
                  <input
                    type="number"
                    required
                    value={stockData.stock}
                    onChange={(e) => setStockData({...stockData, stock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowStockModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;