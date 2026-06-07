import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
/**
 * ReminderScheduler — checks upcoming bookings and fires in-app + email reminders
 * for appointments within the next 24 hours. Mount once in the Layout (for logged-in users).
 */
import { useEffect, useRef } from "react";
import { addHours, isBefore, isAfter, parseISO, format } from "date-fns";

const REMINDER_KEY = "homexp_reminded_ids";

function getRemindedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(REMINDER_KEY) || "[]")); }
  catch { return new Set(); }
}
function addRemindedId(id) {
  const ids = getRemindedIds();
  ids.add(id);
  localStorage.setItem(REMINDER_KEY, JSON.stringify([...ids]));
}

export default function ReminderScheduler({ user }) {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user || checkedRef.current) return;
    checkedRef.current = true;

    const check = async () => {
      const now = new Date();
      const in26h = addHours(now, 26);

      // Fetch upcoming confirmed/pending bookings
      const bookings = await filter(TABLES.bookings, 
        { client_email: user.email },
        "scheduled_date",
        50
      ).catch(() => []);

      const reminded = getRemindedIds();

      for (const b of bookings) {
        if (!b.scheduled_date || !b.scheduled_time) continue;
        if (b.status === "cancelled" || b.status === "completed") continue;
        // Skip if backend already sent the reminder (prevents duplicate in-app notifications)
        if (b.reminder_sent) continue;

        // Parse date+time
        const [h, mPart] = b.scheduled_time.split(":");
        const isPM = b.scheduled_time.toLowerCase().includes("pm");
        const hour = parseInt(h) + (isPM && parseInt(h) !== 12 ? 12 : 0);
        const min = parseInt((mPart || "0").replace(/[^0-9]/g, ""));
        const apptDate = parseISO(b.scheduled_date);
        apptDate.setHours(hour, min, 0, 0);

        // Within next 26h window and not yet locally reminded
        if (isAfter(apptDate, now) && isBefore(apptDate, in26h) && !reminded.has(b.id)) {
          // Email + in-app notification handled entirely by backend sendServiceReminders automation.
          // Frontend only tracks locally to avoid re-firing on the same session.
          addRemindedId(b.id);
        }
      }
    };

    check();
    // Re-check every 30 minutes
    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  return null;
}