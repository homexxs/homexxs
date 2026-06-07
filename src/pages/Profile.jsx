import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, updateMe, signOut } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Save, CheckCircle, Trash2, AlertTriangle } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getMe().then(u => {
      setUser(u);
      setForm({
        full_name: u.full_name || "",
        phone: u.phone || "",
        address: u.address || "",
      });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await updateMe(form);
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <p className="text-gray-500 mt-1 text-sm">Manage your account information</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-200">
            {form.full_name?.[0] || user?.email?.[0] || "U"}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{form.full_name || "Your Name"}</h3>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </div>
            {user?.role && (
              <span className="mt-2 inline-block text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium capitalize">
                {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-5">Personal Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Your full name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="+234 800 000 0000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Address</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                placeholder="Your home address"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {saved ? (
          <><CheckCircle className="w-4 h-4" /> Saved!</>
        ) : loading ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
        ) : (
          <><Save className="w-4 h-4" /> Save Changes</>
        )}
      </button>

      {/* Delete Account */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Delete Account</h3>
            <p className="text-xs text-gray-400">Permanently remove your account and all associated data</p>
          </div>
        </div>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full py-2.5 border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete My Account
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">
                This action is <span className="font-black">permanent and irreversible</span>. All your bookings, payment history, and account data will be deleted.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    // Delete all bookings for this user
                    const userBookings = await filter(TABLES.bookings, { client_email: user.email });
                    await Promise.all(userBookings.map(b => remove(TABLES.bookings, b.id)));
                    // Delete notifications
                    const notifs = await filter(TABLES.notifications, { recipient_email: user.email });
                    await Promise.all(notifs.map(n => remove(TABLES.notifications, n.id)));
                  } catch {}
                  signOut("/Landing");
                }}
                className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {deleting
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                  : <><Trash2 className="w-4 h-4" /> Yes, Delete Account</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}