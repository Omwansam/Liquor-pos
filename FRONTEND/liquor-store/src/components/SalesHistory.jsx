import { useState, useEffect } from 'react';
import SalesService from '../services/salesService';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Calendar,
  Download,
  Eye,
  CreditCard,
  Banknote,
  Smartphone,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  User,
  X,
  ChevronDown
} from 'lucide-react';

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    averageOrderValue: 0,
    todayRevenue: 0
  });

  // Load sales data on component mount
  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const result = await SalesService.getSales();
      if (result.success) {
        setSales(result.data);
        calculateStats(result.data);
      } else {
        setError(result.error || 'Failed to load sales data');
      }
    } catch (error) {
      setError('An error occurred while loading sales data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (salesData) => {
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = salesData.length;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenue = salesData
      .filter(sale => new Date(sale.created_at) >= today)
      .reduce((sum, sale) => sum + sale.total, 0);

    setStats({
      totalRevenue,
      totalSales,
      averageOrderValue,
      todayRevenue
    });
  };

  // Filter sales based on search, payment method, and date range
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toString().includes(searchTerm) ||
                         sale.payment_method.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPaymentMethod = selectedPaymentMethod === 'all' || sale.payment_method === selectedPaymentMethod;
    
    let matchesDateRange = true;
    if (dateRange !== 'all') {
      const saleDate = new Date(sale.created_at);
      const today = new Date();
      
      switch (dateRange) {
        case 'today':
          matchesDateRange = saleDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDateRange = saleDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDateRange = saleDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesPaymentMethod && matchesDateRange;
  });

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setShowSaleModal(true);
  };

  const getPaymentMethodIcon = (method) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'mpesa':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'card':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'mpesa':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Sale ID', 'Customer', 'Payment Method', 'Total', 'Date', 'Items'],
      ...filteredSales.map(sale => [
        sale.id,
        sale.customer_name || 'Walk-in Customer',
        sale.payment_method,
        sale.total,
        new Date(sale.created_at).toLocaleDateString(),
        sale.items?.length || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && sales.length === 0) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white/60">Loading sales history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tighter font-display">
              Sales History
            </h1>
            <p className="text-white/60 mt-2">
              Track and analyze your sales performance.
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center space-x-2"
          >
            <Download className="h-5 w-5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">KSH {stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/20">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Sales</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalSales.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <ShoppingCart className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Average Order</p>
                <p className="text-2xl font-bold text-white mt-1">KSH {stats.averageOrderValue.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Today's Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">KSH {stats.todayRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/20">
                <TrendingDown className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10 pr-4 py-3 w-full rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-primary text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex items-center space-x-4 overflow-x-auto">
              {/* Payment Method Filter */}
              <div className="relative">
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="form-input form-select px-4 py-3 rounded-lg focus:ring-primary focus:border-primary appearance-none pr-8"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              </div>

              {/* Date Range Filter */}
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="form-input form-select px-4 py-3 rounded-lg focus:ring-primary focus:border-primary appearance-none pr-8"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
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

        {/* Sales Table */}
        <div className="glassmorphism rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Sale ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/10">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Receipt className="h-5 w-5 text-white/40 mr-3" />
                        <span className="text-sm font-medium text-white">#{sale.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-white/40 mr-3" />
                        <span className="text-sm text-white">{sale.customer_name || 'Walk-in Customer'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getPaymentMethodColor(sale.payment_method)}`}>
                        {getPaymentMethodIcon(sale.payment_method)}
                        <span className="capitalize">{sale.payment_method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-white">KSH {sale.total.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-white/60">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(sale.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewSale(sale)}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">No sales found</p>
            <p className="text-white/40 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      {showSaleModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-dark rounded-lg border border-white/10 w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Sale Details #{selectedSale.id}</h3>
                <button
                  onClick={() => setShowSaleModal(false)}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Sale Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/60 mb-2">Customer</h4>
                    <p className="text-white">{selectedSale.customer_name || 'Walk-in Customer'}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/60 mb-2">Payment Method</h4>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getPaymentMethodColor(selectedSale.payment_method)}`}>
                      {getPaymentMethodIcon(selectedSale.payment_method)}
                      <span className="capitalize">{selectedSale.payment_method}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/60 mb-2">Date</h4>
                    <p className="text-white">{new Date(selectedSale.created_at).toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/60 mb-2">Total</h4>
                    <p className="text-white font-semibold">KSH {selectedSale.total.toFixed(2)}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-sm font-medium text-white/60 mb-3">Items Sold</h4>
                  <div className="space-y-2">
                    {selectedSale.items?.map((item, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{item.product_name}</p>
                          <p className="text-white/60 text-sm">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">KSH {(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-white/60 text-sm">KSH {item.price.toFixed(2)} each</p>
                        </div>
                      </div>
                    )) || (
                      <p className="text-white/60 text-center py-4">No item details available</p>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Subtotal:</span>
                      <span className="text-white">KSH {selectedSale.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Tax:</span>
                      <span className="text-white">KSH {selectedSale.tax?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                      <span className="text-white">Total:</span>
                      <span className="text-white">KSH {selectedSale.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;