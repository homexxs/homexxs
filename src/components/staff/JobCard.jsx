import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { uploadFile } from '@/lib/integrations';
import { useState } from "react";
import {
  MapPin, Clock, LogIn, LogOut, Camera, CheckCircle2,
  Upload, X, Loader2, FileText, ChevronDown, ChevronUp, Package, MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import MaterialRequestForm from "@/components/staff/MaterialRequestForm";

const SERVICE_CONFIG = {
  cleaning:         { emoji: "🧹", label: "Home Cleaning",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  fumigation:       { emoji: "🔬", label: "Fumigation",     color: "bg-orange-100 text-orange-700 border-orange-200" },
  lawn_care:        { emoji: "🌿", label: "Lawn Care",      color: "bg-green-100 text-green-700 border-green-200" },
  pest_control:     { emoji: "🐛", label: "Pest Control",   color: "bg-red-100 text-red-700 border-red-200" },
  deep_cleaning:    { emoji: "✨", label: "Deep Cleaning",  color: "bg-purple-100 text-purple-700 border-purple-200" },
  pool_maintenance: { emoji: "🏊", label: "Pool Service",   color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

const STATUS_BAR = {
  pending:     "bg-amber-400",
  confirmed:   "bg-indigo-500",
  in_progress: "bg-blue-500",
  completed:   "bg-green-500",
  cancelled:   "bg-red-400",
  rescheduled: "bg-yellow-400",
};

export default function JobCard({ booking, onUpdated, staffName, staffEmail, onMessage }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(null);
  const [staffNotes, setStaffNotes] = useState(booking.staff_notes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);

  const svc = SERVICE_CONFIG[booking.service_type] || { emoji: "🏠", label: booking.service_type, color: "bg-gray-100 text-gray-600 border-gray-200" };
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const checkedIn = !!booking.checkin_time;
  const checkedOut = !!booking.checkout_time;
  const photos = booking.completion_photos || [];

  const handleCheckin = async () => {
    setSaving("checkin");
    const updated = await update(TABLES.bookings, booking.id, {
      checkin_time: new Date().toISOString(),
      status: "in_progress",
    });
    onUpdated(updated);
    setSaving(null);
  };

  const handleCheckout = async () => {
    setSaving("checkout");
    const updated = await update(TABLES.bookings, booking.id, {
      checkout_time: new Date().toISOString(),
      status: "completed",
    });
    await create(TABLES.notifications, {
      recipient_email: booking.client_email,
      title: "Service Completed ✅",
      message: `Your ${svc.label} has been completed. Thank you for choosing Home Xperts!`,
      type: "service_update",
      related_id: booking.id,
    }).catch(() => {});
    onUpdated(updated);
    setSaving(null);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploadedUrls = [];
    for (const file of files) {
      const { file_url } = await uploadFile({ file });
      uploadedUrls.push(file_url);
    }
    const updated = await update(TABLES.bookings, booking.id, {
      completion_photos: [...photos, ...uploadedUrls],
    });
    onUpdated(updated);
    setUploading(false);
  };

  const removePhoto = async (url) => {
    const updated = await update(TABLES.bookings, booking.id, {
      completion_photos: photos.filter(p => p !== url),
    });
    onUpdated(updated);
  };

  const saveNotes = async () => {
    setSaving("notes");
    const updated = await update(TABLES.bookings, booking.id, { staff_notes: staffNotes });
    onUpdated(updated);
    setEditingNotes(false);
    setSaving(null);
  };

  return (
    <>
      {showMaterialForm && (
        <MaterialRequestForm
          booking={booking}
          staffName={staffName}
          staffEmail={staffEmail}
          onClose={() => setShowMaterialForm(false)}
          onSubmitted={() => {}}
        />
      )}

      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${isCancelled ? "opacity-60" : ""}`}>
        <div className={`h-1.5 ${STATUS_BAR[booking.status] || "bg-gray-300"}`} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${svc.color}`}>
                {svc.emoji}
              </div>
              <div>
                <div className="font-bold text-gray-900">{svc.label}</div>
                <div className="text-sm font-medium text-gray-600 mt-0.5">{booking.client_name}</div>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${svc.color}`}>
              {booking.status?.replace(/_/g, " ")}
            </span>
          </div>

          {/* Date / Time / Address */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-semibold text-gray-800">
                {booking.scheduled_date ? format(new Date(booking.scheduled_date), "EEE, MMM d") : "—"}
              </span>
              <span className="text-gray-400">·</span>
              <span>{booking.scheduled_time}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{booking.address}</span>
            </div>
          </div>

          {/* Check-in / Check-out timestamps */}
          {(checkedIn || checkedOut) && (
            <div className="flex gap-3 mb-4">
              {checkedIn && (
                <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Checked In</div>
                  <div className="text-xs font-bold text-blue-800 mt-0.5">
                    {format(new Date(booking.checkin_time), "h:mm a")}
                  </div>
                </div>
              )}
              {checkedOut && (
                <div className="flex-1 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  <div className="text-[10px] font-semibold text-green-500 uppercase tracking-wide">Checked Out</div>
                  <div className="text-xs font-bold text-green-800 mt-0.5">
                    {format(new Date(booking.checkout_time), "h:mm a")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message client button */}
          {onMessage && !isCancelled && (
            <div className="mb-2">
              <button onClick={() => onMessage(booking)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-purple-200 text-purple-600 text-xs font-semibold rounded-xl hover:bg-purple-50 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" /> Message Client
              </button>
            </div>
          )}

          {/* Request Materials button */}
          {!isCancelled && !isCompleted && (
            <div className="mb-2">
              <button onClick={() => setShowMaterialForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-indigo-200 text-indigo-600 text-xs font-semibold rounded-xl hover:bg-indigo-50 transition-colors">
                <Package className="w-3.5 h-3.5" /> Request Materials
              </button>
            </div>
          )}

          {/* Action buttons */}
          {!isCancelled && (
            <div className="flex gap-2 mb-3">
              {!checkedIn && !isCompleted && (
                <button onClick={handleCheckin} disabled={saving === "checkin"}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving === "checkin" ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Check In
                </button>
              )}
              {checkedIn && !checkedOut && !isCompleted && (
                <button onClick={handleCheckout} disabled={saving === "checkout"}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {saving === "checkout" ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Check Out & Complete
                </button>
              )}
              {isCompleted && (
                <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 text-sm font-semibold rounded-xl border border-green-200">
                  <CheckCircle2 className="w-4 h-4" /> Job Completed
                </div>
              )}
              <button onClick={() => setExpanded(!expanded)}
                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:bg-gray-50 transition-colors flex-shrink-0">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Expandable: Photos + Notes */}
          {expanded && (
            <div className="space-y-4 pt-3 border-t border-gray-100">
              {/* Photo upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Completion Photos
                  </span>
                  {!isCancelled && (
                    <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors
                      ${uploading ? "bg-gray-100 text-gray-400" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}>
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {uploading ? "Uploading..." : "Add Photos"}
                      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                    </label>
                  )}
                </div>
                {photos.length === 0 ? (
                  <div className="text-xs text-gray-400 bg-gray-50 rounded-xl py-5 text-center border border-dashed border-gray-200">
                    No photos uploaded yet
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((url, i) => (
                      <div key={i} className="relative group aspect-square">
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-xl border border-gray-100" />
                        {!isCancelled && (
                          <button onClick={() => removePhoto(url)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Staff notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Job Notes
                  </span>
                  {!editingNotes && !isCancelled && (
                    <button onClick={() => setEditingNotes(true)}
                      className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">
                      {staffNotes ? "Edit" : "+ Add"}
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea value={staffNotes} onChange={e => setStaffNotes(e.target.value)}
                      rows={3} placeholder="Add notes about this job..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingNotes(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                      <button onClick={saveNotes} disabled={saving === "notes"}
                        className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                        {saving === "notes" && <Loader2 className="w-3 h-3 animate-spin" />} Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`text-sm rounded-xl px-3 py-2.5 leading-relaxed ${staffNotes ? "bg-amber-50 text-amber-900 border border-amber-100" : "text-gray-400 bg-gray-50 border border-dashed border-gray-200"}`}>
                    {staffNotes || "No notes added"}
                  </div>
                )}
              </div>

              {/* Client notes */}
              {booking.notes && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Client Instructions</div>
                  <div className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 leading-relaxed">
                    {booking.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}