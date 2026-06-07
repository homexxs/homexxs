import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { invokeFunction } from '@/lib/api';
import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function PaymentApprovalModal({ payment, onClose, onApproved }) {
  const [status, setStatus] = useState(payment?.status || 'pending');
  const [notes, setNotes] = useState('');
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await invokeFunction('approvePayment', {
        payment_id: payment.id,
        status,
        notes,
      });
      onApproved?.();
      onClose();
    } catch (err) {
      console.error('Error approving payment', err);
    }
    setApproving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Approve Payment</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Payment details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Client:</span>
              <span className="font-medium text-gray-900">{payment?.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Email:</span>
              <span className="font-medium text-gray-900 text-sm">{payment?.client_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Amount:</span>
              <span className="font-black text-indigo-600">₦{(payment?.amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Status:</span>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                payment?.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                payment?.status === 'success' ? 'bg-green-50 text-green-600' :
                'bg-red-50 text-red-600'
              }`}>
                {payment?.status || 'pending'}
              </span>
            </div>
          </div>

          {/* Status selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Update Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['success', 'failed', 'refunded'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                    status === s
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {s === 'success' && <CheckCircle className="w-4 h-4 mx-auto mb-1" />}
                  {s === 'failed' && <XCircle className="w-4 h-4 mx-auto mb-1" />}
                  {s === 'refunded' && <AlertCircle className="w-4 h-4 mx-auto mb-1" />}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Add internal notes..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            {approving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Confirm & Notify</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}