import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { uploadFile } from '@/lib/integrations';
import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, X, Loader2, ImagePlus, Download, ZoomIn } from "lucide-react";
import { format } from "date-fns";

const SERVICE_LABELS = {
  cleaning: "Home Cleaning", fumigation: "Fumigation", lawn_care: "Lawn Care",
  pest_control: "Pest Control", deep_cleaning: "Deep Cleaning", pool_maintenance: "Pool Maintenance",
  mattress_vacuuming: "Mattress Vacuuming", chair_sofa_cleaning: "Chair & Sofa Cleaning",
  curtain_cleaning: "Curtain Cleaning", ac_servicing: "AC Servicing",
  gas_cooker: "Gas Cooker Servicing", generator: "Generator Servicing", repairs: "Routine Repairs",
};

function PhotoLightbox({ url, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      <img src={url} alt="Full size" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
      <a href={url} download target="_blank" rel="noopener noreferrer"
        className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
        onClick={e => e.stopPropagation()}>
        <Download className="w-4 h-4" /> Download
      </a>
    </div>
  );
}

function MessageBubble({ msg, isMe, onImageClick }) {
  const hasImage = !!msg.image_url;
  const hasText = !!msg.content;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isMe && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {msg.sender_name?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-xs text-gray-500 font-medium">{msg.sender_name}</span>
            <span className="text-[10px] text-gray-400 capitalize bg-gray-100 px-1.5 py-0.5 rounded-full">{msg.sender_role}</span>
          </div>
        )}

        <div className={`rounded-2xl shadow-sm overflow-hidden
          ${isMe ? "bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-br-sm" : "bg-white border border-gray-100 rounded-bl-sm"}`}>
          {hasImage && (
            <button onClick={() => onImageClick(msg.image_url)} className="relative block group">
              <img src={msg.image_url} alt="Shared photo" className="max-w-[240px] max-h-[180px] object-cover w-full" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          )}
          {hasText && (
            <div className={`px-4 py-2.5 text-sm leading-relaxed ${isMe ? "text-white" : "text-gray-800"} ${hasImage ? "border-t border-white/10" : ""}`}>
              {msg.content}
            </div>
          )}
        </div>

        <span className="text-[10px] text-gray-400 px-1">
          {msg.created_date ? format(new Date(msg.created_date), "h:mm a") : ""}
        </span>
      </div>
    </div>
  );
}

export default function MessagingThread({ booking, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    filter(TABLES.messages, { booking_id: booking.id }, "created_date", 100)
      .then(msgs => { setMessages(msgs); setLoading(false); })
      .catch(() => setLoading(false));

    // Mark incoming messages as read
    filter(TABLES.messages, { booking_id: booking.id, is_read: false })
      .then(unread => unread
        .filter(m => m.sender_email !== user.email)
        .forEach(m => update(TABLES.messages, m.id, { is_read: true }).catch(() => {}))
      ).catch(() => {});

    const unsub = subscribe(TABLES.messages, event => {
      if (event.data?.booking_id !== booking.id) return;
      if (event.type === "create") {
        setMessages(p => [...p, event.data]);
        if (event.data.sender_email !== user.email) {
          update(TABLES.messages, event.data.id, { is_read: true }).catch(() => {});
        }
      }
    });
    return unsub;
  }, [booking.id, user.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (imageUrl = null) => {
    const text = input.trim();
    if (!text && !imageUrl) return;
    setSending(true);
    setInput("");
    await create(TABLES.messages, {
      booking_id: booking.id,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      sender_role: user.role === "admin" ? "admin" : "client",
      content: text || null,
      image_url: imageUrl || null,
      is_read: false,
    });
    setSending(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await uploadFile({ file });
      await sendMessage(file_url);
    } catch (err) {
      console.error("Upload failed", err);
    }
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const svcLabel = SERVICE_LABELS[booking.service_type] || booking.service_type?.replace(/_/g, " ");

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden" style={{ height: "min(620px, 95vh)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">{svcLabel}</div>
                <div className="text-white/70 text-xs">
                  {booking.client_name} · {booking.scheduled_date}
                  {booking.assigned_team && ` · 👷 ${booking.assigned_team}`}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Context bar */}
          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-indigo-700 font-medium">📍 {booking.address}</span>
            {booking.scheduled_time && (
              <span className="text-xs text-indigo-500 ml-auto">⏰ {booking.scheduled_time}</span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-500 text-sm font-medium">No messages yet</p>
                <p className="text-gray-400 text-xs mt-1">Coordinate entry, share photos or discuss service details here</p>
              </div>
            ) : messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={msg.sender_email === user.email}
                onImageClick={setLightboxUrl}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            {/* Quick prompts */}
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-none">
              {["I'm on my way", "Please unlock the gate", "Job completed ✅", "Need access to roof"].map(t => (
                <button key={t} onClick={() => setInput(t)}
                  className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full whitespace-nowrap hover:bg-indigo-100 border border-indigo-100 transition-colors flex-shrink-0 font-medium">
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              {/* Photo upload */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-500 transition-colors flex-shrink-0"
                title="Send a photo"
              >
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              </button>

              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Message… (Enter to send)"
                rows={1}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none max-h-24 overflow-auto"
                style={{ minHeight: "42px" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center text-white transition-colors flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </>
  );
}