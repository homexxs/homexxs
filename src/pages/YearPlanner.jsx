import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useState, useEffect } from "react";
import {
  CalendarDays, Plus, Trash2, Edit2, Send, CheckCircle2,
  ChevronDown, ChevronUp, X, Save, Loader2, Eye, EyeOff, AlertCircle
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const SERVICE_OPTIONS = [
  "Routine Checks and Fixes",
  "Deep Cleaning of Home",
  "Fumigation of Home",
  "Vacuuming of Chairs",
  "Vacuuming of Mattress",
  "Washing of Curtain",
  "AC Servicing",
  "Gas Cooker Check",
  "Servicing of Generator",
  "Pool Maintenance",
  "Lawn Care",
];

// Pre-loaded 2026 schedule from the attached PDF
const DEFAULT_2026 = {
  year: 2026,
  title: "Home Care Schedule 2026",
  notes: "Full year home care cover — cleaning, servicing, repairs and more.",
  months: [
    { month: 1,  month_name: "January",   weeks: [{ week: 1, services: [] }, { week: 2, services: ["Routine Checks and Fixes"] }, { week: 3, services: [] }, { week: 4, services: ["Deep Cleaning of Home"] }] },
    { month: 2,  month_name: "February",  weeks: [{ week: 1, services: [] }, { week: 2, services: ["Vacuuming of Chairs"] }, { week: 3, services: ["Gas Cooker Check"] }, { week: 4, services: ["Deep Cleaning of Home"] }] },
    { month: 3,  month_name: "March",     weeks: [{ week: 1, services: ["Routine Checks and Fixes"] }, { week: 2, services: [] }, { week: 3, services: [] }, { week: 4, services: ["Deep Cleaning of Home"] }] },
    { month: 4,  month_name: "April",     weeks: [{ week: 1, services: ["Washing of Curtain"] }, { week: 2, services: [] }, { week: 3, services: ["Fumigation of Home"] }, { week: 4, services: [] }] },
    { month: 5,  month_name: "May",       weeks: [{ week: 1, services: ["Vacuuming of Chairs"] }, { week: 2, services: [] }, { week: 3, services: [] }, { week: 4, services: ["Deep Cleaning of Home"] }] },
    { month: 6,  month_name: "June",      weeks: [{ week: 1, services: ["Servicing of Generator"] }, { week: 2, services: ["Routine Checks and Fixes"] }, { week: 3, services: ["AC Servicing"] }, { week: 4, services: [] }] },
    { month: 7,  month_name: "July",      weeks: [{ week: 1, services: [] }, { week: 2, services: ["Vacuuming of Chairs"] }, { week: 3, services: [] }, { week: 4, services: [] }] },
    { month: 8,  month_name: "August",    weeks: [{ week: 1, services: ["Vacuuming of Chairs"] }, { week: 2, services: ["Vacuuming of Mattress"] }, { week: 3, services: ["Routine Checks and Fixes"] }, { week: 4, services: ["Deep Cleaning of Home"] }] },
    { month: 9,  month_name: "September", weeks: [{ week: 1, services: ["Routine Checks and Fixes"] }, { week: 2, services: [] }, { week: 3, services: ["Routine Checks and Fixes"] }, { week: 4, services: [] }] },
    { month: 10, month_name: "October",   weeks: [{ week: 1, services: [] }, { week: 2, services: ["Fumigation of Home"] }, { week: 3, services: ["Washing of Curtain"] }, { week: 4, services: [] }] },
    { month: 11, month_name: "November",  weeks: [{ week: 1, services: ["Vacuuming of Chairs"] }, { week: 2, services: [] }, { week: 3, services: [] }, { week: 4, services: [] }] },
    { month: 12, month_name: "December",  weeks: [{ week: 1, services: ["Vacuuming of Mattress"] }, { week: 2, services: [] }, { week: 3, services: ["Routine Checks and Fixes"] }, { week: 4, services: ["Deep Cleaning of Home"] }] },
  ],
};

const SERVICE_COLORS = {
  "Routine Checks and Fixes":  "bg-blue-100 text-blue-700 border-blue-200",
  "Deep Cleaning of Home":     "bg-purple-100 text-purple-700 border-purple-200",
  "Fumigation of Home":        "bg-orange-100 text-orange-700 border-orange-200",
  "Vacuuming of Chairs":       "bg-green-100 text-green-700 border-green-200",
  "Vacuuming of Mattress":     "bg-teal-100 text-teal-700 border-teal-200",
  "Washing of Curtain":        "bg-pink-100 text-pink-700 border-pink-200",
  "AC Servicing":              "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Gas Cooker Check":          "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Servicing of Generator":    "bg-red-100 text-red-700 border-red-200",
  "Pool Maintenance":          "bg-sky-100 text-sky-700 border-sky-200",
  "Lawn Care":                 "bg-lime-100 text-lime-700 border-lime-200",
};

function ServiceTag({ service, onRemove }) {
  const color = SERVICE_COLORS[service] || "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {service}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-70">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

function MonthCard({ monthData, monthIdx, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [addingWeek, setAddingWeek] = useState(null);
  const [serviceInput, setServiceInput] = useState("");

  const addService = (weekIdx, service) => {
    if (!service) return;
    const updated = { ...monthData };
    updated.weeks = updated.weeks.map((w, i) =>
      i === weekIdx ? { ...w, services: [...(w.services || []), service] } : w
    );
    onUpdate(monthIdx, updated);
    setServiceInput("");
    setAddingWeek(null);
  };

  const removeService = (weekIdx, svcIdx) => {
    const updated = { ...monthData };
    updated.weeks = updated.weeks.map((w, i) =>
      i === weekIdx ? { ...w, services: w.services.filter((_, si) => si !== svcIdx) } : w
    );
    onUpdate(monthIdx, updated);
  };

  const totalServices = monthData.weeks.reduce((s, w) => s + (w.services?.length || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
            {monthData.month_name.slice(0, 3)}
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-900 text-sm">{monthData.month_name}</div>
            <div className="text-xs text-gray-400">{totalServices} service{totalServices !== 1 ? "s" : ""} planned</div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50 space-y-4 pt-4">
          {monthData.weeks.map((week, wi) => (
            <div key={wi} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Week {week.week}</span>
                <button
                  onClick={() => setAddingWeek(addingWeek === wi ? null : wi)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[28px] p-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                {week.services?.length === 0 && (
                  <span className="text-xs text-gray-300 italic">No services this week</span>
                )}
                {week.services?.map((svc, si) => (
                  <ServiceTag key={si} service={svc} onRemove={() => removeService(wi, si)} />
                ))}
              </div>

              {addingWeek === wi && (
                <div className="flex gap-2">
                  <select
                    value={serviceInput}
                    onChange={e => setServiceInput(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select a service...</option>
                    {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => addService(wi, serviceInput)}
                    disabled={!serviceInput}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button onClick={() => setAddingWeek(null)} className="px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function YearPlanner() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    list(TABLES.year_plans, "-year", 20)
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    const emptyMonths = MONTHS.map((m, i) => ({
      month: i + 1,
      month_name: m,
      weeks: [
        { week: 1, services: [] },
        { week: 2, services: [] },
        { week: 3, services: [] },
        { week: 4, services: [] },
      ],
    }));
    const plan = await create(TABLES.year_plans, {
      year: newYear,
      title: newTitle || `Home Care Schedule ${newYear}`,
      is_published: false,
      months: emptyMonths,
    });
    setPlans(p => [plan, ...p]);
    setEditingPlan(plan);
    setShowNewForm(false);
    setSaving(false);
  };

  const handleLoad2026 = async () => {
    setSaving(true);
    const plan = await create(TABLES.year_plans, {
      ...DEFAULT_2026,
      is_published: false,
    });
    setPlans(p => [plan, ...p]);
    setEditingPlan(plan);
    setSaving(false);
  };

  const handleMonthUpdate = (monthIdx, updatedMonth) => {
    setEditingPlan(prev => ({
      ...prev,
      months: prev.months.map((m, i) => i === monthIdx ? updatedMonth : m),
    }));
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    setSaving(true);
    const updated = await update(TABLES.year_plans, editingPlan.id, {
      title: editingPlan.title,
      notes: editingPlan.notes,
      months: editingPlan.months,
    });
    setPlans(p => p.map(x => x.id === updated.id ? updated : x));
    setEditingPlan(updated);
    setSaving(false);
  };

  const handlePublish = async (plan) => {
    setPublishing(plan.id);
    const updated = await update(TABLES.year_plans, plan.id, {
      is_published: !plan.is_published,
      published_at: !plan.is_published ? new Date().toISOString() : null,
    });
    setPlans(p => p.map(x => x.id === updated.id ? updated : x));
    if (editingPlan?.id === plan.id) setEditingPlan(updated);
    setPublishing(null);
  };

  const handleDelete = async (plan) => {
    if (!confirm(`Delete "${plan.title}"? This cannot be undone.`)) return;
    await remove(TABLES.year_plans, plan.id);
    setPlans(p => p.filter(x => x.id !== plan.id));
    if (editingPlan?.id === plan.id) setEditingPlan(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Year Planner</h2>
          <p className="text-gray-500 mt-1 text-sm">Create and publish annual home care schedules for clients</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {plans.every(p => p.year !== 2026) && (
            <button onClick={handleLoad2026} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-purple-200 bg-purple-50 text-purple-700 text-sm font-semibold rounded-xl hover:bg-purple-100 transition-colors">
              📄 Load 2026 Schedule
            </button>
          )}
          <button onClick={() => setShowNewForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> New Year Plan
          </button>
        </div>
      </div>

      {/* New Plan Form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Create New Year Plan</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Year</label>
              <input type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Plan Title</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder={`Home Care Schedule ${newYear}`}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowNewForm(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Plan
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Plans list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">All Plans</div>
          {plans.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No plans yet. Create one or load the 2026 schedule.</p>
            </div>
          )}
          {plans.map(plan => (
            <div key={plan.id}
              onClick={() => setEditingPlan(plan)}
              className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${editingPlan?.id === plan.id ? "border-indigo-400 shadow-md shadow-indigo-50" : "border-gray-100"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-gray-900 text-sm">{plan.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{plan.year}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${plan.is_published ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                  {plan.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={e => { e.stopPropagation(); handlePublish(plan); }}
                  disabled={publishing === plan.id}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${plan.is_published ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200" : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"}`}>
                  {publishing === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : plan.is_published ? <EyeOff className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                  {plan.is_published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(plan); }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 border border-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Plan editor */}
        <div className="lg:col-span-3">
          {!editingPlan ? (
            <div className="bg-white rounded-2xl border border-gray-100 flex items-center justify-center h-64 text-center p-8">
              <div>
                <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Select a plan from the left to edit it</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plan header */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Plan Title</label>
                      <input
                        value={editingPlan.title}
                        onChange={e => setEditingPlan(p => ({ ...p, title: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Notes (optional)</label>
                      <input
                        value={editingPlan.notes || ""}
                        onChange={e => setEditingPlan(p => ({ ...p, notes: e.target.value }))}
                        placeholder="e.g. Full annual cover — cleaning, servicing and repairs"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                    <button onClick={() => handlePublish(editingPlan)} disabled={publishing === editingPlan.id}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors
                        ${editingPlan.is_published
                          ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                          : "bg-green-600 text-white hover:bg-green-700"}`}>
                      {publishing === editingPlan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : editingPlan.is_published ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {editingPlan.is_published ? "Unpublish" : "Publish to Clients"}
                    </button>
                  </div>
                </div>

                {editingPlan.is_published && (
                  <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700 font-medium">
                      This plan is <strong>live</strong> — clients can see it in their Schedules module.
                      {editingPlan.published_at && ` Published ${new Date(editingPlan.published_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}.`}
                    </p>
                  </div>
                )}
                {!editingPlan.is_published && (
                  <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700">This plan is a <strong>draft</strong>. Publish it when ready to make it visible to clients.</p>
                  </div>
                )}
              </div>

              {/* Month cards grid */}
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {editingPlan.months?.map((month, mi) => (
                  <MonthCard key={mi} monthData={month} monthIdx={mi} onUpdate={handleMonthUpdate} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}