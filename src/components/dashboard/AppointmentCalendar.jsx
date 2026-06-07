import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useState, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, X, Clock, MapPin } from "lucide-react";

const SERVICE_COLORS = {
  cleaning:         { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200",   label: "Cleaning" },
  fumigation:       { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200", label: "Fumigation" },
  lawn_care:        { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200", label: "Lawn Care" },
  pest_control:     { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",       label: "Pest Control" },
  deep_cleaning:    { dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700 border-purple-200", label: "Deep Cleaning" },
  pool_maintenance: { dot: "bg-cyan-500",   badge: "bg-cyan-50 text-cyan-700 border-cyan-200",    label: "Pool Service" },
};

const STATUS_COLORS = {
  pending:     "bg-amber-400",
  confirmed:   "bg-indigo-500",
  in_progress: "bg-blue-500",
  completed:   "bg-green-500",
  rescheduled: "bg-yellow-400",
};

const timeSlots = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
];

export default function AppointmentCalendar({ bookings, onRescheduleSuccess }) {
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [dragging, setDragging] = useState(null); // { booking, originDate }
  const [dragOver, setDragOver] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null); // { booking, newDate }
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);
  const today = startOfDay(new Date());

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDow = startOfMonth(month).getDay();

  const getBookingsForDay = (day) =>
    bookings.filter(b =>
      b.scheduled_date && isSameDay(new Date(b.scheduled_date), day) &&
      !["cancelled", "completed"].includes(b.status)
    );

  const selectedBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  // ── Drag handlers ───────────────────────────────────────────────
  const handleDragStart = (e, booking) => {
    setDragging(booking);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    if (dragging && !isBefore(day, today)) {
      setDragOver(day);
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    if (!dragging || isBefore(day, today)) { setDragOver(null); return; }
    if (isSameDay(new Date(dragging.scheduled_date), day)) { setDragOver(null); setDragging(null); return; }
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    if (isWeekend) { setDragOver(null); setDragging(null); return; }
    setRescheduleModal({ booking: dragging, newDate: day });
    setNewTime(dragging.scheduled_time || "");
    setDragging(null);
    setDragOver(null);
  };

  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  // ── Confirm reschedule ──────────────────────────────────────────
  const confirmReschedule = async () => {
    if (!rescheduleModal || !newTime) return;
    setSaving(true);
    const dateStr = format(rescheduleModal.newDate, "yyyy-MM-dd");
    await update(TABLES.bookings, rescheduleModal.booking.id, {
      scheduled_date: dateStr,
      scheduled_time: newTime,
      status: "rescheduled",
    });
    await create(TABLES.notifications, {
      recipient_email: rescheduleModal.booking.client_email,
      title: "Booking Rescheduled",
      message: `Your ${rescheduleModal.booking.service_type?.replace(/_/g, " ")} has been moved to ${format(rescheduleModal.newDate, "MMM d, yyyy")} at ${newTime}.`,
      type: "booking_confirmed",
      related_id: rescheduleModal.booking.id,
    });
    setSaving(false);
    setRescheduleModal(null);
    setNewTime("");
    if (onRescheduleSuccess) onRescheduleSuccess();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="font-bold text-gray-900 text-sm">My Appointment Calendar</span>
          <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-semibold border border-purple-100">Drag to reschedule</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <span className="text-sm font-bold text-gray-900 w-32 text-center">{format(month, "MMMM yyyy")}</span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array(startDow).fill(null).map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dayBookings = getBookingsForDay(day);
            const isPast = isBefore(day, today);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isDragTarget = dragOver && isSameDay(day, dragOver);
            const canDrop = !isPast && !isWeekend;

            return (
              <div
                key={day.toISOString()}
                onDragOver={e => handleDragOver(e, day)}
                onDrop={e => handleDrop(e, day)}
                onDragLeave={() => setDragOver(null)}
                onClick={() => dayBookings.length > 0 && setSelectedDay(isSelected ? null : day)}
                className={`relative min-h-[52px] rounded-xl p-1 transition-all border
                  ${isDragTarget ? "border-purple-400 bg-purple-50 scale-105 shadow-md" : "border-transparent"}
                  ${isSelected ? "bg-indigo-50 border-indigo-200" : ""}
                  ${dayBookings.length > 0 ? "cursor-pointer hover:bg-gray-50" : ""}
                  ${canDrop && dragging ? "hover:border-purple-300 hover:bg-purple-25" : ""}`}
              >
                <div className={`text-[11px] font-semibold text-center mb-0.5 w-6 h-6 rounded-full flex items-center justify-center mx-auto
                  ${isToday(day) ? "bg-purple-600 text-white" : isPast ? "text-gray-300" : isWeekend ? "text-gray-300" : "text-gray-700"}`}>
                  {format(day, "d")}
                </div>
                {/* Booking dots */}
                <div className="flex flex-col gap-0.5">
                  {dayBookings.slice(0, 2).map(b => {
                    const svc = SERVICE_COLORS[b.service_type] || { dot: "bg-gray-400", label: b.service_type };
                    return (
                      <div
                        key={b.id}
                        draggable
                        onDragStart={e => handleDragStart(e, b)}
                        onDragEnd={handleDragEnd}
                        className={`${svc.dot} rounded-sm px-1 py-0.5 flex items-center gap-0.5 cursor-grab active:cursor-grabbing opacity-90 hover:opacity-100 transition-opacity`}
                        title={`${svc.label} · ${b.scheduled_time} — drag to reschedule`}
                      >
                        <span className="text-white text-[8px] font-semibold leading-none truncate hidden sm:block">
                          {svc.label?.slice(0, 6)}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0 sm:hidden`} />
                      </div>
                    );
                  })}
                  {dayBookings.length > 2 && (
                    <div className="text-[8px] text-gray-400 font-bold text-center">+{dayBookings.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-3">
          {Object.entries(SERVICE_COLORS).slice(0, 4).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${val.dot}`} />
              <span className="text-[10px] text-gray-500 font-medium">{val.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <RefreshCw className="w-2.5 h-2.5 text-purple-400" />
            <span className="text-[10px] text-purple-500 font-medium">Drag appointment to reschedule</span>
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && selectedBookings.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-2">
          <div className="text-xs font-bold text-gray-700 mb-2">{format(selectedDay, "EEEE, MMMM d")} — {selectedBookings.length} appointment{selectedBookings.length > 1 ? "s" : ""}</div>
          {selectedBookings.map(b => {
            const svc = SERVICE_COLORS[b.service_type] || { badge: "bg-gray-50 text-gray-700 border-gray-200", label: b.service_type };
            return (
              <div key={b.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[b.status] || "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-xs capitalize">{b.service_type?.replace(/_/g, " ")}</div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />{b.scheduled_time}
                    {b.address && <><MapPin className="w-2.5 h-2.5 ml-1" /><span className="truncate max-w-[100px]">{b.address}</span></>}
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold capitalize ${svc.badge}`}>
                  {b.status?.replace(/_/g, " ")}
                </span>
                <button
                  onClick={() => { setRescheduleModal({ booking: b, newDate: null }); setNewTime(b.scheduled_time || ""); }}
                  className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500 hover:text-purple-700 transition-colors"
                  title="Reschedule"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Confirm Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-white font-bold">Reschedule Appointment</div>
                <div className="text-white/60 text-xs mt-0.5 capitalize">
                  {rescheduleModal.booking.service_type?.replace(/_/g, " ")}
                  {rescheduleModal.newDate && ` → ${format(rescheduleModal.newDate, "MMM d, yyyy")}`}
                </div>
              </div>
              <button onClick={() => setRescheduleModal(null)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!rescheduleModal.newDate && (
                <div className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  💡 <strong>Tip:</strong> Drag the appointment on the calendar to a new date, or click the reschedule button and pick a date below.
                </div>
              )}
              {rescheduleModal.newDate && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-purple-700">
                  📅 New date: {format(rescheduleModal.newDate, "EEEE, MMMM d, yyyy")}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Choose a Time</label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(t => (
                    <button key={t} onClick={() => setNewTime(t)}
                      className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all
                        ${newTime === t ? "bg-purple-600 text-white border-transparent shadow-sm" : "border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setRescheduleModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={confirmReschedule}
                  disabled={saving || !newTime || !rescheduleModal.newDate}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><RefreshCw className="w-3.5 h-3.5" /> Confirm Reschedule</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}