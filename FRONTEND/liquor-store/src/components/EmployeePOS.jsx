import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProductService from '../services/productService';
import SalesService from '../services/salesService';
import CustomerService from '../services/customerService';
import CategoryService from '../services/categoryService';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone,
  LogOut,
  User,
  Receipt,
  Package,
  ScanLine,
  Printer,
  RefreshCw,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  Grid3X3,
  List,
  ChevronDown,
  Lock
} from 'lucide-react';

const EmployeePOS = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersResult, categoriesResult] = await Promise.all([
        CustomerService.getCustomers(),
        CategoryService.getCategories({ active_only: true })
      ]);
      
      if (customersResult.success) {
        setCustomers(customersResult.data);
      }
      
      if (categoriesResult.success) {
        setCategories(categoriesResult.data);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setError(null); // Clear previous errors
      
      const productsResult = await ProductService.getProducts({
        active_only: true,
        employee_pos: true,
        page: currentPage,
        per_page: 30,
        search: searchTerm || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined
      });

      if (productsResult.success) {
        setProducts(productsResult.data);
        setTotalPages(productsResult.pagination.pages || 1);
        setTotalProducts(productsResult.pagination.total || 0);
      } else {
        setError('Failed to load products');
        // Keep existing products on error to avoid empty state
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
      // Keep existing products on error to avoid empty state
    } finally {
      setLoadingProducts(false);
    }
  }, [currentPage, searchTerm, selectedCategory]);

  // Load products when page or category changes (immediate)
  useEffect(() => {
    loadProducts();
  }, [currentPage, selectedCategory, loadProducts]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, loadProducts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);


  // Since we're doing server-side pagination, we don't need client-side filtering
  const filteredProducts = products;

  // Get categories from database
  const categoryList = ['all', ...categories.map(cat => cat.name)];

  // Pagination functions
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleCategoryChange = (category) => {
    // Only update if the category is actually different
    if (category !== selectedCategory) {
      setSelectedCategory(category);
      setCurrentPage(1); // Reset to first page when changing category
    }
  };

  // Cart functions
  const addToCart = (product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: '', phone: '', email: '' });
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.16; // 16% VAT
  const total = subtotal + tax;

  // Process payment
  const handlePayment = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      const saleData = {
        customer_name: customerInfo.name || 'Walk-in Customer',
        customer_phone: customerInfo.phone || null,
        customer_email: customerInfo.email || null,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal,
        tax,
        total
      };

      const result = await SalesService.createSale(saleData);
      if (result.success) {
        setLastSale(result.data);
        setShowReceipt(true);
        clearCart();
        setShowPaymentModal(false);
        loadData(); // Refresh products to update stock
      } else {
        setError(result.error || 'Failed to process sale');
      }
    } catch {
      setError('An error occurred while processing the sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find(img => img.is_primary) || product.images[0];
      const imageUrl = primaryImage.image_url.startsWith('http') 
        ? primaryImage.image_url 
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${primaryImage.image_url}`;
      return imageUrl;
    }
    
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

  const getStockStatusColor = (product) => {
    if (product.stock > product.min_stock_level) {
      return 'text-green-400';
    } else if (product.stock > 0) {
      return 'text-yellow-400';
    } else {
      return 'text-red-400';
    }
  };

  const getStockStatusText = (product) => {
    if (product.stock > product.min_stock_level) {
      return 'In Stock';
    } else if (product.stock > 0) {
      return 'Low Stock';
    } else {
      return 'Out of Stock';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white/60">Loading POS system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <header className="bg-background-dark border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">★</span>
              </div>
              <h1 className="text-2xl font-bold text-white font-display">The Vault</h1>
            </div>
          </div>
          
          {/* Right side - Notifications and Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
              </button>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">{user?.name || 'User'}</div>
                  <div className="text-xs text-white/60 capitalize">{user?.role || 'Employee'}</div>
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-background-dark border border-white/10 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Products Section */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search products or scan barcode..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="form-input pl-10 pr-4 py-3 w-full rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              {/* Category Filters */}
              <div className="flex items-center space-x-2 overflow-x-auto">
                {categoryList.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {category === 'all' ? 'All Products' : category}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-primary text-white' 
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-primary text-white' 
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Display */}
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="relative rounded-lg overflow-hidden hover:scale-105 transition-all duration-300 group cursor-pointer h-64"
                  onClick={() => addToCart(product)}
                >
                  {/* Product Image - Full Card Background */}
                  <div className="absolute inset-0">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={getProductImage(product)} 
                        alt={product.name}
                        className="w-full h-full object-contain object-center bg-gradient-to-br from-amber-50 to-amber-100"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center ${
                        product.images && product.images.length > 0 ? 'hidden' : ''
                      }`}
                      style={{ display: product.images && product.images.length > 0 ? 'none' : 'flex' }}
                    >
                      <Package className="h-12 w-12 text-amber-600" />
                    </div>
                  </div>

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Product Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-semibold text-white mb-1 truncate">{product.name}</h3>
                    <p className="text-lg font-bold text-white mb-1">KSH {product.price.toFixed(2)}</p>
                    <p className="text-white/80 text-xs">Stock: {product.stock}</p>
                  </div>

                  {/* Stock Status */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.stock > product.min_stock_level 
                        ? 'bg-green-500/20 text-green-400'
                        : product.stock > 0 
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {getStockStatusText(product)}
                    </span>
                  </div>

                  {/* Add to Cart Button - Shows on Hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
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
                    {filteredProducts.map((product) => (
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
                          KSH {product.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${getStockStatusColor(product)}`}>
                            {getStockStatusText(product)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => addToCart(product)}
                            className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                          >
                            Add to Cart
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && !loadingProducts && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">No products found</p>
            </div>
          )}

          {/* Loading State */}
          {loadingProducts && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-white/60">Loading products...</p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && !loadingProducts && (
            <div className="flex items-center justify-between mt-6 px-6 py-4 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60">
                Showing {((currentPage - 1) * 30) + 1} to {Math.min(currentPage * 30, totalProducts)} of {totalProducts} products
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="w-96 bg-background-dark border-l border-white/10 flex flex-col">
          {/* Cart Header */}
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Current Sale</h2>
          </div>

          {/* Barcode Input */}
          <div className="p-6 border-b border-white/10">
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Scan or enter barcode"
                className="form-input pl-10 pr-4 py-2 w-full rounded-lg focus:ring-primary focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">Cart is empty</p>
                <p className="text-white/40 text-sm">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {/* Product Image */}
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                        {item.images && item.images.length > 0 ? (
                          <img 
                            src={item.images[0].image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-full h-full flex items-center justify-center ${
                            item.images && item.images.length > 0 ? 'hidden' : ''
                          }`}
                          style={{ display: item.images && item.images.length > 0 ? 'none' : 'flex' }}
                        >
                          <Package className="h-5 w-5 text-white/70" />
                        </div>
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">{item.name}</h4>
                        <p className="text-xs text-white/60 mb-2">KSH {item.price.toFixed(2)}</p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center transition-colors"
                            >
                              <Minus className="h-3 w-3 text-white" />
                            </button>
                            <span className="text-white font-medium text-sm px-2">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center transition-colors"
                            >
                              <Plus className="h-3 w-3 text-white" />
                            </button>
                          </div>
                          <p className="text-white font-semibold text-sm">KSH {(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-white/10 space-y-4">
              {/* Sale Summary */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal:</span>
                  <span className="text-white">KSH {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">VAT (16%):</span>
                  <span className="text-white">KSH {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Discount:</span>
                  <span className="text-white">KSH 0</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                  <span className="text-white">Total:</span>
                  <span className="text-primary">KSH {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
              >
                <Lock className="h-4 w-4" />
                <span>Proceed to Checkout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-dark rounded-lg border border-white/10 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Payment Method</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Payment Methods */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { method: 'cash', label: 'Cash', icon: Banknote },
                    { method: 'card', label: 'Card', icon: CreditCard },
                    { method: 'mpesa', label: 'M-Pesa', icon: Smartphone }
                  ].map(({ method, label, icon }) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`p-4 rounded-lg border transition-colors ${
                        paymentMethod === method
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {icon === Banknote && <Banknote className="h-6 w-6 mx-auto mb-2" />}
                      {icon === CreditCard && <CreditCard className="h-6 w-6 mx-auto mb-2" />}
                      {icon === Smartphone && <Smartphone className="h-6 w-6 mx-auto mb-2" />}
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Total */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-white/60 text-sm">Total Amount</p>
                    <p className="text-2xl font-bold text-white">KSH {total.toFixed(2)}</p>
                  </div>
                </div>

                {/* Process Payment Button */}
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-dark rounded-lg border border-white/10 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Sale Receipt</h3>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Printer className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Sale Details */}
                <div className="bg-white/5 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60">Sale ID:</span>
                    <span className="text-white">#{lastSale.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Customer:</span>
                    <span className="text-white">{lastSale.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Payment:</span>
                    <span className="text-white capitalize">{lastSale.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Date:</span>
                    <span className="text-white">{new Date(lastSale.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                    <span className="text-white">Total:</span>
                    <span className="text-white">KSH {lastSale.total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowReceipt(false)}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg max-w-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePOS;