import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { inviteUser } from '@/lib/api';
import { useState, useEffect } from "react";
import { Plus, Pencil, X, AlertCircle, Star, Briefcase, CheckCircle, Users, Mail } from "lucide-react";

const SERVICE_TYPES = ["cleaning","fumigation","lawn_care","pest_control","deep_cleaning","pool_maintenance"];
const AVATAR_COLORS = ["from-indigo-500 to-purple-600","from-emerald-500 to-teal-600","from-amber-500 to-orange-600","from-rose-500 to-pink-600","from-cyan-500 to-blue-600","from-violet-500 to-fuchsia-600"];
const emptyForm = { full_name: "", email: "", phone: "", role_title: "", specializations: [], is_active: true, portal_role: "" };

const PORTAL_ROLES = [
  { value: "staff_hr",          label: "HR Department",          color: "from-pink-500 to-rose-600" },
  { value: "staff_account",     label: "Accounts Department",    color: "from-emerald-500 to-teal-600" },
  { value: "staff_operations",  label: "Operations Department",  color: "from-cyan-500 to-blue-600" },
  { value: "staff_managerial",  label: "Managerial Department",  color: "from-violet-500 to-purple-600" },
];

export default function StaffManager() {
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    getMe().then(async u => {
      setUser(u);
      if (u?.role !== "admin") { setLoading(false); return; }
      const [s, b] = await Promise.all([
        list(TABLES.staff_members, "-created_date", 100),
        list(TABLES.bookings, "-created_date", 200),
      ]);
      setStaff(s); setBookings(b);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ full_name: s.full_name, email: s.email, phone: s.phone || "", role_title: s.role_title || "", specializations: s.specializations || [], is_active: s.is_active !== false, portal_role: s.portal_role || "" });
    setShowForm(true);
  };

  const toggleSpec = (svc) => setForm(f => ({
    ...f,
    specializations: f.specializations.includes(svc) ? f.specializations.filter(x => x !== svc) : [...f.specializations, svc],
  }));

  const handleSave = async () => {
    setSaving(true);
    const colorIdx = Math.floor(Math.random() * AVATAR_COLORS.length);
    const data = { ...form, avatar_color: editing?.avatar_color || AVATAR_COLORS[colorIdx] };
    if (editing) {
      const updated = await update(TABLES.staff_members, editing.id, data);
      setStaff(p => p.map(s => s.id === editing.id ? updated : s));
    } else {
      const created = await create(TABLES.staff_members, data);
      setStaff(p => [created, ...p]);
    }
    // If a portal role is set, invite this email to the platform with the correct role
    if (form.email && form.portal_role) {
      await inviteUser(form.email, form.portal_role).catch(() => {});
    }
    setShowForm(false);
    setSaving(false);
  };

  const getStaffStats = (member) => {
    const assigned = bookings.filter(b => b.assigned_team === member.full_name);
    const completed = assigned.filter(b => b.status === "completed");
    return { total: assigned.length, completed: completed.length };
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (user?.role !== "admin") return <div className="flex items-center justify-center h-64"><AlertCircle className="w-10 h-10 text-red-300 mr-3" /><p className="text-gray-600 font-medium">Admin access required</p></div>;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Manager</h2>
          <p className="text-gray-500 mt-1 text-sm">Manage team members, specializations, and performance</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map(member => {
          const stats = getStaffStats(member);
          const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
          return (
            <div key={member.id} className={`bg-white rounded-2xl border ${member.is_active ? "border-gray-100" : "border-dashed border-gray-200 opacity-60"} shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => setSelectedStaff(member)}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${member.avatar_color || AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {member.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{member.full_name}</div>
                      <div className="text-xs text-gray-500">{member.role_title || "Staff"}</div>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); openEdit(member); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                    <div className="text-[10px] text-gray-400">Jobs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{stats.completed}</div>
                    <div className="text-[10px] text-gray-400">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-indigo-600">{completionRate}%</div>
                    <div className="text-[10px] text-gray-400">Rate</div>
                  </div>
                </div>

                {/* Completion bar */}
                {stats.total > 0 && (
                  <div className="h-1.5 bg-gray-100 rounded-full mb-3">
                    <div className="h-1.5 bg-indigo-500 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                  </div>
                )}

                {/* Portal Role Badge */}
                {member.portal_role && (() => {
                  const pr = PORTAL_ROLES.find(r => r.value === member.portal_role);
                  return pr ? (
                    <div className="mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gradient-to-r ${pr.color} text-white`}>
                        {pr.label}
                      </span>
                    </div>
                  ) : null;
                })()}
                {/* Specializations */}
                {member.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {member.specializations.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium capitalize">
                        {s.replace(/_/g, " ")}
                      </span>
                    ))}
                    {member.specializations.length > 3 && <span className="text-[10px] text-gray-400">+{member.specializations.length - 3}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {staff.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm">No staff members yet. Add your first team member.</p>
          </div>
        )}
      </div>

      {/* Staff Detail Modal */}
      {selectedStaff && (() => {
        const stats = getStaffStats(selectedStaff);
        const memberBookings = bookings.filter(b => b.assigned_team === selectedStaff.full_name).slice(0, 5);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedStaff.avatar_color || AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-lg`}>
                    {selectedStaff.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{selectedStaff.full_name}</div>
                    <div className="text-xs text-gray-500">{selectedStaff.role_title}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedStaff(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Jobs", value: stats.total, color: "text-gray-900" },
                    { label: "Completed", value: stats.completed, color: "text-green-600" },
                    { label: "Completion", value: `${stats.total ? Math.round((stats.completed/stats.total)*100) : 0}%`, color: "text-indigo-600" },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-gray-50 rounded-2xl p-4">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div>
                   <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact</div>
                   <div className="text-sm text-gray-700">{selectedStaff.email}</div>
                   {selectedStaff.phone && <div className="text-sm text-gray-500">{selectedStaff.phone}</div>}
                 </div>
                 {selectedStaff.portal_role && (() => {
                   const pr = PORTAL_ROLES.find(r => r.value === selectedStaff.portal_role);
                   return pr ? (
                     <div>
                       <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Portal Access</div>
                       <div className="flex items-center justify-between">
                         <span className={`text-xs px-3 py-1 rounded-full font-semibold bg-gradient-to-r ${pr.color} text-white`}>{pr.label}</span>
                         <button
                           onClick={() => inviteUser(selectedStaff.email, selectedStaff.portal_role).then(() => alert("Invite sent to " + selectedStaff.email)).catch(e => alert(e.message))}
                           className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-colors font-medium">
                           <Mail className="w-3 h-3" /> Resend Invite
                         </button>
                       </div>
                     </div>
                   ) : null;
                 })()}
                {selectedStaff.specializations?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Specializations</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedStaff.specializations.map(s => (
                        <span key={s} className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium capitalize">{s.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  </div>
                )}
                {memberBookings.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Assignments</div>
                    <div className="space-y-2">
                      {memberBookings.map(b => (
                        <div key={b.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 capitalize">{b.service_type?.replace(/_/g, " ")}</div>
                            <div className="text-xs text-gray-400">{b.client_name} · {b.scheduled_date}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                            ${b.status === "completed" ? "bg-green-50 text-green-600" : b.status === "cancelled" ? "bg-red-50 text-red-500" : "bg-indigo-50 text-indigo-600"}`}>
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? "Edit Staff Member" : "Add Staff Member"}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                  <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="jane@team.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="+234 ..." />
                </div>
                <div className="col-span-2">
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role / Title</label>
                   <input value={form.role_title} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))}
                     className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. Senior Cleaner, Team Lead" />
                 </div>
                 <div className="col-span-2">
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Portal Access Department</label>
                   <select value={form.portal_role} onChange={e => setForm(f => ({ ...f, portal_role: e.target.value }))}
                     className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                     <option value="">— No portal access —</option>
                     {PORTAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                   </select>
                   <p className="text-xs text-gray-400 mt-1">This determines which staff portal the user can access after signing in.</p>
                 </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map(s => (
                    <button key={s} onClick={() => toggleSpec(s)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-medium capitalize transition-all
                        ${form.specializations.includes(s) ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="staff_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="staff_active" className="text-sm font-medium text-gray-700">Active team member</label>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.full_name || !form.email}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}