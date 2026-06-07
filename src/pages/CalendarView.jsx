import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Clock, CalendarDays, MessageSquare } from "lucide-react";
import MessagingThread from "@/components/messaging/MessagingThread";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, setMonth, setDate, getYear } from "date-fns";
import { SERVICE_CONFIG, STATUS_CONFIG } from "@/components/shared/ColorConfig";

// Convert YearPlan month/week entries into virtual calendar events
function expandYearPlanEvents(yearPlans, targetYear) {
  const events = [];
  yearPlans.forEach(plan => {
    if (!plan.is_published || !plan.months) return;
    plan.months.forEach(monthEntry => {
      const monthIdx = (monthEntry.month || 1) - 1; // 0-indexed
      if (!monthEntry.weeks) return;
      monthEntry.weeks.forEach(weekEntry => {
        // Place event on first weekday of that week in the month
        const weekNum = weekEntry.week || 1;
        const day = Math.min((weekNum - 1) * 7 + 1, 28);
        const eventDate = setDate(setMonth(new Date(targetYear, 0, 1), monthIdx), day);
        (weekEntry.services || []).forEach(svc => {
          events.push({
            id: `plan-${plan.id}-${monthIdx}-${weekNum}-${svc}`,
            type: "plan",
            service: svc,
            date: format(eventDate, "yyyy-MM-dd"),
            label: svc,
            planTitle: plan.title,
          });
        });
      });
    });
  });
  return events;
}

export default function CalendarView() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [yearPlanEvents, setYearPlanEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messagingBooking, setMessagingBooking] = useState(null);

  useEffect(() => {
    getMe().then(async u => {
      setUser(u);
      const query = u?.role === "admin" ? {} : { client_email: u.email };
      const [bk, plans] = await Promise.all([
        filter(TABLES.bookings, query, "-scheduled_date", 300),
        filter(TABLES.year_plans, { is_published: true }, "year", 10),
      ]);
      setBookings(bk);
      const currentYear = getYear(new Date());
      const allEvents = plans.flatMap(p => expandYearPlanEvents([p], p.year || currentYear));
      setYearPlanEvents(allEvents);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = subscribe(TABLES.bookings, event => {
      if (event.type === "create") setBookings(p => [...p, event.data]);
      else if (event.type === "update") setBookings(p => p.map(b => b.id === event.id ? event.data : b));
      else if (event.type === "delete") setBookings(p => p.filter(b => b.id !== event.id));
    });
    return unsub;
  }, []);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  const getBookingsForDay = (day) => bookings.filter(b => b.scheduled_date && isSameDay(new Date(b.scheduled_date), day));
  const getPlanEventsForDay = (day) => yearPlanEvents.filter(e => e.date && isSameDay(new Date(e.date), day));
  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];
  const selectedDayPlanEvents = selectedDay ? getPlanEventsForDay(selectedDay) : [];

  const handleCancel = async (booking) => {
    await update(TABLES.bookings, booking.id, { status: "cancelled" });
    setSelectedBooking(null);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Calendar</h2>
          <p className="text-gray-500 mt-1 text-sm">View and manage your scheduled services</p>
        </div>
        {/* Legend */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => (
              <span key={key} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.badge}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label.split(" ").slice(1).join(" ")}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "rescheduled").map(([key, cfg]) => (
              <span key={key} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.badge}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-gray-900 text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array(startDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
              {days.map(day => {
                const dayBookings = getBookingsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => !isWeekend && setSelectedDay(day)}
                    className={`relative min-h-[68px] p-1.5 rounded-xl text-left transition-all
                      ${isWeekend ? "bg-gray-50/50 cursor-not-allowed" : isSelected ? "bg-indigo-600 shadow-lg shadow-indigo-200" : isToday(day) ? "bg-indigo-50 ring-2 ring-inset ring-indigo-200" : "hover:bg-gray-50"}
                      ${!isCurrentMonth ? "opacity-25" : ""}`}
                  >
                    <span className={`text-xs font-bold block text-center mb-1
                      ${isWeekend ? "text-gray-300" : isSelected ? "text-white" : isToday(day) ? "text-indigo-600" : "text-gray-700"}`}>
                      {format(day, "d")}
                    </span>

                    {/* Dots: bookings + plan events */}
                    {(dayBookings.length > 0 || getPlanEventsForDay(day).length > 0) && (
                      <div className="flex flex-wrap gap-0.5 justify-center mb-0.5">
                        {dayBookings.slice(0, 3).map((b, i) => (
                          <span key={i} className={`w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white ${STATUS_CONFIG[b.status]?.dot || "bg-gray-400"}`} />
                        ))}
                        {getPlanEventsForDay(day).slice(0, 2).map((e, i) => (
                          <span key={`p-${i}`} className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white bg-emerald-400" title={e.label} />
                        ))}
                      </div>
                    )}

                    {/* Service chips (sm+) */}
                    <div className="hidden sm:block space-y-0.5">
                      {dayBookings.slice(0, 1).map((b, i) => {
                        const svc = SERVICE_CONFIG[b.service_type];
                        return (
                          <div key={i} className={`text-[9px] px-1 py-0.5 rounded font-semibold truncate border-l-2
                            ${isSelected ? "bg-white/15 text-white border-white/40" : `${svc?.badge || "bg-gray-100 text-gray-600"} ${svc?.bar || ""}`}`}>
                            {svc?.label || b.service_type}
                          </div>
                        );
                      })}
                      {getPlanEventsForDay(day).slice(0, 1).map((e, i) => (
                        <div key={`pc-${i}`} className={`text-[9px] px-1 py-0.5 rounded font-semibold truncate border-l-2
                          ${isSelected ? "bg-white/15 text-white border-white/40" : "bg-emerald-50 text-emerald-700 border-l-emerald-400"}`}>
                          📋 {e.label}
                        </div>
                      ))}
                      {(dayBookings.length + getPlanEventsForDay(day).length) > 2 && (
                        <div className={`text-[9px] text-center font-medium ${isSelected ? "text-white/60" : "text-gray-400"}`}>
                          +{dayBookings.length + getPlanEventsForDay(day).length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Day panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {!selectedDay ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div className="text-5xl mb-4">📅</div>
                <p className="text-gray-500 text-sm">Select a day to view services</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">{format(selectedDay, "EEEE, MMMM d")}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedDayBookings.length + selectedDayPlanEvents.length} item{(selectedDayBookings.length + selectedDayPlanEvents.length) !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex-1 divide-y divide-gray-50 overflow-y-auto max-h-[500px]">
                {/* Year Plan scheduled events */}
                {selectedDayPlanEvents.map((e, i) => (
                  <div key={e.id} className="w-full px-5 py-3.5 text-left bg-emerald-50/60">
                    <div className="flex items-start gap-3">
                      <div className="w-1 self-stretch rounded-full flex-shrink-0 bg-emerald-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span className="font-semibold text-sm text-emerald-900">{e.label}</span>
                        </div>
                        <div className="text-xs text-emerald-600 mt-0.5">{e.planTitle} · Planned Schedule</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-emerald-100 text-emerald-700 border-emerald-200 flex-shrink-0">Scheduled</span>
                    </div>
                  </div>
                ))}
                {selectedDayBookings.length === 0 && selectedDayPlanEvents.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No services scheduled</div>
                ) : selectedDayBookings.map(b => {
                  const svc = SERVICE_CONFIG[b.service_type];
                  const sts = STATUS_CONFIG[b.status];
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className="w-full px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Service color bar */}
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${svc?.dot || "bg-gray-300"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900">{svc?.label || b.service_type?.replace(/_/g, " ")}</span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {b.scheduled_time}
                          </div>
                          {b.client_name && <div className="text-xs text-gray-400 truncate mt-0.5">{b.client_name}</div>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${sts?.badge || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                          {sts?.label || b.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (() => {
        const svc = SERVICE_CONFIG[selectedBooking.service_type];
        const sts = STATUS_CONFIG[selectedBooking.status];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              {/* Colored header strip */}
              <div className={`h-1.5 ${svc?.dot || "bg-gray-400"}`} />
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${svc?.badge || "bg-gray-100"}`}>
                    {svc?.label.split(" ")[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{svc?.label.split(" ").slice(1).join(" ") || "Booking"}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sts?.badge || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {sts?.label || selectedBooking.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-3">
                {[
                  { label: "Client", value: selectedBooking.client_name || selectedBooking.client_email },
                  { label: "Date", value: selectedBooking.scheduled_date },
                  { label: "Time", value: selectedBooking.scheduled_time },
                  { label: "Address", value: selectedBooking.address },
                  { label: "Price", value: `₦${(selectedBooking.price || 0).toLocaleString()}` },
                  { label: "Payment", value: selectedBooking.payment_status },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900 capitalize text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
                {selectedBooking.notes && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                    <span className="font-medium text-gray-700 block mb-1 text-xs">Notes</span>
                    {selectedBooking.notes}
                  </div>
                )}
              </div>
              <div className="px-6 pb-5 flex gap-2">
                <button
                  onClick={() => { setSelectedBooking(null); setMessagingBooking(selectedBooking); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Chat
                </button>
                {selectedBooking.status !== "cancelled" && selectedBooking.status !== "completed" && (
                  <button
                    onClick={() => handleCancel(selectedBooking)}
                    className="flex-1 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {messagingBooking && user && (
        <MessagingThread
          booking={messagingBooking}
          user={user}
          onClose={() => setMessagingBooking(null)}
        />
      )}
    </div>
  );
}