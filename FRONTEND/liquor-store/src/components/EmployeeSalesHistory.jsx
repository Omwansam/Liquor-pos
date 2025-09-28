import { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';

const EmployeeSalesHistory = ({ employeeId, onClose }) => {
  const { sales, products, customers } = useApp();
  const [range, setRange] = useState('all'); // 'all' | 'today'

  const downloadCSV = (filename, headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const cell = r[h] != null ? String(r[h]) : '';
        const escaped = '"' + cell.replaceAll('"', '""') + '"';
        return escaped;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mySales = useMemo(() => {
    const data = sales
      .filter(s => s.employeeId === employeeId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (range === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return data.filter(s => s.date.startsWith(today));
    }
    return data;
  }, [sales, employeeId, range]);

  const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown';
  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || 'Walk-in Customer';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">My Sales History</h3>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
            </select>
            <button
              onClick={() => {
                const headers = ['Sale ID','Customer','Items','Total','Payment','Date'];
                const rows = mySales.map(s => ({
                  'Sale ID': s.id,
                  'Customer': getCustomerName(s.customerId),
                  'Items': s.items.map(i=>`${getProductName(i.productId)} x${i.quantity}`).join(' | '),
                  'Total': s.total,
                  'Payment': s.paymentMethod,
                  'Date': new Date(s.date).toLocaleString()
                }));
                const filename = range === 'today' ? 'my-sales-today.csv' : 'my-sales.csv';
                downloadCSV(filename, headers, rows);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Print (PDF)
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
        </div>

        {mySales.length === 0 ? (
          <p className="text-sm text-gray-600">No sales recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mySales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">#{sale.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getCustomerName(sale.customerId)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {sale.items.map((it, idx) => (
                        <span key={idx} className="block">
                          {getProductName(it.productId)} × {it.quantity}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">KSH {sale.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(sale.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeSalesHistory;


