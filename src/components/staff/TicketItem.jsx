import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useState } from "react";
import { Tag, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format } from "date-fns";

const TICKET_STATUS = {
  open:        { badge: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-400",  label: "Open" },
  in_progress: { badge: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500",   label: "In Progress" },
  resolved:    { badge: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-500",  label: "Resolved" },
  closed:      { badge: "bg-gray-50 text-gray-600 border-gray-200",     dot: "bg-gray-400",   label: "Closed" },
};

const PRIORITY = {
  low:    { badge: "bg-gray-100 text-gray-600 border-gray-200",     label: "Low" },
  medium: { badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Medium" },
  high:   { badge: "bg-orange-50 text-orange-700 border-orange-200",label: "High" },
  urgent: { badge: "bg-red-50 text-red-600 border-red-200",         label: "🚨 Urgent" },
};

export default function TicketItem({ ticket, staffName, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const tsc = TICKET_STATUS[ticket.status] || TICKET_STATUS.open;
  const pCfg = PRIORITY[ticket.priority] || PRIORITY.medium;
  const isAssigned = ticket.assigned_to === staffName;

  const markInProgress = async () => {
    setSaving(true);
    const updated = await update(TABLES.tickets, ticket.id, { status: "in_progress" });
    onUpdated(updated);
    setSaving(false);
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const combined = ticket.internal_notes ? `${ticket.internal_notes}\n---\n${note}` : note;
    const updated = await update(TABLES.tickets, ticket.id, { internal_notes: combined });
    onUpdated(updated);
    setNote("");
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`h-1 ${tsc.dot}`} />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-sm truncate">{ticket.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{ticket.client_name || ticket.client_email}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${pCfg.badge}`}>{pCfg.label}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${tsc.badge}`}>{tsc.label}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-3">
          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{ticket.category?.replace(/_/g, " ")}</span>
          {ticket.sub_category && <span>{ticket.sub_category}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(ticket.created_date), "MMM d, h:mm a")}</span>
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs text-gray-500 font-medium py-1 hover:text-gray-700 transition-colors">
          <span>{expanded ? "Hide details" : "View details & respond"}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="pt-3 mt-2 border-t border-gray-100 space-y-4">
            {/* Description */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Issue</div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{ticket.description}</div>
            </div>

            {/* Existing internal notes */}
            {ticket.internal_notes && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Team Notes</div>
                <div className="text-sm text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl p-3 leading-relaxed whitespace-pre-line">
                  {ticket.internal_notes}
                </div>
              </div>
            )}

            {/* Admin response to client */}
            {ticket.admin_notes && (
              <div>
                <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">Response Sent to Client</div>
                <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl p-3 leading-relaxed">
                  {ticket.admin_notes}
                </div>
              </div>
            )}

            {/* Add internal note */}
            {isAssigned && ticket.status !== "resolved" && ticket.status !== "closed" && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Add Internal Note</div>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  rows={2} placeholder="Add a progress note for your team..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                <div className="flex gap-2 mt-2">
                  {ticket.status === "open" && (
                    <button onClick={markInProgress} disabled={saving}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 disabled:opacity-50 transition-colors">
                      Mark In Progress
                    </button>
                  )}
                  <button onClick={addNote} disabled={saving || !note.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save Note
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}