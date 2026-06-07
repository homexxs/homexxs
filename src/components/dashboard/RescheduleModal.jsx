import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isToday, isBefore, startOfDay } from "date-fns";

const timeSlots = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
];

export default function RescheduleModal({ booking, onClose, onConfirm, saving }) {
  const [calMonth, setCalMonth] = useState(new Date());
  const [date, setDate] = useState(null);
  const [time, setTime] = useState("");

  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const startDayOfWeek = startOfMonth(calMonth).getDay();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Reschedule Booking</h3>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{booking.service_type?.replace(/_/g, " ")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Calendar */}
          <div className="bg-gray-50 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
              <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-sm text-gray-900">{format(calMonth, "MMMM yyyy")}</span>
              <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {["S","M","T","W","T","F","S"].map((d, i) => (
                  <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array(startDayOfWeek).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                {days.map(day => {
                  const isPast = isBefore(day, today);
                  const isSelected = date && isSameDay(day, date);
                  return (
                    <button
                      key={day.toISOString()}
                      disabled={isPast}
                      onClick={() => setDate(day)}
                      className={`h-9 w-full rounded-lg text-xs font-semibold transition-all
                        ${isPast ? "text-gray-200 cursor-not-allowed" :
                          isSelected ? "bg-indigo-600 text-white shadow-md" :
                          isToday(day) ? "ring-2 ring-inset ring-indigo-300 text-indigo-600" :
                          "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"}`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>
            {date && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-indigo-50 text-sm font-semibold text-indigo-700 text-center">
                📅 {format(date, "EEEE, MMMM d, yyyy")}
              </div>
            )}
          </div>

          {/* Time slots */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Choose a Time</div>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map(t => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all
                    ${time === t ? "bg-indigo-600 text-white border-transparent shadow-md" : "border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(date, time)}
            disabled={saving || !date || !time}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}