import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SalesService from '../services/salesService';
import { 
  Search, 
  Filter, 
  Download,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

const SalesHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [expandedSale, setExpandedSale] = useState(null);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [followLatest, setFollowLatest] = useState(true); // Auto-follow newest sale unless user selects
  
  // Filters
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    employeeId: user?.id || 'all', // Default to current user's sales
    paymentType: 'all',
    status: 'all'
  });

  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        per_page: 10
      };

      // Add filters
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.employeeId !== 'all') params.employee_id = filters.employeeId;
      if (filters.paymentType !== 'all') params.payment_method = filters.paymentType;
      if (filters.status !== 'all') params.status = filters.status;

      const salesResult = await SalesService.getSales(params);
      
      if (salesResult.success) {
        const fetchedSales = salesResult.data || salesResult.sales || [];
        setSales(fetchedSales);
        setPagination(salesResult.pagination || {});
        // Auto-select latest sale when following latest
        if (followLatest && fetchedSales.length > 0) {
          setSelectedSale(fetchedSales[0]);
          setExpandedSale(fetchedSales[0].id);
        }
      } else {
        setError(salesResult.error || 'Failed to load sales');
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  // Update filters when user changes
  useEffect(() => {
    if (user?.id && filters.employeeId === 'all') {
      setFilters(prev => ({ ...prev, employeeId: user.id }));
    }
  }, [user?.id, filters.employeeId]);

  // Load sales when component mounts or when page/filters change
  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Keep details synced to newest sale whenever sales list updates and followLatest is on
  useEffect(() => {
    if (followLatest && sales && sales.length > 0) {
      setSelectedSale(sales[0]);
      setExpandedSale(sales[0].id);
    }
  }, [sales, followLatest]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination.pages || 1)) {
      setCurrentPage(newPage);
    }
  };

  const toggleExpandedSale = (saleId) => {
    setFollowLatest(false); // User took control
    setExpandedSale(expandedSale === saleId ? null : saleId);
    setSelectedSale(expandedSale === saleId ? null : sales.find(s => s.id === saleId));
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'refunded':
        return 'bg-orange-500/20 text-orange-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const getPaymentIcon = (paymentMethod) => {
    switch (paymentMethod?.toLowerCase()) {
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'mpesa':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export sales data');
  };

  const handleReprint = (sale) => {
    // TODO: Implement reprint functionality
    console.log('Reprint receipt for sale:', sale.id);
  };

  const handleRefund = (sale) => {
    // TODO: Implement refund functionality
    console.log('Process refund for sale:', sale.id);
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
      <header className="bg-background-dark border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
          <button
              onClick={() => navigate('/pos')}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
              <ArrowLeft className="h-5 w-5" />
          </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">*</span>
              </div>
              <h1 className="text-2xl font-bold text-white font-display">The Vault</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {/* Sales History Section */}
        <div className="w-full">
          {/* Title Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Sales History</h2>
                <p className="text-white/60">View and manage past transactions.</p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="mb-6 w-full">
            <div className="flex items-center space-x-4 w-full">
              <div className="flex-1">
                <label className="block text-sm font-medium text-white/60 mb-2">Date Range</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="mm/dd/yyyy"
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-white/40" />
                </div>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-white/60 mb-2">Employee</label>
                <select
                  value={filters.employeeId}
                  onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Employees</option>
                  <option value={user?.id}>My Sales ({user?.name || 'Current User'})</option>
                </select>
        </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-white/60 mb-2">Payment Type</label>
                <select
                  value={filters.paymentType}
                  onChange={(e) => handleFilterChange('paymentType', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadSales}
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table and Sidebar Container */}
          <div className="flex gap-6">
            {/* Sales Table */}
            <div className="flex-1 bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                      TRANSACTION ID
                  </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                      DATE & TIME
                  </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                      EMPLOYEE
                  </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                      TOTAL
                  </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                      STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/10">
                  {sales.map((sale) => (
                    <React.Fragment key={sale.id}>
                      <tr 
                        className="hover:bg-white/5 cursor-pointer"
                        onClick={() => toggleExpandedSale(sale.id)}
                      >
                    <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-primary font-medium">#{sale.id}</span>
                            {expandedSale === sale.id ? (
                              <ChevronUp className="h-4 w-4 text-white/60" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-white/60" />
                            )}
                      </div>
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(sale.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {sale.employee?.name || sale.employee_name || 'Unknown'}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          KSH {(sale.total || sale.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                            {getStatusIcon(sale.status)}
                            <span className="capitalize">{sale.status || 'Completed'}</span>
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded Row */}
                      {expandedSale === sale.id && (
                        <tr className="bg-white/5">
                          <td colSpan="5" className="px-6 py-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium text-white mb-2">Items</h4>
                                  <div className="space-y-1">
                                    {sale.items?.map((item, index) => (
                                      <div key={index} className="text-sm text-white/80">
                                        {item.quantity} x {item.product_name}
                                      </div>
                                    )) || <div className="text-sm text-white/60">No items found</div>}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-white mb-2">Payment</h4>
                                  <div className="flex items-center space-x-2 text-sm text-white/80">
                                    {getPaymentIcon(sale.payment_method)}
                                    <span className="capitalize">{sale.payment_method}</span>
                                    {sale.payment_method === 'card' && sale.card_last_four && (
                                      <span>(**** {sale.card_last_four})</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center space-x-3 pt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReprint(sale);
                                  }}
                                  className="flex items-center space-x-2 text-white/60 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                                >
                                  <Printer className="h-4 w-4" />
                                  <span>Reprint</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRefund(sale);
                                  }}
                                  className="flex items-center space-x-2 text-white/60 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  <span>Refund</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                ))}
              </tbody>
                </table>
              </div>
            </div>

            {/* Transaction Details Sidebar - always visible, follows latest unless user selects */}
            <div className="w-96 bg-background-dark border-l border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Transaction Details</h3>
              {(() => {
                const detailSale = selectedSale || (followLatest ? (sales && sales[0]) : null);
                if (!detailSale) {
                  return (
                    <div className="text-white/60 text-sm">{sales && sales.length === 0 ? 'No sales found.' : 'No sale selected.'}</div>
                  );
                }
                return (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Transaction ID</label>
                      <p className="text-white">#{detailSale.id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Date</label>
                      <p className="text-white">{new Date(detailSale.created_at || detailSale.sale_date).toLocaleDateString('en-CA')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Time</label>
                      <p className="text-white">{new Date(detailSale.created_at || detailSale.sale_date).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                      })}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Employee</label>
                      <p className="text-white">{detailSale.employee?.name || detailSale.employee_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Payment Type</label>
                      <p className="text-white capitalize">{detailSale.payment_method}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Status</label>
                      <p className="text-green-400 capitalize">{detailSale.status || 'Completed'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Items</label>
                      <div className="space-y-1">
                        {detailSale.items?.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-white">{item.quantity} x {item.product_name}</span>
                            <span className="text-white">KSH {(((item.unit_price || item.price || 0) * item.quantity)).toFixed(2)}</span>
                          </div>
                        )) || <div className="text-sm text-white/60">No items found</div>}
                      </div>
                    </div>
                    
                    <div className="border-t border-white/10 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-white">Total</span>
                        <span className="text-white font-bold">KSH {(detailSale.total || detailSale.total_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-white/60">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} sales
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={`page-${pageNum}`}
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
                  disabled={currentPage === pagination.pages}
                  className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg max-w-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
