import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { invokeFunction } from '@/lib/api';
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, X, Tag, CheckCircle } from "lucide-react";
import { TICKET_STATUS_CONFIG } from "@/components/shared/ColorConfig";

const PRIORITY_CONFIG = {
  low:    { badge: "bg-blue-50 text-blue-600 border-blue-100" },
  medium: { badge: "bg-amber-50 text-amber-600 border-amber-100" },
  high:   { badge: "bg-orange-50 text-orange-600 border-orange-100" },
  urgent: { badge: "bg-red-50 text-red-600 border-red-100" },
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    Promise.all([
      list(TABLES.tickets, "-created_date", 300),
      filter(TABLES.staff_members, { is_active: true }),
    ]).then(([t, s]) => { setTickets(t); setStaff(s); setLoading(false); }).catch(() => setLoading(false));

    const unsub = subscribe(TABLES.tickets, e => {
      if (e.type === "create") setTickets(p => [e.data, ...p]);
      else if (e.type === "update") setTickets(p => p.map(t => t.id === e.id ? e.data : t));
    });
    return unsub;
  }, []);

  const openTicket = (t) => { setSelected(t); setNotes(t.internal_notes || ""); };

  const saveTicket = async (data) => {
    setSaving(true);
    const prevStatus = selected.status;
    const prevAdminNotes = selected.admin_notes;
    // Set resolved_at if transitioning to resolved
    if (data.status === "resolved" && prevStatus !== "resolved") {
      data.resolved_at = new Date().toISOString();
    }
    const updated = await update(TABLES.tickets, selected.id, data);
    setTickets(p => p.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);

    // Send client notification if status changed or admin notes updated
    if (data.status !== prevStatus || (data.admin_notes && data.admin_notes !== prevAdminNotes)) {
      await create(TABLES.notifications, {
        recipient_email: selected.client_email,
        title: "Support Ticket Updated",
        message: data.admin_notes
          ? `Re: "${selected.title}" — ${data.admin_notes}`
          : `Your ticket "${selected.title}" is now ${(data.status || selected.status).replace(/_/g, " ")}.`,
        type: "ticket_update",
        related_id: selected.id,
      });
    }
    // Fire resolved email
    if (data.status === "resolved" && prevStatus !== "resolved") {
      invokeFunction("sendEventEmails", { event_type: "ticket_resolved", ticket_id: selected.id }).catch(() => {});
    }
    setSaving(false);
  };

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title?.toLowerCase().includes(q) || t.client_name?.toLowerCase().includes(q) || t.client_email?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Raised Tickets</h2>
        <p className="text-sm text-gray-500 mt-1">{filtered.length} of {tickets.length} tickets</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, client..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
          <option value="all">All Statuses</option>
          {["open","in_progress","resolved","closed"].map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
          <option value="all">All Priorities</option>
          {["low","medium","high","urgent"].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                {["Title","Client","Category","Priority","Status","Assigned","Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-400">No tickets found</td></tr>
              ) : filtered.map(t => {
                const sts = TICKET_STATUS_CONFIG[t.status];
                const pri = PRIORITY_CONFIG[t.priority];
                return (
                  <tr key={t.id} onClick={() => openTicket(t)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-48 truncate">{t.title}</div>
                      {t.sub_category && <div className="text-xs text-gray-400 mt-0.5">{t.sub_category}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{t.client_name || "—"}</div>
                      <div className="text-xs text-gray-400">{t.client_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize text-xs">{t.category?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${pri?.badge || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {t.priority || "medium"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${sts?.badge || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {sts?.label || t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.assigned_to || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{t.created_date ? format(new Date(t.created_date), "MMM d, yyyy") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 truncate max-w-xs">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selected.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Client", selected.client_name], ["Email", selected.client_email], ["Category", selected.category?.replace(/_/g, " ")], ["Sub-category", selected.sub_category]].map(([l,v]) => v ? (
                  <div key={l}><span className="text-xs text-gray-400 block">{l}</span><span className="font-medium text-gray-800 capitalize">{v}</span></div>
                ) : null)}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select value={selected.status} onChange={e => saveTicket({ status: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {["open","in_progress","resolved","closed"].map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign To</label>
                <select value={selected.assigned_to || ""} onChange={e => saveTicket({ assigned_to: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">— Unassigned —</option>
                  {staff.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Response to Client</label>
                <textarea value={selected.admin_notes || ""} onChange={e => setSelected(p => ({ ...p, admin_notes: e.target.value }))} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Write a response to the client..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Internal Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Internal notes (not visible to client)..." />
              </div>
              <button onClick={() => saveTicket({ status: selected.status, admin_notes: selected.admin_notes, internal_notes: notes })}
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Save & Notify Client</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}