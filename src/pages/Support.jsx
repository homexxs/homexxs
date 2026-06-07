import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { Plus, X, MessageSquare, Clock, CheckCircle, AlertCircle, ChevronRight, Tag, ChevronDown, Calendar } from "lucide-react";
import { format } from "date-fns";

// Category → sub-categories map
const CATEGORY_MAP = {
  service_issue: {
    label: "Service Issue",
    subs: ["Quality of work", "Incomplete service", "Damage caused", "Staff behaviour", "Wrong service delivered"],
  },
  billing: {
    label: "Billing",
    subs: ["Incorrect charge", "Refund request", "Invoice dispute", "Payment not reflected", "Pricing inquiry"],
  },
  scheduling: {
    label: "Scheduling",
    subs: ["Reschedule request", "Cancellation", "Late arrival", "No-show", "Wrong date booked"],
  },
  complaint: {
    label: "Complaint",
    subs: ["Staff conduct", "Property damage", "Noise/disruption", "Safety concern", "General complaint"],
  },
  request: {
    label: "Special Request",
    subs: ["Additional task", "Custom cleaning", "Specific product", "Access arrangements", "Pet-friendly request"],
  },
  other: {
    label: "Other",
    subs: ["General inquiry", "Feedback", "Partnership", "Media / PR", "Other"],
  },
};

const priorityConfig = {
  low:    { color: "bg-gray-100 text-gray-600 border-gray-200",    label: "Low" },
  medium: { color: "bg-amber-50 text-amber-600 border-amber-200",  label: "Medium" },
  high:   { color: "bg-orange-50 text-orange-600 border-orange-200", label: "High" },
  urgent: { color: "bg-red-50 text-red-600 border-red-200",        label: "Urgent" },
};

const statusConfig = {
  open:        { color: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-400",  icon: Clock,       label: "Open" },
  in_progress: { color: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500",   icon: AlertCircle, label: "In Progress" },
  resolved:    { color: "bg-green-50 text-green-700 border-green-200",   dot: "bg-green-500",  icon: CheckCircle, label: "Resolved" },
  closed:      { color: "bg-gray-50 text-gray-600 border-gray-200",      dot: "bg-gray-400",   icon: X,           label: "Closed" },
};

// Timeline entry for the client detail view
function TicketTimeline({ ticket }) {
  const events = [
    { date: ticket.created_date, label: "Ticket submitted", color: "bg-amber-400" },
    ticket.assigned_to ? { date: ticket.updated_date, label: `Assigned to ${ticket.assigned_to}`, color: "bg-indigo-400" } : null,
    ticket.status === "in_progress" ? { date: ticket.updated_date, label: "Team is working on your issue", color: "bg-blue-500" } : null,
    ticket.status === "resolved" ? { date: ticket.resolved_at || ticket.updated_date, label: "Issue resolved ✓", color: "bg-green-500" } : null,
    ticket.status === "closed" ? { date: ticket.updated_date, label: "Ticket closed", color: "bg-gray-400" } : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {events.map((ev, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full mt-1 ${ev.color}`} />
            {i < events.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">{ev.label}</div>
            {ev.date && <div className="text-xs text-gray-400 mt-0.5">{format(new Date(ev.date), "MMM d, yyyy 'at' h:mm a")}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Support() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    title: "", description: "", category: "service_issue", sub_category: "", priority: "medium",
  });

  useEffect(() => {
    getMe().then(u => {
      setUser(u);
      return filter(TABLES.tickets, { client_email: u.email }, "-created_date", 100);
    }).then(setTickets).catch(() => {});

    const unsub = subscribe(TABLES.tickets, event => {
      if (event.type === "update") {
        setTickets(p => p.map(t => t.id === event.id ? event.data : t));
        // Update selected if open
        setSelected(prev => prev?.id === event.id ? event.data : prev);
      }
      if (event.type === "create") setTickets(p => [event.data, ...p]);
    });
    return unsub;
  }, []);

  const handleSubmit = async () => {
    if (!user || !form.title || !form.description) return;
    setLoading(true);
    const ticket = await create(TABLES.tickets, {
      ...form,
      client_email: user.email,
      client_name: user.full_name,
      status: "open",
    });
    await create(TABLES.notifications, {
      recipient_email: user.email,
      title: "Ticket Submitted",
      message: `Your support ticket "${form.title}" has been received. We'll respond shortly.`,
      type: "ticket_update",
      related_id: ticket.id,
    });
    setTickets(p => [ticket, ...p]);
    setForm({ title: "", description: "", category: "service_issue", sub_category: "", priority: "medium" });
    setShowForm(false);
    setLoading(false);
  };

  const subCategories = CATEGORY_MAP[form.category]?.subs || [];
  const filteredTickets = filterStatus === "all" ? tickets : tickets.filter(t => t.status === filterStatus);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Center</h2>
          <p className="text-gray-500 mt-1 text-sm">View your ticket history and track support requests in real-time</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Object.entries(statusConfig).map(([status, cfg]) => {
          const count = tickets.filter(t => t.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(prev => prev === status ? "all" : status)}
              className={`rounded-2xl p-4 border text-left transition-all hover:shadow-md
                ${filterStatus === status ? `${cfg.color} ring-2 ring-current ring-offset-1` : cfg.color}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-semibold">{cfg.label}</span>
              </div>
              <div className="text-2xl font-bold">{count}</div>
            </button>
          );
        })}
      </div>

      {/* Filter indicator */}
      {filterStatus !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Showing:</span>
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusConfig[filterStatus]?.color}`}>
            {statusConfig[filterStatus]?.label}
          </span>
          <button onClick={() => setFilterStatus("all")} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Your Tickets</h3>
          <span className="text-xs text-gray-400">{filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {filteredTickets.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No tickets {filterStatus !== "all" ? `with status "${filterStatus}"` : "yet"}</p>
              {filterStatus === "all" && (
                <button onClick={() => setShowForm(true)} className="text-indigo-600 text-sm font-medium mt-2">
                  Raise your first ticket →
                </button>
              )}
            </div>
          ) : filteredTickets.map(t => {
            const sCfg = statusConfig[t.status] || statusConfig.open;
            const pCfg = priorityConfig[t.priority] || priorityConfig.medium;
            const catLabel = CATEGORY_MAP[t.category]?.label || t.category;
            const hasAdminReply = !!t.admin_notes;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50/50 transition-colors flex items-start gap-4"
              >
                <div className={`w-2 self-stretch rounded-full flex-shrink-0 ${sCfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">{t.title}</span>
                    {hasAdminReply && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">💬 Response</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pCfg.color}`}>{pCfg.label}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{catLabel}{t.sub_category ? ` › ${t.sub_category}` : ""}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(t.created_date), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${sCfg.color}`}>{sCfg.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── NEW TICKET MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">New Support Ticket</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Brief summary of your issue"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value, sub_category: "" }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sub-Category</label>
                  <select
                    value={form.sub_category}
                    onChange={e => setForm(f => ({ ...f, sub_category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">— Select —</option>
                    {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(priorityConfig).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setForm(f => ({ ...f, priority: k }))}
                      className={`py-2 rounded-xl border text-xs font-semibold transition-all ${form.priority === k ? v.color + " ring-2 ring-offset-1 ring-current" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe your issue in detail — include booking date, service type, and what happened..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !form.title || !form.description}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TICKET DETAIL MODAL ── */}
      {selected && (() => {
        const sCfg = statusConfig[selected.status] || statusConfig.open;
        const pCfg = priorityConfig[selected.priority] || priorityConfig.medium;
        const catLabel = CATEGORY_MAP[selected.category]?.label || selected.category;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className={`h-1.5 rounded-t-2xl ${sCfg.dot}`} />
              <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900">{selected.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Ticket #{selected.id?.slice(-8).toUpperCase()}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${sCfg.color}`}>{sCfg.label}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${pCfg.color}`}>{pCfg.label} Priority</span>
                  <span className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {catLabel}{selected.sub_category ? ` › ${selected.sub_category}` : ""}
                  </span>
                  {selected.assigned_to && (
                    <span className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 font-medium">
                      👤 {selected.assigned_to}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Message</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{selected.description}</div>
                </div>

                {/* Admin response */}
                {selected.admin_notes && (
                  <div>
                    <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">💬 HomeXP Response</div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800 leading-relaxed">
                      {selected.admin_notes}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status Timeline</div>
                  <TicketTimeline ticket={selected} />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}