// Shared color configs used across Calendar, Admin, and Booking pages

export const SERVICE_CONFIG = {
  cleaning:         { dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 border-blue-200",   bar: "border-l-blue-500",   label: "🧹 Cleaning" },
  fumigation:       { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200", bar: "border-l-orange-500", label: "🔬 Fumigation" },
  lawn_care:        { dot: "bg-green-500",  badge: "bg-green-100 text-green-700 border-green-200",  bar: "border-l-green-500",  label: "🌿 Lawn Care" },
  pest_control:     { dot: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200",        bar: "border-l-red-500",    label: "🐛 Pest Control" },
  deep_cleaning:    { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 border-purple-200", bar: "border-l-purple-500", label: "✨ Deep Cleaning" },
  pool_maintenance: { dot: "bg-cyan-500",   badge: "bg-cyan-100 text-cyan-700 border-cyan-200",     bar: "border-l-cyan-500",   label: "🏊 Pool Service" },
};

export const STATUS_CONFIG = {
  pending:     { dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-200",   ring: "ring-amber-200",  label: "Pending",     hex: "#F59E0B" },
  confirmed:   { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", ring: "ring-indigo-200", label: "Confirmed",   hex: "#6366F1" },
  in_progress: { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200",       ring: "ring-blue-200",   label: "In Progress", hex: "#3B82F6" },
  completed:   { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    ring: "ring-green-200",  label: "Completed",   hex: "#10B981" },
  cancelled:   { dot: "bg-red-400",    badge: "bg-red-50 text-red-600 border-red-200",           ring: "ring-red-200",    label: "Cancelled",   hex: "#EF4444" },
  rescheduled: { dot: "bg-yellow-400", badge: "bg-yellow-50 text-yellow-700 border-yellow-200", ring: "ring-yellow-200", label: "Rescheduled", hex: "#EAB308" },
};

export const TICKET_STATUS_CONFIG = {
  open:        { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-400",  label: "Open" },
  in_progress: { badge: "bg-blue-50 text-blue-700 border-blue-200",       dot: "bg-blue-500",   label: "In Progress" },
  resolved:    { badge: "bg-green-50 text-green-700 border-green-200",    dot: "bg-green-500",  label: "Resolved" },
  closed:      { badge: "bg-gray-50 text-gray-600 border-gray-200",       dot: "bg-gray-400",   label: "Closed" },
};