import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useState, useEffect } from "react";
import {
  Package, Plus, Pencil, Trash2, X, AlertTriangle,
  CheckCircle2, Clock, XCircle, ChevronRight, Search,
  TrendingDown, BarChart3, Loader2, RefreshCw
} from "lucide-react";
import { format } from "date-fns";

const CATEGORY_CONFIG = {
  cleaning_supplies: { label: "Cleaning Supplies", emoji: "🧹", color: "bg-blue-50 text-blue-700 border-blue-200" },
  chemicals:         { label: "Chemicals",          emoji: "🧪", color: "bg-orange-50 text-orange-700 border-orange-200" },
  equipment:         { label: "Equipment",           emoji: "🔧", color: "bg-gray-100 text-gray-700 border-gray-200" },
  protective_gear:   { label: "Protective Gear",    emoji: "🥽", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  packaging:         { label: "Packaging",           emoji: "📦", color: "bg-purple-50 text-purple-700 border-purple-200" },
  other:             { label: "Other",               emoji: "📋", color: "bg-gray-50 text-gray-600 border-gray-200" },
};

const REQUEST_STATUS = {
  pending:            { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-400",  label: "Pending",            icon: Clock },
  approved:           { badge: "bg-green-50 text-green-700 border-green-200",   dot: "bg-green-500",  label: "Approved",           icon: CheckCircle2 },
  partially_approved: { badge: "bg-blue-50 text-blue-700 border-blue-200",      dot: "bg-blue-400",   label: "Partial",            icon: RefreshCw },
  rejected:           { badge: "bg-red-50 text-red-600 border-red-200",         dot: "bg-red-400",    label: "Rejected",           icon: XCircle },
  fulfilled:          { badge: "bg-indigo-50 text-indigo-700 border-indigo-200",dot: "bg-indigo-500", label: "Fulfilled",          icon: CheckCircle2 },
};

const emptyItem = { name: "", category: "cleaning_supplies", unit: "unit", stock_quantity: 0, low_stock_threshold: 5, description: "", is_active: true };

export default function Inventory() {
  const [tab, setTab] = useState("stock");
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [reqSaving, setReqSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      list(TABLES.inventory_items, "name", 200),
      list(TABLES.material_requests, "-created_date", 200),
    ]).then(([inv, req]) => { setItems(inv); setRequests(req); setLoading(false); })
      .catch(() => setLoading(false));

    const unsubI = subscribe(TABLES.inventory_items, e => {
      if (e.type === "create") setItems(p => [...p, e.data]);
      else if (e.type === "update") setItems(p => p.map(x => x.id === e.id ? e.data : x));
      else if (e.type === "delete") setItems(p => p.filter(x => x.id !== e.id));
    });
    const unsubR = subscribe(TABLES.material_requests, e => {
      if (e.type === "create") setRequests(p => [e.data, ...p]);
      else if (e.type === "update") setRequests(p => p.map(x => x.id === e.id ? e.data : x));
    });
    return () => { unsubI(); unsubR(); };
  }, []);

  // ── Item CRUD ──────────────────────────────────────────────
  const openAdd = () => { setEditingItem(null); setItemForm(emptyItem); setShowItemForm(true); };
  const openEdit = (item) => { setEditingItem(item); setItemForm({ ...item }); setShowItemForm(true); };

  const saveItem = async () => {
    setSaving(true);
    const data = { ...itemForm, stock_quantity: Number(itemForm.stock_quantity), low_stock_threshold: Number(itemForm.low_stock_threshold) };
    if (editingItem) {
      const updated = await update(TABLES.inventory_items, editingItem.id, data);
      setItems(p => p.map(x => x.id === editingItem.id ? updated : x));
    } else {
      const created = await create(TABLES.inventory_items, data);
      setItems(p => [...p, created]);
    }
    setShowItemForm(false);
    setSaving(false);
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await remove(TABLES.inventory_items, item.id);
    setItems(p => p.filter(x => x.id !== item.id));
  };

  const adjustStock = async (item, delta) => {
    const qty = Math.max(0, (item.stock_quantity || 0) + delta);
    const updated = await update(TABLES.inventory_items, item.id, { stock_quantity: qty });
    setItems(p => p.map(x => x.id === item.id ? updated : x));
  };

  // ── Request approval ───────────────────────────────────────
  const openRequest = (req) => { setSelectedRequest(req); setAdminNotes(req.admin_notes || ""); };

  const handleApproval = async (status) => {
    setReqSaving(true);
    // If approved/partially, deduct stock
    if (status === "approved" || status === "partially_approved") {
      for (const reqItem of (selectedRequest.items || [])) {
        const inv = items.find(x => x.id === reqItem.item_id);
        if (inv) {
          const deduct = status === "approved" ? reqItem.quantity_requested : Math.floor(reqItem.quantity_requested / 2);
          const newQty = Math.max(0, (inv.stock_quantity || 0) - deduct);
          const updated = await update(TABLES.inventory_items, inv.id, { stock_quantity: newQty });
          setItems(p => p.map(x => x.id === inv.id ? updated : x));
        }
      }
    }
    const updated = await update(TABLES.material_requests, selectedRequest.id, {
      status,
      admin_notes: adminNotes,
      approved_by: "Admin",
      approved_at: new Date().toISOString(),
    });
    // Notify staff
    await create(TABLES.notifications, {
      recipient_email: selectedRequest.staff_email,
      title: `Material Request ${REQUEST_STATUS[status]?.label}`,
      message: `Your material request for ${selectedRequest.service_type?.replace(/_/g, " ")} on ${selectedRequest.booking_date} has been ${status.replace(/_/g, " ")}.${adminNotes ? ` Note: ${adminNotes}` : ""}`,
      type: "general",
      related_id: selectedRequest.id,
    }).catch(() => {});
    setRequests(p => p.map(x => x.id === selectedRequest.id ? updated : x));
    setSelectedRequest(null);
    setReqSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  // Computed
  const lowStockItems = items.filter(x => x.is_active && x.stock_quantity <= x.low_stock_threshold);
  const outOfStock = items.filter(x => x.is_active && x.stock_quantity === 0);
  const pendingRequests = requests.filter(r => r.status === "pending");

  const filteredItems = items.filter(x => {
    const matchCat = catFilter === "all" || x.category === catFilter;
    const matchSearch = !search || x.name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const SERVICE_EMOJIS = { cleaning: "🧹", fumigation: "🔬", lawn_care: "🌿", pest_control: "🐛", deep_cleaning: "✨", pool_maintenance: "🏊" };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory & Materials</h2>
          <p className="text-gray-500 mt-0.5 text-sm">Track stock levels and manage staff material requests</p>
        </div>
        {tab === "stock" && (
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      {/* Alert banners */}
      {(lowStockItems.length > 0 || pendingRequests.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {lowStockItems.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex-1">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-800 font-medium">
                <strong>{lowStockItems.length}</strong> item{lowStockItems.length !== 1 ? "s" : ""} running low on stock
                {outOfStock.length > 0 && <span className="text-red-600 ml-1">({outOfStock.length} out of stock)</span>}
              </span>
              <button onClick={() => { setTab("stock"); setCatFilter("all"); }}
                className="ml-auto text-xs font-semibold text-amber-700 hover:underline">View →</button>
            </div>
          )}
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex-1">
              <Clock className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <span className="text-sm text-indigo-800 font-medium">
                <strong>{pendingRequests.length}</strong> material request{pendingRequests.length !== 1 ? "s" : ""} awaiting approval
              </span>
              <button onClick={() => setTab("requests")}
                className="ml-auto text-xs font-semibold text-indigo-700 hover:underline">Review →</button>
            </div>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Items",      value: items.filter(x => x.is_active).length, icon: Package,       color: "from-indigo-500 to-indigo-600" },
          { label: "Low Stock",        value: lowStockItems.length,                   icon: TrendingDown,  color: lowStockItems.length > 0 ? "from-amber-400 to-orange-500" : "from-gray-400 to-gray-500" },
          { label: "Out of Stock",     value: outOfStock.length,                      icon: AlertTriangle, color: outOfStock.length > 0 ? "from-red-500 to-rose-600" : "from-gray-400 to-gray-500" },
          { label: "Pending Requests", value: pendingRequests.length,                 icon: Clock,         color: pendingRequests.length > 0 ? "from-purple-500 to-violet-600" : "from-gray-400 to-gray-500" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-black text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { id: "stock",    label: "Stock",    badge: 0 },
          { id: "requests", label: "Requests", badge: pendingRequests.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2
              ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            {t.badge > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════ STOCK TAB ══════════ */}
      {tab === "stock" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Item grid */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No items found</p>
              <button onClick={openAdd} className="text-indigo-600 text-sm font-semibold mt-2 hover:underline">Add your first item →</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => {
                const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                const isLow = item.stock_quantity <= item.low_stock_threshold;
                const isOut = item.stock_quantity === 0;
                return (
                  <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md
                    ${isOut ? "border-red-200" : isLow ? "border-amber-200" : "border-gray-100"}`}>
                    {/* Top bar */}
                    <div className={`h-1.5 ${isOut ? "bg-red-400" : isLow ? "bg-amber-400" : "bg-green-400"}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${cat.color}`}>
                            {cat.emoji}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm leading-snug">{item.name}</div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${cat.color}`}>
                              {cat.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteItem(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stock level */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Stock</span>
                          <span className={`text-xs font-bold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"}`}>
                            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => adjustStock(item, -1)} disabled={item.stock_quantity <= 0}
                            className="w-7 h-7 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-30 transition-colors text-sm font-bold">
                            −
                          </button>
                          <div className="flex-1 text-center">
                            <span className={`text-xl font-black ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900"}`}>
                              {item.stock_quantity}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                          </div>
                          <button onClick={() => adjustStock(item, 1)}
                            className="w-7 h-7 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors text-sm font-bold">
                            +
                          </button>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isOut ? "bg-red-400" : isLow ? "bg-amber-400" : "bg-green-400"}`}
                            style={{ width: `${Math.min(100, (item.stock_quantity / Math.max(item.low_stock_threshold * 3, 1)) * 100)}%` }} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">Alert below {item.low_stock_threshold} {item.unit}</div>
                      </div>

                      {item.description && (
                        <div className="text-xs text-gray-400 truncate">{item.description}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ REQUESTS TAB ══════════ */}
      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No material requests yet</p>
            </div>
          ) : requests.map(req => {
            const sCfg = REQUEST_STATUS[req.status] || REQUEST_STATUS.pending;
            const Icon = sCfg.icon;
            return (
              <button key={req.id} onClick={() => openRequest(req)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left overflow-hidden group">
                <div className={`h-1 ${sCfg.dot}`} />
                <div className="p-5 flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0">
                    {SERVICE_EMOJIS[req.service_type] || "🏠"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm text-gray-900">{req.staff_name}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 capitalize">{req.service_type?.replace(/_/g, " ")}</span>
                      {req.booking_date && <span className="text-xs text-gray-400">· {req.booking_date}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(req.items || []).map((ri, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {ri.quantity_requested}× {ri.item_name}
                        </span>
                      ))}
                    </div>
                    {req.notes && <div className="text-xs text-gray-400 mt-1.5 italic truncate">{req.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1 ${sCfg.badge}`}>
                      <Icon className="w-3 h-3" /> {sCfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ══════════ ADD/EDIT ITEM MODAL ══════════ */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editingItem ? "Edit Item" : "Add Item"}</h3>
              <button onClick={() => setShowItemForm(false)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Name *</label>
                <input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Bleach, Mop, Safety Gloves"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit</label>
                  <input value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="bottle, kg, roll..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock Quantity</label>
                  <input type="number" min="0" value={itemForm.stock_quantity} onChange={e => setItemForm(f => ({ ...f, stock_quantity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Low Stock Alert</label>
                  <input type="number" min="0" value={itemForm.low_stock_threshold} onChange={e => setItemForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes about this item"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowItemForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveItem} disabled={saving || !itemForm.name}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ REQUEST APPROVAL MODAL ══════════ */}
      {selectedRequest && (() => {
        const sCfg = REQUEST_STATUS[selectedRequest.status] || REQUEST_STATUS.pending;
        const isPending = selectedRequest.status === "pending";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className={`h-1.5 rounded-t-2xl ${sCfg.dot}`} />
              <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900">Material Request</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{selectedRequest.staff_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${sCfg.badge}`}>{sCfg.label}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 rounded-xl hover:bg-gray-100 flex-shrink-0"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Job info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service</span>
                    <span className="font-semibold capitalize">{selectedRequest.service_type?.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="font-semibold">{selectedRequest.booking_date || "—"}</span>
                  </div>
                  {selectedRequest.notes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Notes</span>
                      <span className="font-medium text-right max-w-[60%]">{selectedRequest.notes}</span>
                    </div>
                  )}
                </div>

                {/* Requested items with stock check */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Requested Items</div>
                  <div className="space-y-2">
                    {(selectedRequest.items || []).map((ri, i) => {
                      const inv = items.find(x => x.id === ri.item_id);
                      const hasStock = inv && inv.stock_quantity >= ri.quantity_requested;
                      const lowStock = inv && inv.stock_quantity > 0 && inv.stock_quantity < ri.quantity_requested;
                      const noStock = inv && inv.stock_quantity === 0;
                      return (
                        <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm
                          ${noStock ? "bg-red-50 border-red-200" : lowStock ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                          <div>
                            <span className="font-semibold text-gray-900">{ri.item_name}</span>
                            <span className="text-gray-500 ml-2">{ri.quantity_requested} {ri.unit}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            {noStock ? (
                              <><XCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-red-600">No stock</span></>
                            ) : lowStock ? (
                              <><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-700">Only {inv.stock_quantity} left</span></>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-green-700">{inv?.stock_quantity} available</span></>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Admin notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Admin Notes</label>
                  <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
                    placeholder="Optional note to staff..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                </div>

                {/* Action buttons */}
                {isPending ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleApproval("approved")} disabled={reqSaving}
                      className="py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1">
                      {reqSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve
                    </button>
                    <button onClick={() => handleApproval("partially_approved")} disabled={reqSaving}
                      className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1">
                      {reqSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Partial
                    </button>
                    <button onClick={() => handleApproval("rejected")} disabled={reqSaving}
                      className="py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1">
                      {reqSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
                    </button>
                  </div>
                ) : (
                  <div className={`text-center py-3 rounded-xl text-sm font-semibold border ${sCfg.badge}`}>
                    {sCfg.label} {selectedRequest.approved_at && `· ${format(new Date(selectedRequest.approved_at), "MMM d, h:mm a")}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}