import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useState, useEffect } from "react";
import { Package, Plus, Trash2, X, Send, Loader2, AlertTriangle } from "lucide-react";

export default function MaterialRequestForm({ booking, staffName, staffEmail, onClose, onSubmitted }) {
  const [items, setItems] = useState([]); // available inventory
  const [rows, setRows] = useState([{ item_id: "", quantity_requested: 1 }]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    filter(TABLES.inventory_items, { is_active: true }, "name", 100)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoadingItems(false));
  }, []);

  const addRow = () => setRows(r => [...r, { item_id: "", quantity_requested: 1 }]);
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const selectedItem = (id) => items.find(x => x.id === id);

  const isValid = rows.some(r => r.item_id && r.quantity_requested > 0);

  const handleSubmit = async () => {
    setSaving(true);
    const requestItems = rows
      .filter(r => r.item_id && r.quantity_requested > 0)
      .map(r => {
        const inv = selectedItem(r.item_id);
        return {
          item_id: r.item_id,
          item_name: inv?.name || "",
          quantity_requested: Number(r.quantity_requested),
          unit: inv?.unit || "unit",
        };
      });

    await create(TABLES.material_requests, {
      staff_name: staffName,
      staff_email: staffEmail,
      booking_id: booking?.id || "",
      booking_date: booking?.scheduled_date || "",
      service_type: booking?.service_type || "",
      items: requestItems,
      notes,
      status: "pending",
    });

    // Notify admins via a generic notification (admin will see it in their panel)
    await create(TABLES.notifications, {
      recipient_email: "admin",
      title: "New Material Request",
      message: `${staffName} requested ${requestItems.length} item(s) for ${booking?.service_type?.replace(/_/g, " ")} on ${booking?.scheduled_date}.`,
      type: "general",
    }).catch(() => {});

    setSaving(false);
    onSubmitted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" /> Request Materials
            </h3>
            {booking && (
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {booking.service_type?.replace(/_/g, " ")} · {booking.scheduled_date}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {loadingItems ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No inventory items available. Ask admin to add items.</div>
          ) : (
            <>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Items</div>
              <div className="space-y-2">
                {rows.map((row, i) => {
                  const inv = selectedItem(row.item_id);
                  const isLow = inv && inv.stock_quantity <= inv.low_stock_threshold;
                  const isOut = inv && inv.stock_quantity === 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <select value={row.item_id} onChange={e => updateRow(i, "item_id", e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        <option value="">— Select item —</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.stock_quantity} {item.unit} avail.)
                          </option>
                        ))}
                      </select>
                      <input type="number" min="1" value={row.quantity_requested}
                        onChange={e => updateRow(i, "quantity_requested", e.target.value)}
                        className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      {rows.length > 1 && (
                        <button onClick={() => removeRow(i)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stock warnings */}
              {rows.map((row, i) => {
                const inv = selectedItem(row.item_id);
                if (!inv) return null;
                if (inv.stock_quantity === 0) return (
                  <div key={i} className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {inv.name} is currently out of stock
                  </div>
                );
                if (inv.stock_quantity < row.quantity_requested) return (
                  <div key={i} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Only {inv.stock_quantity} {inv.unit} of {inv.name} available
                  </div>
                );
                return null;
              })}

              <button onClick={addRow}
                className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add another item
              </button>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reason / Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Why do you need these materials?"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !isValid || loadingItems}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}