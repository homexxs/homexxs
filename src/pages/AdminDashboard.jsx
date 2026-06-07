import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { invokeFunction, inviteUser } from '@/lib/api';
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, TrendingUp, AlertCircle, X, ChevronRight,
  UserCheck, MessageSquare, Clock, Tag, CheckCircle2,
  CreditCard, Ticket, ArrowUpRight, Search, Filter,
  BarChart3, Calendar, Plus, Pencil, Trash2,
  Mail, Briefcase, KeyRound, Send, AlertTriangle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { TICKET_STATUS_CONFIG } from "@/components/shared/ColorConfig";
import ClientActivation from "@/components/subscription/ClientActivation";

// Plan → monthly price mapping
const PLAN_PRICES = {
  mini_flat: 10000, "2_bedroom_flat": 15000, "3_bedroom_flat": 20000,
  "3_bedroom_duplex": 25000, "4_bedroom_flat": 30000, "4_bedroom_duplex": 35000,
  "5_bedroom_mansion": 50000,
};
const PLAN_LABELS = {
  mini_flat: "Mini Flat", "2_bedroom_flat": "2 Bed Flat", "3_bedroom_flat": "3 Bed Flat",
  "3_bedroom_duplex": "3 Bed Duplex", "4_bedroom_flat": "4 Bed Flat",
  "4_bedroom_duplex": "4 Bed Duplex", "5_bedroom_mansion": "5 Bed Mansion",
};

const PRIORITY_CONFIG = {
  low:    { badge: "bg-gray-100 text-gray-600 border-gray-200",     dot: "bg-gray-400",   label: "Low" },
  medium: { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-400",  label: "Medium" },
  high:   { badge: "bg-orange-50 text-orange-700 border-orange-200",dot: "bg-orange-500", label: "High" },
  urgent: { badge: "bg-red-50 text-red-600 border-red-200",         dot: "bg-red-500",    label: "Urgent" },
};

const AVATAR_COLORS = ["from-indigo-500 to-purple-600","from-emerald-500 to-teal-600","from-amber-500 to-orange-600","from-rose-500 to-pink-600","from-cyan-500 to-blue-600","from-violet-500 to-fuchsia-600"];
const emptyStaffForm = { full_name: "", email: "", password: "", role_title: "", is_active: true, portal_role: "" };

const PORTAL_ROLES = [
  { value: "staff_hr",         label: "HR Department",         color: "from-pink-500 to-rose-600",     loginPath: "/StaffHR" },
  { value: "staff_account",    label: "Accounts Department",   color: "from-emerald-500 to-teal-600",  loginPath: "/StaffAccount" },
  { value: "staff_operations", label: "Operations Department", color: "from-cyan-500 to-blue-600",     loginPath: "/StaffOperations" },
  { value: "staff_managerial", label: "Managerial Department", color: "from-violet-500 to-purple-600", loginPath: "/StaffManagerial" },
];

// ── Metric Card ──────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? "rotate-180" : ""}`} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Ticket Row ───────────────────────────────────────────────
function TicketRow({ ticket, onClick }) {
  const tsc = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.open;
  const pCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  return (
    <button onClick={onClick}
      className="w-full px-5 py-4 text-left hover:bg-gray-50/70 transition-colors flex items-start gap-4 group">
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${tsc.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{ticket.title}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${pCfg.badge}`}>{pCfg.label}</span>
          {ticket.assigned_to && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium flex items-center gap-1">
              <UserCheck className="w-2.5 h-2.5" /> {ticket.assigned_to}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-x-2">
          <span className="font-medium text-gray-500">{ticket.client_name || ticket.client_email}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{ticket.category?.replace(/_/g, " ")}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{format(new Date(ticket.created_date), "MMM d, h:mm a")}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${tsc.badge}`}>{tsc.label}</span>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketForm, setTicketForm] = useState({ adminNote: "", internalNote: "", assignedTo: "", status: "" });
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Staff management state
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [staffSaving, setStaffSaving] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name, context } | null

  // Portal login state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff_hr");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    getMe().then(async u => {
      setUser(u);
      if (u?.role !== "admin") { setLoading(false); return; }
      // Load critical data first, load supplementary in parallel without blocking
      const [b, t, p, us, sm] = await Promise.all([
        list(TABLES.bookings, "-created_date", 200),
        list(TABLES.tickets, "-created_date", 200),
        list(TABLES.payments, "-created_date", 200),
        list(TABLES.users, "-created_date", 200),
        list(TABLES.staff_members, "full_name", 100),
      ]);
      setBookings(b); setTickets(t); setPayments(p); setUsers(us); setStaffMembers(sm);
      setLoading(false);
    }).catch(() => setLoading(false));

    const unsubT = subscribe(TABLES.tickets, e => {
      if (e.type === "create") setTickets(p => [e.data, ...p]);
      else if (e.type === "update") setTickets(p => p.map(t => t.id === e.id ? e.data : t));
    });
    const unsubB = subscribe(TABLES.bookings, e => {
      if (e.type === "create") setBookings(p => [e.data, ...p]);
      else if (e.type === "update") setBookings(p => p.map(b => b.id === e.id ? e.data : b));
    });
    return () => { unsubT(); unsubB(); };
  }, []);

  // ── Staff CRUD helpers ─────────────────────────────────
  const openAddStaff = () => { setEditingStaff(null); setStaffForm(emptyStaffForm); setShowStaffForm(true); };
  const openEditStaff = (s) => {
    setEditingStaff(s);
    setStaffForm({ full_name: s.full_name, email: s.email, password: "", role_title: s.role_title || "", is_active: s.is_active !== false, portal_role: s.portal_role || "" });
    setShowStaffForm(true);
  };
  const handleSaveStaff = async () => {
    setStaffSaving(true);
    const colorIdx = Math.floor(Math.random() * AVATAR_COLORS.length);
    const data = { full_name: staffForm.full_name, email: staffForm.email, role_title: staffForm.role_title, is_active: staffForm.is_active, portal_role: staffForm.portal_role, avatar_color: editingStaff?.avatar_color || AVATAR_COLORS[colorIdx] };
    if (editingStaff) {
      const updated = await update(TABLES.staff_members, editingStaff.id, data);
      setStaffMembers(p => p.map(s => s.id === editingStaff.id ? updated : s));
    } else {
      const created = await create(TABLES.staff_members, data);
      setStaffMembers(p => [created, ...p]);
    }
    if (staffForm.email && staffForm.portal_role) {
      await inviteUser(staffForm.email, staffForm.portal_role).catch(() => {});
    }
    setShowStaffForm(false);
    setStaffSaving(false);
  };
  const handleDeleteStaff = async (id) => {
    setDeletingStaffId(id);
    await remove(TABLES.staff_members, id);
    setStaffMembers(p => p.filter(s => s.id !== id));
    setDeletingStaffId(null);
    setDeleteConfirm(null);
    setShowStaffForm(false);
  };

  // ── Portal invite ──────────────────────────────────────
  const handlePortalInvite = async () => {
    if (!inviteEmail) return;
    setInviteSaving(true);
    setInviteMsg("");
    await inviteUser(inviteEmail, inviteRole)
      .then(() => { setInviteMsg(`✅ Invite sent to ${inviteEmail}`); setInviteEmail(""); })
      .catch(e => setInviteMsg(`❌ ${e.message || "Failed to send invite"}`));
    setInviteSaving(false);
  };

  // ── Ticket modal helpers ─────────────────────────────────
  const openTicketModal = (t) => {
    setSelectedTicket(t);
    setTicketForm({ adminNote: t.admin_notes || "", internalNote: t.internal_notes || "", assignedTo: t.assigned_to || "", status: t.status });
  };

  const saveTicket = async (newStatus) => {
    const targetStatus = newStatus || ticketForm.status;
    setSaving(true);
    const updated = await update(TABLES.tickets, selectedTicket.id, {
      status: targetStatus,
      admin_notes: ticketForm.adminNote,
      internal_notes: ticketForm.internalNote,
      assigned_to: ticketForm.assignedTo,
      resolved_at: targetStatus === "resolved" ? new Date().toISOString() : selectedTicket.resolved_at,
    });
    if (targetStatus !== selectedTicket.status || ticketForm.adminNote !== selectedTicket.admin_notes) {
      await create(TABLES.notifications, {
        recipient_email: selectedTicket.client_email,
        title: "Support Ticket Updated",
        message: ticketForm.adminNote
          ? `Re: "${selectedTicket.title}" — ${ticketForm.adminNote}`
          : `Your ticket "${selectedTicket.title}" is now ${targetStatus.replace(/_/g, " ")}.`,
        type: "ticket_update",
        related_id: selectedTicket.id,
      });
    }
    setTickets(p => p.map(t => t.id === selectedTicket.id ? updated : t));
    // Send resolved email notification
    if (targetStatus === "resolved" && selectedTicket.status !== "resolved") {
      invokeFunction("sendEventEmails", { event_type: "ticket_resolved", ticket_id: selectedTicket.id }).catch(() => {});
    }
    setSelectedTicket(null);
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
  if (user?.role !== "admin") return (
    <div className="flex items-center justify-center h-64">
      <AlertCircle className="w-12 h-12 text-red-300 mr-3" />
      <p className="text-gray-600 font-medium">Admin access required</p>
    </div>
  );

  // ── Computed metrics ─────────────────────────────────────
  const clientUsers = users.filter(u => u.role !== "admin");
  const activeSubscriptions = clientUsers.length; // every registered user has a subscription

  // MRR: only include users with a known plan (no silent inflation)
  const mrr = clientUsers.reduce((sum, u) => {
    const price = PLAN_PRICES[u.plan] || 0;
    return sum + price;
  }, 0);

  // Subscription breakdown by plan
  const planBreakdown = Object.entries(PLAN_PRICES).map(([key, price]) => ({
    key, label: PLAN_LABELS[key] || key,
    count: clientUsers.filter(u => u.plan === key).length,
    revenue: clientUsers.filter(u => u.plan === key).length * price,
  })).filter(p => p.count > 0);

  // Monthly payments this month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const successPaymentsThisMonth = payments.filter(p =>
    p.status === "success" && p.paid_at &&
    isWithinInterval(new Date(p.paid_at), { start: monthStart, end: monthEnd })
  );
  const collectedThisMonth = successPaymentsThisMonth.reduce((s, p) => s + (p.amount || 0), 0);

  const openTickets = tickets.filter(t => t.status === "open").length;
  const urgentTickets = tickets.filter(t => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed").length;
  const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;
  const resolutionRate = tickets.length > 0 ? Math.round((resolvedTickets / tickets.length) * 100) : 0;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchStatus = ticketStatusFilter === "all" || t.status === ticketStatusFilter;
    const matchSearch = !ticketSearch ||
      t.title?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.client_name?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.client_email?.toLowerCase().includes(ticketSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingActivations = users.filter(u => u.role === "user" && u.subscription_status === "pending").length;

  const TABS = [
    { id: "overview",       label: "Overview",        icon: BarChart3 },
    { id: "subscriptions",  label: "Subscriptions",   icon: Users },
    { id: "activations",    label: "Client Accounts", icon: UserCheck, badge: pendingActivations },
    { id: "tickets",        label: "Tickets",         icon: Ticket, badge: openTickets },
    { id: "bookings",       label: "Bookings",        icon: Calendar },
    { id: "staff",          label: "Staff",           icon: Briefcase },
    { id: "portal",         label: "Staff Portal",    icon: KeyRound },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-500 mt-0.5 text-sm">Home Xperts operations & subscription overview</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
          {format(now, "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div className="overflow-x-auto pb-1 -mx-1">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-max min-w-full mx-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap
                ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ OVERVIEW ══════════════ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Active Subscriptions" value={activeSubscriptions}
              sub="Registered clients" icon={Users} color="from-indigo-500 to-indigo-600" />
            <MetricCard label="Monthly Recurring Revenue" value={`₦${mrr.toLocaleString()}`}
              sub="Projected MRR" icon={TrendingUp} color="from-green-500 to-emerald-600" />
            <MetricCard label="Collected This Month" value={`₦${collectedThisMonth.toLocaleString()}`}
              sub={`${successPaymentsThisMonth.length} transactions`} icon={CreditCard} color="from-purple-500 to-violet-600" />
            <MetricCard label="Open Tickets" value={openTickets}
              sub={urgentTickets > 0 ? `${urgentTickets} urgent` : "All clear"} icon={Ticket}
              color={urgentTickets > 0 ? "from-red-500 to-rose-600" : "from-amber-400 to-orange-500"} />
          </div>

          {/* MRR breakdown + Ticket snapshot */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Subscription plan breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Subscription Breakdown</h3>
                <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                  MRR: ₦{mrr.toLocaleString()}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {planBreakdown.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">No subscriptions yet</div>
                ) : planBreakdown.map(plan => {
                  const pct = mrr > 0 ? Math.round((plan.revenue / mrr) * 100) : 0;
                  return (
                    <div key={plan.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{plan.label}</span>
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">{plan.count} sub{plan.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">₦{plan.revenue.toLocaleString()}</span>
                          <span className="text-xs text-gray-400 ml-1">/ mo</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {/* Unregistered plan note */}
                {clientUsers.filter(u => !u.plan).length > 0 && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                    ⚠️ {clientUsers.filter(u => !u.plan).length} subscriber(s) have no plan set — excluded from MRR. Ask them to update their profile.
                  </div>
                )}
              </div>
            </div>

            {/* Ticket health snapshot */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Ticket Health</h3>
                <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  {resolutionRate}% resolved
                </span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                {Object.entries(TICKET_STATUS_CONFIG).map(([status, cfg]) => {
                  const count = tickets.filter(t => t.status === status).length;
                  return (
                    <button key={status} onClick={() => { setTab("tickets"); setTicketStatusFilter(status); }}
                      className={`rounded-2xl p-4 border text-left hover:opacity-80 transition-all ${cfg.badge}`}>
                      <div className="text-2xl font-black">{count}</div>
                      <div className="text-xs font-semibold mt-0.5">{cfg.label}</div>
                    </button>
                  );
                })}
              </div>
              {/* Urgent tickets */}
              {urgentTickets > 0 && (
                <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700 font-medium">{urgentTickets} urgent ticket{urgentTickets !== 1 ? "s" : ""} need immediate attention</span>
                </div>
              )}
              <div className="px-5 pb-5">
                <button onClick={() => setTab("tickets")}
                  className="w-full py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  View All Tickets →
                </button>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Tickets Requiring Action</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {tickets.filter(t => t.status === "open" || t.status === "in_progress").slice(0, 5).length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">All tickets are handled — great work!</p>
                </div>
              ) : tickets.filter(t => t.status === "open" || t.status === "in_progress").slice(0, 5).map(t => (
                <TicketRow key={t.id} ticket={t} onClick={() => openTicketModal(t)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SUBSCRIPTIONS ══════════════ */}
      {tab === "subscriptions" && (
        <div className="space-y-5">
          {/* Top metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Subscribers" value={activeSubscriptions} sub="Registered users" icon={Users} color="from-indigo-500 to-indigo-600" />
            <MetricCard label="Projected MRR" value={`₦${mrr.toLocaleString()}`} sub="Monthly recurring" icon={TrendingUp} color="from-green-500 to-emerald-600" />
            <MetricCard label="Annual ARR" value={`₦${(mrr * 12).toLocaleString()}`} sub="Annualized revenue" icon={BarChart3} color="from-purple-500 to-violet-600" />
            <MetricCard label="Avg. Subscription" value={activeSubscriptions > 0 ? `₦${Math.round(mrr / activeSubscriptions).toLocaleString()}` : "₦0"} sub="Per subscriber / mo" icon={CreditCard} color="from-cyan-500 to-blue-600" />
          </div>

          {/* Plan breakdown table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Plan Distribution</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Plan", "Price / Mo", "Subscribers", "Monthly Revenue", "% of MRR"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(PLAN_PRICES).map(([key, price]) => {
                    const planUsers = clientUsers.filter(u => u.plan === key);
                    const revenue = planUsers.length * price;
                    const pct = mrr > 0 ? ((revenue / mrr) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={key} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-sm text-gray-900">{PLAN_LABELS[key]}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">₦{price.toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                            ${planUsers.length > 0 ? "bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-400"}`}>
                            <Users className="w-3 h-3" /> {planUsers.length}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-sm text-gray-900">
                          {revenue > 0 ? `₦${revenue.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-indigo-50/50 font-bold">
                    <td className="px-5 py-3.5 text-sm text-indigo-800">Total</td>
                    <td className="px-5 py-3.5" />
                    <td className="px-5 py-3.5 text-sm text-indigo-800">{activeSubscriptions}</td>
                    <td className="px-5 py-3.5 text-sm text-indigo-800">₦{mrr.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm text-indigo-800">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Subscriber list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">All Subscribers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Subscriber", "Plan", "Monthly", "Joined"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientUsers.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-400 text-sm">No subscribers yet</td></tr>
                  ) : clientUsers.map(u => {
                    const price = PLAN_PRICES[u.plan] || 20000;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {u.full_name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900">{u.full_name || "—"}</div>
                              <div className="text-xs text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${u.plan ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            {PLAN_LABELS[u.plan] || "Not set"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-sm text-gray-900">₦{price.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          {u.created_date ? format(new Date(u.created_date), "MMM d, yyyy") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ CLIENT ACTIVATIONS ══════════════ */}
      {tab === "activations" && <ClientActivation />}

      {/* ══════════════ TICKETS ══════════════ */}
      {tab === "tickets" && (
        <div className="space-y-4">
          {/* Status summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(TICKET_STATUS_CONFIG).map(([status, cfg]) => {
              const count = tickets.filter(t => t.status === status).length;
              return (
                <button key={status} onClick={() => setTicketStatusFilter(prev => prev === status ? "all" : status)}
                  className={`rounded-2xl p-4 border text-left transition-all hover:scale-[1.02]
                    ${ticketStatusFilter === status ? `${cfg.badge} ring-2 ring-current ring-offset-1` : cfg.badge}`}>
                  <div className="text-2xl font-black">{count}</div>
                  <div className="text-xs font-semibold mt-0.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={ticketSearch} onChange={e => setTicketSearch(e.target.value)}
                placeholder="Search by title, client name or email..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select value={ticketStatusFilter} onChange={e => setTicketStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="all">All Statuses</option>
                {Object.entries(TICKET_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            {(ticketSearch || ticketStatusFilter !== "all") && (
              <button onClick={() => { setTicketSearch(""); setTicketStatusFilter("all"); }}
                className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                Clear
              </button>
            )}
          </div>

          {/* Ticket list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm">
                {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
                {ticketStatusFilter !== "all" ? ` · ${TICKET_STATUS_CONFIG[ticketStatusFilter]?.label}` : ""}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {filteredTickets.length === 0 ? (
                <div className="py-16 text-center">
                  <Ticket className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No tickets match your filters</p>
                </div>
              ) : filteredTickets.map(t => (
                <TicketRow key={t.id} ticket={t} onClick={() => openTicketModal(t)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ BOOKINGS ══════════════ */}
      {tab === "bookings" && (
        <div className="space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total",       value: bookings.length,                                         color: "from-indigo-500 to-indigo-600" },
              { label: "Pending",     value: bookings.filter(b => b.status === "pending").length,     color: "from-amber-400 to-orange-500" },
              { label: "Confirmed",   value: bookings.filter(b => b.status === "confirmed").length,   color: "from-blue-500 to-blue-600" },
              { label: "Completed",   value: bookings.filter(b => b.status === "completed").length,   color: "from-green-500 to-emerald-600" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-8 text-center">
            <Calendar className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Full Bookings Management</h3>
            <p className="text-sm text-gray-500 mb-5">Search, filter, assign staff, update status, generate invoices and message clients — all in the dedicated Bookings page.</p>
            <Link to="/AdminBookings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 text-sm">
              Open Full Bookings Manager <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ══════════════ STAFF ══════════════ */}
      {tab === "staff" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">{staffMembers.length} team member{staffMembers.length !== 1 ? "s" : ""}</div>
            <button onClick={openAddStaff}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
              <Plus className="w-4 h-4" /> Add Staff
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {staffMembers.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No staff members yet.</p>
                <button onClick={openAddStaff} className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">Add your first team member →</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {staffMembers.map(member => {
                  const pr = PORTAL_ROLES.find(r => r.value === member.portal_role);
                  return (
                    <div key={member.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${member.avatar_color || AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {member.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                          {member.full_name}
                          {!member.is_active && <span className="text-xs text-gray-400 font-normal">(inactive)</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{member.email} {member.role_title && `· ${member.role_title}`}</div>
                      </div>
                      {pr && (
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold bg-gradient-to-r ${pr.color} text-white hidden sm:inline`}>
                          {pr.label}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => openEditStaff(member)}
                          className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm({ id: member.id, name: member.full_name, context: "list" })} disabled={deletingStaffId === member.id}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ STAFF PORTAL ══════════════ */}
      {tab === "portal" && (
        <div className="space-y-6">
          {/* Quick invite */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Create Portal Login</h3>
            <p className="text-sm text-gray-400 mb-5">Send an invite to a staff member so they can log in to their department portal.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="staff@email.com"
                type="email"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {PORTAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button onClick={handlePortalInvite} disabled={inviteSaving || !inviteEmail}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap">
                <Send className="w-4 h-4" /> {inviteSaving ? "Sending..." : "Send Invite"}
              </button>
            </div>
            {inviteMsg && (
              <div className={`mt-3 text-sm px-4 py-2.5 rounded-xl ${inviteMsg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                {inviteMsg}
              </div>
            )}
          </div>

          {/* Portal directory */}
          <div className="grid sm:grid-cols-2 gap-4">
            {PORTAL_ROLES.map(role => {
              const members = staffMembers.filter(s => s.portal_role === role.value);
              return (
                <div key={role.value} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className={`h-1.5 bg-gradient-to-r ${role.color}`} />
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{role.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Login path: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{role.loginPath}</code></div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold bg-gradient-to-r ${role.color} text-white`}>{members.length}</span>
                    </div>
                    {members.length === 0 ? (
                      <div className="text-xs text-gray-400 py-2">No staff assigned to this portal yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${m.avatar_color || AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                              {m.full_name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{m.full_name}</div>
                              <div className="text-xs text-gray-400 truncate">{m.email}</div>
                            </div>
                            <button
                              onClick={() => inviteUser(m.email, m.portal_role).then(() => alert(`Invite resent to ${m.email}`)).catch(e => alert(e.message))}
                              className="text-xs px-2.5 py-1 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium flex items-center gap-1 flex-shrink-0"
                              title="Resend invite">
                              <Mail className="w-3 h-3" /> Resend
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ STAFF ADD/EDIT MODAL ══════════════ */}
      {showStaffForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</h3>
              <button onClick={() => setShowStaffForm(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                  <input value={staffForm.full_name} onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="jane@team.com" />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role / Title</label>
                  <input value={staffForm.role_title} onChange={e => setStaffForm(f => ({ ...f, role_title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. Senior Cleaner" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Portal Department</label>
                  <select value={staffForm.portal_role} onChange={e => setStaffForm(f => ({ ...f, portal_role: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                    <option value="">— No portal access —</option>
                    {PORTAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Staff will use their email + password to log in to this portal.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="staff_active_ad" checked={staffForm.is_active} onChange={e => setStaffForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="staff_active_ad" className="text-sm font-medium text-gray-700">Active team member</label>
              </div>
            </div>
            <div className="px-6 pb-5 space-y-2">
              <div className="flex gap-3">
                <button onClick={() => setShowStaffForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveStaff} disabled={staffSaving || !staffForm.full_name || !staffForm.email}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {staffSaving ? "Saving..." : editingStaff ? "Save Changes" : "Add Member"}
                </button>
              </div>
              {editingStaff && (
                <button
                  onClick={() => setDeleteConfirm({ id: editingStaff.id, name: editingStaff.full_name, context: "modal" })}
                  className="w-full px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete Staff Member
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ DELETE CONFIRM MODAL ══════════════ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Delete Staff Member</div>
                <div className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 mb-5">
              Are you sure you want to remove <span className="font-semibold text-gray-900">{deleteConfirm.name}</span> from the team?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDeleteStaff(deleteConfirm.id)} disabled={deletingStaffId === deleteConfirm.id}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingStaffId === deleteConfirm.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TICKET MODAL ══════════════ */}
      {selectedTicket && (() => {
        const tsc = TICKET_STATUS_CONFIG[selectedTicket.status] || TICKET_STATUS_CONFIG.open;
        const pCfg = PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.medium;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className={`h-1.5 rounded-t-2xl ${tsc.dot}`} />
              <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selectedTicket.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-500">{selectedTicket.client_name} · {selectedTicket.client_email}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tsc.badge}`}>{tsc.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pCfg.badge}`}>{pCfg.label}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{selectedTicket.category?.replace(/_/g, " ")}{selectedTicket.sub_category && ` › ${selectedTicket.sub_category}`}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(selectedTicket.created_date), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>

                {/* Client issue */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Client's Issue</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{selectedTicket.description}</div>
                </div>

                {/* Previous admin note */}
                {selectedTicket.admin_notes && (
                  <div>
                    <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Previous Response</div>
                    <div className="text-sm text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl p-4 leading-relaxed">{selectedTicket.admin_notes}</div>
                  </div>
                )}

                {/* Assign staff */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <UserCheck className="w-3 h-3 inline mr-1" /> Assign to Staff
                  </label>
                  <select value={ticketForm.assignedTo} onChange={e => setTicketForm(f => ({ ...f, assignedTo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">— Unassigned —</option>
                    {staffMembers.map(s => <option key={s.id} value={s.full_name}>{s.full_name}{s.role_title ? ` (${s.role_title})` : ""}</option>)}
                  </select>
                </div>

                {/* Internal notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <MessageSquare className="w-3 h-3 inline mr-1" /> Internal Notes
                    <span className="text-gray-400 normal-case font-normal ml-1">(team only)</span>
                  </label>
                  <textarea value={ticketForm.internalNote} onChange={e => setTicketForm(f => ({ ...f, internalNote: e.target.value }))}
                    rows={2} placeholder="Notes visible to team only..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                </div>

                {/* Client response */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Client Response <span className="text-gray-400 normal-case font-normal ml-1">(sent as notification)</span>
                  </label>
                  <textarea value={ticketForm.adminNote} onChange={e => setTicketForm(f => ({ ...f, adminNote: e.target.value }))}
                    rows={3} placeholder="Write a message to the client..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                </div>

                {/* Quick status buttons */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Update Status</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(TICKET_STATUS_CONFIG).map(([status, cfg]) => (
                      <button key={status} onClick={() => saveTicket(status)} disabled={saving || ticketForm.status === status}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize transition-all disabled:opacity-40 border
                          ${ticketForm.status === status ? `${cfg.badge} ring-2 ring-offset-1 ring-current` : `${cfg.badge} hover:opacity-80`}`}>
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => saveTicket()} disabled={saving}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}