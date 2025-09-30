import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import SalesService from '../services/salesService';
import { ArrowLeft } from 'lucide-react';

const currency = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SaleReceipt = () => {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await SalesService.getSale(saleId);
      if (res.success) {
        setSale(res.data);
      } else {
        setError(res.error || 'Failed to load receipt');
      }
      setLoading(false);
    };
    load();
  }, [saleId]);

  // Generate QR when sale is loaded
  useEffect(() => {
    const generateQR = async () => {
      if (!sale || !qrCanvasRef.current) return;
      try {
        const { default: QRCode } = await import('https://esm.sh/qrcode@1.5.3');
        const text = `${window.location.origin}/pos/receipt/${sale.id}`;
        await QRCode.toCanvas(qrCanvasRef.current, text, {
          width: 160,
          margin: 1,
          color: { dark: '#111111', light: '#ffffff' }
        });
      } catch {
        // QR generation failure is non-blocking
      }
    };
    generateQR();
  }, [sale]);

  // Auto print when navigated from POS after payment
  useEffect(() => {
    if (!sale) return;
    const shouldAutoPrint = location.state?.autoPrint;
    if (shouldAutoPrint) {
      setTimeout(() => window.print(), 300);
    }
  }, [sale, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-white/70">Loading receipt…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const items = sale?.items || [];
  const subtotal = items.reduce((sum, it) => {
    const hasTotal = it.total_price !== undefined && it.total_price !== null;
    const computed = (!hasTotal && it.unit_price != null && it.quantity != null)
      ? Number(it.unit_price) * Number(it.quantity)
      : Number(it.total_price || 0);
    return sum + Number(computed || 0);
  }, 0);
  const taxAmount = Number(sale?.tax_amount || 0);
  const discountAmount = Number(sale?.discount_amount || 0);
  const grandTotal = Number(sale?.total_amount || subtotal);

  return (
    <div className="min-h-screen bg-background-dark py-8">
      <div className="max-w-2xl mx-auto px-3">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/pos')}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to POS
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-md bg-white/10 text-white/80 hover:text-white hover:bg-white/20"
          >
            Print
          </button>
        </div>

        {/* Receipt Card */}
        <div className="mx-auto w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="pt-8 pb-4 px-6 text-center">
            <div className="mx-auto w-10 h-10 rounded-lg bg-yellow-500/20 text-yellow-500 flex items-center justify-center mb-2">
              <span className="font-bold text-lg">🍾</span>
            </div>
            <div className="font-display text-xl font-extrabold text-gray-900">The Vault</div>
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              <div>
                Date &amp; Time: {new Date(sale?.sale_date || sale?.created_at || Date.now()).toLocaleString()}
              </div>
              <div>Transaction ID: {sale?.receipt_number || sale?.id}</div>
              <div>Served by: {sale?.employee?.name || sale?.employee_name || '—'}</div>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200" />

          {/* Items */}
          <div className="px-6 py-4">
            <div className="text-xs font-semibold text-gray-500 grid grid-cols-12">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            <div className="mt-2 space-y-2">
              {items.length === 0 && (
                <div className="text-sm text-gray-500">No items</div>
              )}
              {items.map((it) => (
                <div key={it.id} className="text-sm grid grid-cols-12">
                  <div className="col-span-6 text-gray-800">{it.product_name || 'Item'}</div>
                  <div className="col-span-2 text-center text-gray-700">{it.quantity}</div>
                  <div className="col-span-2 text-right text-gray-700">{currency(it.unit_price)}</div>
                  <div className="col-span-2 text-right text-gray-900">{currency((it.total_price != null ? it.total_price : (Number(it.unit_price || 0) * Number(it.quantity || 0))) )}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="px-6 pb-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>{currency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Discounts Applied</span>
              <span>{currency(discountAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax (16%)</span>
              <span>{currency(taxAmount)}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 my-2" />
            <div className="flex justify-between font-extrabold text-gray-900">
              <span>Grand Total</span>
              <span>{currency(grandTotal)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200" />

          {/* Payment line */}
          <div className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
            Paid by {String(sale?.payment_method || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '—'}
          </div>

          {/* QR block */}
          <div className="px-6 pb-6">
            <div className="w-full rounded-lg border border-gray-200 py-6 flex items-center justify-center">
              <canvas ref={qrCanvasRef} className="bg-white p-2 shadow" />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 text-center text-xs text-gray-500 space-y-1">
            <div>Scan for feedback or visit:</div>
            <div className="font-mono">bit.ly/thevault-fb</div>
            <div className="mt-2 font-semibold text-gray-700">Thank you!</div>
            <div>www.thevault.club</div>
            <div>0712 345 678</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleReceipt;


