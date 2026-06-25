import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Search, Users } from "lucide-react";
import { format } from "date-fns";

const DURATION_MONTHS = { "1_month": 1, "3_months": 3, "6_months": 6, "1_year": 12 };
const DURATION_LABELS = { "1_month": "1 Month", "3_months": "3 Months", "6_months": "6 Months", "1_year": "1 Year" };

const STATUS_STYLE = {
  active:   "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
  pending:  "bg-amber-100 text-amber-700 border-amber-200",
};

export default function ClientActivation() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activating, setActivating] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [u, users] = await Promise.all([
        getMe(),
        list(TABLES.users, "-created_date", 200),
      ]);
      setCurrentUser(u);
      // Only show regular "user" role clients
      setClients(users.filter(u => u.role === "user"));
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  const handleActivate = async (client) => {
    setActivating(client.id);
    const months = DURATION_MONTHS[client.subscription_duration] || 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await update(TABLES.users, client.id, {
      subscription_status: "active",
      subscription_expires_at: expiresAt.toISOString(),
      subscription_activated_by: currentUser?.email,
      subscription_activated_at: new Date().toISOString(),
    });

    // Mark related pending subscription payment as success (if one exists)
    const payments = await filter(TABLES.payments, { client_email: client.email, payment_type: "subscription", status: "pending" });
    if (payments.length > 0) {
      await update(TABLES.payments, payments[0].id, {
        status: "success",
        paid_at: new Date().toISOString(),
        approved_by: currentUser?.email,
        approved_at: new Date().toISOString(),
      });
    }

    // Notify client
    await create(TABLES.notifications, {
      recipient_email: client.email,
      title: "🎉 Subscription Activated!",
      message: `Your HomeX subscription (${DURATION_LABELS[client.subscription_duration] || "subscription"}) has been activated. All features are now unlocked!`,
      type: "payment_received",
      related_id: client.id,
    });

    setClients(prev => prev.map(c => c.id === client.id ? {
      ...c,
      subscription_status: "active",
      subscription_activated_by: currentUser?.email,
      subscription_expires_at: expiresAt.toISOString(),
    } : c));
    setActivating(null);
  };

  const handleDeactivate = async (client) => {
    if (!confirm(`Deactivate ${client.full_name}'s subscription?`)) return;
    setActivating(client.id);
    await update(TABLES.users, client.id, { subscription_status: "inactive" });
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, subscription_status: "inactive" } : c));
    setActivating(null);
  };

  const filtered = clients.filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-bold text-gray-900 text-sm">Client Subscriptions</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{clients.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-56"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No clients found.</div>
        )}
        <div className="divide-y divide-gray-50">
          {filtered.map(client => (
            <div key={client.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {client.full_name?.[0]?.toUpperCase() || "C"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{client.full_name || "—"}</div>
                <div className="text-xs text-gray-400 truncate">{client.email}</div>
                {client.subscription_duration && (
                  <div className="text-xs text-purple-600 font-medium mt-0.5">
                    {DURATION_LABELS[client.subscription_duration] || client.subscription_duration}
                    {client.subscription_amount ? ` · ₦${client.subscription_amount.toLocaleString()}` : ""}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_STYLE[client.subscription_status] || STATUS_STYLE.inactive}`}>
                  {client.subscription_status === "active" ? "ACTIVE" : client.subscription_status === "pending" ? "PENDING" : "INACTIVE"}
                </span>

                {/* Activate */}
                {client.subscription_status !== "active" && (
                  <button
                    onClick={() => handleActivate(client)}
                    disabled={activating === client.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                  >
                    {activating === client.id ? <div className="w-3 h-3 border border-green-400 border-t-green-700 rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Activate
                  </button>
                )}

                {/* Deactivate */}
                {client.subscription_status === "active" && (
                  <button
                    onClick={() => handleDeactivate(client)}
                    disabled={activating === client.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-3 h-3" /> Deactivate
                  </button>
                )}
              </div>

              {/* Expiry */}
              {client.subscription_expires_at && (
                <div className="text-xs text-gray-400 hidden lg:block flex-shrink-0">
                  Expires {format(new Date(client.subscription_expires_at), "MMM d, yyyy")}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
