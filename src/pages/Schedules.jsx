import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useState, useEffect } from "react";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const QUARTERS = [
  { label: "Q1", months: [1, 2, 3] },
  { label: "Q2", months: [4, 5, 6] },
  { label: "Q3", months: [7, 8, 9] },
  { label: "Q4", months: [10, 11, 12] },
];

const SERVICE_COLORS = {
  "Routine Checks and Fixes":  { bg: "bg-blue-100 text-blue-700 border-blue-200",    dot: "bg-blue-500" },
  "Deep Cleaning of Home":     { bg: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  "Fumigation of Home":        { bg: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  "Vacuuming of Chairs":       { bg: "bg-green-100 text-green-700 border-green-200",   dot: "bg-green-500" },
  "Vacuuming of Mattress":     { bg: "bg-teal-100 text-teal-700 border-teal-200",      dot: "bg-teal-500" },
  "Washing of Curtain":        { bg: "bg-pink-100 text-pink-700 border-pink-200",      dot: "bg-pink-500" },
  "AC Servicing":              { bg: "bg-cyan-100 text-cyan-700 border-cyan-200",      dot: "bg-cyan-500" },
  "Gas Cooker Check":          { bg: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
  "Servicing of Generator":    { bg: "bg-red-100 text-red-700 border-red-200",         dot: "bg-red-500" },
  "Pool Maintenance":          { bg: "bg-sky-100 text-sky-700 border-sky-200",         dot: "bg-sky-500" },
  "Lawn Care":                 { bg: "bg-lime-100 text-lime-700 border-lime-200",      dot: "bg-lime-500" },
};

function ServicePill({ service }) {
  const cfg = SERVICE_COLORS[service] || { bg: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {service}
    </span>
  );
}

export default function Schedules() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");

  useEffect(() => {
    filter(TABLES.year_plans, { is_published: true }, "-year", 10)
      .then(data => {
        setPlans(data);
        if (data.length > 0) setSelectedPlan(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsub = subscribe(TABLES.year_plans, e => {
      if (e.type === "update") {
        if (e.data.is_published) {
          setPlans(p => {
            const exists = p.find(x => x.id === e.id);
            return exists ? p.map(x => x.id === e.id ? e.data : x) : [...p, e.data];
          });
        } else {
          setPlans(p => p.filter(x => x.id !== e.id));
        }
      }
    });
    return unsub;
  }, []);

  // Figure out current quarter
  useEffect(() => {
    const m = new Date().getMonth() + 1;
    if (m <= 3) setSelectedQuarter("Q1");
    else if (m <= 6) setSelectedQuarter("Q2");
    else if (m <= 9) setSelectedQuarter("Q3");
    else setSelectedQuarter("Q4");
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (plans.length === 0) return (
    <div className="flex items-center justify-center h-96 p-6">
      <div className="text-center max-w-sm">
        <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h3 className="font-bold text-gray-900 mb-2">No Schedule Published Yet</h3>
        <p className="text-gray-500 text-sm">Your annual home care schedule will appear here once published by our team.</p>
      </div>
    </div>
  );

  const currentQuarter = QUARTERS.find(q => q.label === selectedQuarter);
  const quarterMonths = selectedPlan?.months?.filter(m => currentQuarter.months.includes(m.month)) || [];

  // All services in this plan (for the legend)
  const allServices = [...new Set(
    (selectedPlan?.months || []).flatMap(m => m.weeks.flatMap(w => w.services || []))
  )];

  // Upcoming services (from today)
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const upcomingServices = [];
  (selectedPlan?.months || []).forEach(m => {
    if (m.month >= currentMonth) {
      m.weeks.forEach(w => {
        (w.services || []).forEach(svc => {
          upcomingServices.push({ month: m.month_name, week: w.week, service: svc });
        });
      });
    }
  });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
          <p className="text-gray-500 mt-1 text-sm">Your annual home care plan — services scheduled throughout the year</p>
        </div>
        {plans.length > 1 && (
          <select
            value={selectedPlan?.id || ""}
            onChange={e => setSelectedPlan(plans.find(p => p.id === e.target.value))}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        )}
      </div>

      {selectedPlan && (
        <>
          {/* Plan banner */}
          <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Annual Home Care Plan</div>
                <h3 className="text-xl font-black">{selectedPlan.title}</h3>
                {selectedPlan.notes && <p className="text-white/70 text-sm mt-1">{selectedPlan.notes}</p>}
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-300 flex-shrink-0" />
                <span className="text-sm font-semibold text-white">Active Plan · {selectedPlan.year}</span>
              </div>
            </div>
          </div>

          {/* Upcoming 3 services */}
          {upcomingServices.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h4 className="font-bold text-gray-900 text-sm">Upcoming Services</h4>
              </div>
              <div className="divide-y divide-gray-50">
                {upcomingServices.slice(0, 4).map((item, i) => {
                  const cfg = SERVICE_COLORS[item.service] || { bg: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
                  return (
                    <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{item.service}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{item.month} · Week {item.week}</div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.bg}`}>{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quarter tabs */}
          <div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
              {QUARTERS.map(q => (
                <button key={q.label} onClick={() => setSelectedQuarter(q.label)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${selectedQuarter === q.label ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {q.label} {selectedPlan.year}
                </button>
              ))}
            </div>

            {/* Month columns */}
            <div className="grid sm:grid-cols-3 gap-4">
              {quarterMonths.map(month => {
                const totalServices = month.weeks.reduce((s, w) => s + (w.services?.length || 0), 0);
                return (
                  <div key={month.month} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3.5">
                      <div className="font-black text-white text-lg">{month.month_name}</div>
                      <div className="text-white/60 text-xs">{totalServices} service{totalServices !== 1 ? "s" : ""} scheduled</div>
                    </div>
                    <div className="p-4 space-y-3">
                      {month.weeks.map(week => (
                        <div key={week.week}>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Week {week.week}</div>
                          {week.services?.length === 0 ? (
                            <div className="text-xs text-gray-300 italic py-1">—</div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {week.services.map((svc, si) => (
                                <ServicePill key={si} service={svc} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Services legend */}
          {allServices.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Services in This Plan</div>
              <div className="flex flex-wrap gap-2">
                {allServices.map(svc => <ServicePill key={svc} service={svc} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}