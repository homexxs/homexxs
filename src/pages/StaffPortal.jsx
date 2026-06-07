import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import {
  Briefcase, Ticket, CalendarDays, CheckCircle2,
  Clock, AlertCircle, ChevronLeft, ChevronRight, User
} from "lucide-react";
import JobCard from "@/components/staff/JobCard";
import TicketItem from "@/components/staff/TicketItem";
import MessagingThread from "@/components/messaging/MessagingThread";

export default function StaffPortal() {
  const [user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("schedule");
  const [viewDate, setViewDate] = useState(new Date());
  const [messagingBooking, setMessagingBooking] = useState(null);

  useEffect(() => {
    const load = async () => {
      const u = await getMe();
      setUser(u);

      // Find matching StaffMember record by email
      const staffList = await filter(TABLES.staff_members, { email: u.email });
      const profile = staffList[0] || null;
      setStaffProfile(profile);

      const staffName = profile?.full_name || u.full_name;

      // Load bookings assigned to this staff member
      const allBookings = await list(TABLES.bookings, "-scheduled_date", 300);
      const myBookings = allBookings.filter(b =>
        b.assigned_team === staffName || b.assigned_team === u.email
      );
      setBookings(myBookings);

      // Load tickets assigned to this staff member
      const allTickets = await list(TABLES.tickets, "-created_date", 100);
      const myTickets = allTickets.filter(t => t.assigned_to === staffName || t.assigned_to === u.email);
      setTickets(myTickets);

      setLoading(false);
    };
    load().catch(() => setLoading(false));

    const unsubB = subscribe(TABLES.bookings, e => {
      if (e.type === "update") setBookings(p => p.map(b => b.id === e.id ? e.data : b));
    });
    const unsubT = subscribe(TABLES.tickets, e => {
      if (e.type === "update") setTickets(p => p.map(t => t.id === e.id ? e.data : t));
    });
    return () => { unsubB(); unsubT(); };
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!staffProfile && user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-96 p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 text-lg mb-2">Staff Profile Not Found</h3>
          <p className="text-gray-500 text-sm">Your account (<span className="font-medium">{user?.email}</span>) is not linked to a staff profile yet. Please ask your admin to add your email in the Staff Manager.</p>
        </div>
      </div>
    );
  }

  const staffName = staffProfile?.full_name || user?.full_name;

  // Bookings for selected date
  const viewDateStr = format(viewDate, "yyyy-MM-dd");
  const dayBookings = bookings.filter(b => b.scheduled_date === viewDateStr);

  // Summary stats
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayJobs = bookings.filter(b => b.scheduled_date === todayStr);
  const completedToday = todayJobs.filter(b => b.status === "completed").length;
  const openTicketsCount = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
  const pendingCheckin = todayJobs.filter(b => !b.checkin_time && !["cancelled", "completed"].includes(b.status)).length;

  const prevDay = () => setViewDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setViewDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });

  const dayLabel = isToday(viewDate) ? "Today" : isTomorrow(viewDate) ? "Tomorrow" : format(viewDate, "EEE, MMM d");

  const TABS = [
    { id: "schedule", label: "My Schedule", icon: CalendarDays },
    { id: "tickets",  label: `Tickets`, icon: Ticket, badge: openTicketsCount },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-7">

      {/* Staff header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200 flex-shrink-0">
            {staffName?.[0]?.toUpperCase() || "S"}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{staffName}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {staffProfile?.role_title && (
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  {staffProfile.role_title}
                </span>
              )}
              {staffProfile?.specializations?.map(s => (
                <span key={s} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Jobs",    value: todayJobs.length,      color: "from-indigo-500 to-indigo-600", icon: CalendarDays },
          { label: "Completed Today", value: completedToday,         color: "from-green-500 to-emerald-600", icon: CheckCircle2 },
          { label: "Pending Check-in",value: pendingCheckin,         color: "from-amber-400 to-orange-500",  icon: Clock },
          { label: "Open Tickets",    value: openTicketsCount,       color: "from-rose-500 to-red-600",      icon: Ticket },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-black text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2
              ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.badge > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SCHEDULE TAB ── */}
      {tab === "schedule" && (
        <div className="space-y-5">
          {/* Date navigator */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5">
            <button onClick={prevDay} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className={`font-black text-lg ${isToday(viewDate) ? "text-indigo-600" : "text-gray-900"}`}>{dayLabel}</div>
              <div className="text-xs text-gray-400">{format(viewDate, "MMMM d, yyyy")}</div>
            </div>
            <button onClick={nextDay} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday warning */}
          {[0, 6].includes(viewDate.getDay()) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Weekends are non-working days. No jobs scheduled on Saturdays or Sundays.
            </div>
          )}

          {/* Job cards */}
          {dayBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-500 text-sm font-medium">No jobs scheduled for {dayLabel.toLowerCase()}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {dayBookings
                .sort((a, b) => (a.scheduled_time || "").localeCompare(b.scheduled_time || ""))
                .map(b => (
                  <JobCard key={b.id} booking={b} staffName={staffName} staffEmail={user?.email}
                   onUpdated={updated => setBookings(p => p.map(x => x.id === updated.id ? updated : x))}
                   onMessage={setMessagingBooking} />
                ))
              }
            </div>
          )}

          {/* Upcoming jobs preview (next 7 days, not today) */}
          {isToday(viewDate) && (() => {
            const soon = bookings.filter(b => {
              if (b.scheduled_date === todayStr) return false;
              const d = parseISO(b.scheduled_date);
              const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
              return diff > 0 && diff <= 7 && !["cancelled"].includes(b.status);
            });
            if (!soon.length) return null;
            return (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming (next 7 days)</div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {soon.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).map(b => (
                      <div key={b.id} className="px-5 py-3.5 flex items-center gap-3">
                        <div className="text-xl flex-shrink-0">{
                          { cleaning: "🧹", fumigation: "🔬", lawn_care: "🌿", pest_control: "🐛", deep_cleaning: "✨", pool_maintenance: "🏊" }[b.service_type] || "🏠"
                        }</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 capitalize">{b.service_type?.replace(/_/g, " ")}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{b.client_name} · {b.address}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-indigo-600">{format(parseISO(b.scheduled_date), "EEE, MMM d")}</div>
                          <div className="text-xs text-gray-400">{b.scheduled_time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TICKETS TAB ── */}
      {tab === "tickets" && (
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <Ticket className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No tickets assigned to you</p>
            </div>
          ) : (
            <>
              {/* Active tickets first */}
              {tickets.filter(t => t.status !== "resolved" && t.status !== "closed").map(t => (
                <TicketItem key={t.id} ticket={t} staffName={staffName}
                  onUpdated={updated => setTickets(p => p.map(x => x.id === updated.id ? updated : x))} />
              ))}
              {/* Closed / resolved */}
              {tickets.filter(t => t.status === "resolved" || t.status === "closed").length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resolved / Closed</div>
                  {tickets.filter(t => t.status === "resolved" || t.status === "closed").map(t => (
                    <TicketItem key={t.id} ticket={t} staffName={staffName}
                      onUpdated={updated => setTickets(p => p.map(x => x.id === updated.id ? updated : x))} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {messagingBooking && user && (
        <MessagingThread booking={messagingBooking} user={user} onClose={() => setMessagingBooking(null)} />
      )}
    </div>
  );
}