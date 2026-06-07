import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";

const ICONS = ["🧹","🔬","🌿","🐛","✨","🏊","🏠","🔧","💧","🌡️","🛁","🪟","🪴","🐀","🐝"];
const COLORS = ["blue","orange","green","red","purple","cyan","indigo","amber","emerald","rose"];

const DEFAULT_SERVICES = [
  { name: "Home Cleaning", slug: "cleaning", icon: "🧹", price: 15000, duration_hours: 3, color: "blue", description: "Professional deep clean of your home", is_active: true },
  { name: "Fumigation", slug: "fumigation", icon: "🔬", price: 25000, duration_hours: 4, color: "orange", description: "Full pest fumigation & treatment", is_active: true },
  { name: "Lawn Care", slug: "lawn_care", icon: "🌿", price: 12000, duration_hours: 2, color: "green", description: "Mowing, trimming & landscaping", is_active: true },
  { name: "Pest Control", slug: "pest_control", icon: "🐛", price: 18000, duration_hours: 2, color: "red", description: "Targeted pest elimination", is_active: true },
  { name: "Deep Cleaning", slug: "deep_cleaning", icon: "✨", price: 35000, duration_hours: 5, color: "purple", description: "Intensive sanitization service", is_active: true },
  { name: "Pool Service", slug: "pool_maintenance", icon: "🏊", price: 20000, duration_hours: 2, color: "cyan", description: "Pool cleaning & chemical balancing", is_active: true },
];

const emptyForm = { name: "", slug: "", icon: "🧹", price: "", duration_hours: "", description: "", color: "blue", is_active: true };

export default function ServiceManager() {
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    getMe().then(async u => {
      setUser(u);
      if (u?.role !== "admin") { setLoading(false); return; }
      const list = await list(TABLES.service_offerings, "-created_date", 100);
      setServices(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const seedDefaults = async () => {
    setSaving(true);
    const created = await Promise.all(DEFAULT_SERVICES.map(s => create(TABLES.service_offerings, s)));
    setServices(created);
    setSeeded(true);
    setSaving(false);
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, slug: s.slug || "", icon: s.icon || "🧹", price: s.price, duration_hours: s.duration_hours || "", description: s.description || "", color: s.color || "blue", is_active: s.is_active !== false }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, price: parseFloat(form.price) || 0, duration_hours: parseFloat(form.duration_hours) || undefined };
    if (editing) {
      const updated = await update(TABLES.service_offerings, editing.id, data);
      setServices(p => p.map(s => s.id === editing.id ? updated : s));
    } else {
      const created = await create(TABLES.service_offerings, data);
      setServices(p => [created, ...p]);
    }
    setShowForm(false);
    setSaving(false);
  };

  const toggleActive = async (s) => {
    const updated = await update(TABLES.service_offerings, s.id, { is_active: !s.is_active });
    setServices(p => p.map(x => x.id === s.id ? updated : x));
  };

  const deleteService = async (s) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    await remove(TABLES.service_offerings, s.id);
    setServices(p => p.filter(x => x.id !== s.id));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (user?.role !== "admin") return <div className="flex items-center justify-center h-64"><AlertCircle className="w-10 h-10 text-red-300 mr-3" /><p className="text-gray-600 font-medium">Admin access required</p></div>;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Manager</h2>
          <p className="text-gray-500 mt-1 text-sm">Manage your service offerings, pricing, and availability</p>
        </div>
        <div className="flex gap-2">
          {services.length === 0 && !seeded && (
            <button onClick={seedDefaults} disabled={saving} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              {saving ? "Loading..." : "Load Defaults"}
            </button>
          )}
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(s => (
          <div key={s.id} className={`bg-white rounded-2xl border ${s.is_active ? "border-gray-100" : "border-dashed border-gray-200 opacity-60"} shadow-sm overflow-hidden`}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{s.icon}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(s)} title={s.is_active ? "Deactivate" : "Activate"} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                    {s.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-indigo-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteService(s)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="font-bold text-gray-900">{s.name}</div>
              <div className="text-xs text-gray-500 mt-1 mb-3 line-clamp-2">{s.description}</div>
              <div className="flex items-center justify-between">
                <div className="text-indigo-600 font-bold">₦{(s.price || 0).toLocaleString()}</div>
                {s.duration_hours && <div className="text-xs text-gray-400">{s.duration_hours}h</div>}
                {!s.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">🛠️</div>
            <p className="text-sm">No services yet. Add one or load defaults.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? "Edit Service" : "Add Service"}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Icon picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                      className={`text-xl p-2 rounded-xl border-2 transition-all ${form.icon === ic ? "border-indigo-500 bg-indigo-50" : "border-gray-100 hover:border-gray-300"}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. Deep Cleaning" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" placeholder="Brief description of the service" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (₦) *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="15000" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duration (hrs)</label>
                  <input type="number" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="3" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active (visible to clients)</label>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.price}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}