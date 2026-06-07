import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { uploadFile } from '@/lib/integrations';
import { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Plus, Send, ImagePlus, Loader2, X,
  Search, Clock, CheckCheck, ChevronRight, Users
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const SERVICE_LABELS = {
  cleaning: "Home Cleaning", fumigation: "Fumigation", lawn_care: "Lawn Care",
  pest_control: "Pest Control", deep_cleaning: "Deep Cleaning", pool_maintenance: "Pool Maintenance",
};

function getWATGreeting() {
  // Nigeria WAT = UTC+1
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24;
  if (watHour < 12) return "morning";
  if (watHour < 17) return "afternoon";
  return "evening";
}

function timeAgo(ts) {
  if (!ts) return "";
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ""; }
}

function NewConversationModal({ user, onCreated, onClose }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    const convo = await create(TABLES.conversations, {
      client_email: user.email,
      client_name: user.full_name || user.email,
      subject: subject.trim(),
      last_message: message.trim(),
      last_message_at: new Date().toISOString(),
      is_read_by_admin: false,
      is_read_by_client: true,
      status: "open",
    });
    await create(TABLES.conversation_messages, {
      conversation_id: convo.id,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      sender_role: "client",
      content: message.trim(),
      is_read: false,
    });
    setSaving(false);
    onCreated(convo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Start New Conversation</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} required
              placeholder="e.g. Entry access for cleaning, Query about my plan..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={3}
              placeholder="How can HomeX help you today?"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
          <button type="submit" disabled={saving || !subject.trim() || !message.trim()}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? "Sending..." : "Start Conversation"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConversationThread({ conversation, user, isAdmin, onBack, onUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    filter(TABLES.conversation_messages, { conversation_id: conversation.id }, "created_date", 200)
      .then(msgs => { setMessages(msgs); setLoading(false); })
      .catch(() => setLoading(false));

    // Mark as read
    const readField = isAdmin ? { is_read_by_admin: true } : { is_read_by_client: true };
    update(TABLES.conversations, conversation.id, readField).catch(() => {});

    const unsub = subscribe(TABLES.conversation_messages, ev => {
      if (ev.data?.conversation_id !== conversation.id) return;
      if (ev.type === "create") {
        setMessages(p => [...p, ev.data]);
        // Mark new incoming messages read
        if (ev.data.sender_email !== user.email) {
          update(TABLES.conversation_messages, ev.data.id, { is_read: true }).catch(() => {});
        }
      }
    });
    return unsub;
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async (imageUrl = null) => {
    const text = input.trim();
    if (!text && !imageUrl) return;
    setSending(true);
    setInput("");
    const role = isAdmin ? (user.role || "admin") : "client";
    await create(TABLES.conversation_messages, {
      conversation_id: conversation.id,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      sender_role: role,
      content: text || null,
      image_url: imageUrl || null,
      is_read: false,
    });
    // Update conversation preview
    await update(TABLES.conversations, conversation.id, {
      last_message: imageUrl ? "📷 Photo" : text,
      last_message_at: new Date().toISOString(),
      is_read_by_admin: isAdmin,
      is_read_by_client: !isAdmin,
    });
    onUpdate();
    setSending(false);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile({ file });
    await sendMsg(file_url);
    setUploading(false);
    e.target.value = "";
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-xl hover:bg-gray-100">
          <ChevronRight className="w-4 h-4 rotate-180 text-gray-500" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {isAdmin ? (conversation.client_name?.[0] || "?").toUpperCase() : "HX"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">
            {isAdmin ? conversation.client_name : "HomeX Support"}
          </div>
          <div className="text-xs text-gray-400 truncate">{conversation.subject}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conversation.status === "open" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
          {conversation.status}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-400 text-sm">No messages yet — start the conversation!</p>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender_email === user.email;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && (
                  <div className="flex items-center gap-1.5 px-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                      {msg.sender_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{msg.sender_name}</span>
                    <span className="text-[10px] capitalize bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">{msg.sender_role}</span>
                  </div>
                )}
                <div className={`rounded-2xl shadow-sm overflow-hidden ${isMe ? "bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-br-sm" : "bg-white border border-gray-100 rounded-bl-sm"}`}>
                  {msg.image_url && (
                    <button onClick={() => setLightbox(msg.image_url)} className="relative block group">
                      <img src={msg.image_url} alt="Shared" className="max-w-[220px] max-h-[160px] object-cover w-full" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  )}
                  {msg.content && (
                    <div className={`px-4 py-2.5 text-sm leading-relaxed ${isMe ? "text-white" : "text-gray-800"}`}>
                      {msg.content}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 px-1 flex items-center gap-1">
                  {msg.created_date ? format(new Date(msg.created_date), "h:mm a") : ""}
                  {isMe && <CheckCheck className="w-3 h-3 text-indigo-400" />}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
        {!isAdmin && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {["Can someone assist me?", "Please unlock the gate", "When will the technician arrive?"].map(t => (
              <button key={t} onClick={() => setInput(t)}
                className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full whitespace-nowrap hover:bg-indigo-100 border border-indigo-100 flex-shrink-0 font-medium">
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-500 flex-shrink-0">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </button>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Type a message…" rows={1}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none max-h-24"
            style={{ minHeight: "42px" }} />
          <button onClick={() => sendMsg()} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center text-white flex-shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="Full" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default function Conversations() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const isAdmin = user?.role && user.role !== "user";

  useEffect(() => {
    getMe().then(u => {
      setUser(u);
      const isAdm = u?.role && u.role !== "user";
      const query = isAdm ? {} : { client_email: u.email };
      filter(TABLES.conversations, query, "-last_message_at", 100)
        .then(setConversations)
        .catch(() => {})
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  // Real-time list updates
  useEffect(() => {
    const unsub = subscribe(TABLES.conversations, ev => {
      if (ev.type === "create") setConversations(p => [ev.data, ...p]);
      else if (ev.type === "update") setConversations(p => p.map(c => c.id === ev.id ? ev.data : c));
    });
    return unsub;
  }, []);

  const reload = () => {
    if (!user) return;
    const query = isAdmin ? {} : { client_email: user.email };
    filter(TABLES.conversations, query, "-last_message_at", 100).then(setConversations).catch(() => {});
  };

  const handleCreated = (convo) => {
    setConversations(p => [convo, ...p]);
    setShowNew(false);
    setSelected(convo);
  };

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase();
    return !q || c.subject?.toLowerCase().includes(q) || c.client_name?.toLowerCase().includes(q);
  });

  const unreadCount = (c) => {
    if (isAdmin) return !c.is_read_by_admin;
    return !c.is_read_by_client;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  // Lock feature for inactive/pending clients
  if (user?.role === "user" && user?.subscription_status !== "active") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-center p-8">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-purple-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Conversations Locked</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-sm leading-relaxed">
          {user?.subscription_status === "pending"
            ? "Your payment is pending verification. Conversations will unlock once your account is activated."
            : "An active HomeX subscription is required to access Conversations."}
        </p>
        {user?.subscription_status === "pending" ? (
          <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold">
            ⏳ Awaiting account activation
          </span>
        ) : (
          <a href="/Subscribe" className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all text-sm shadow-lg shadow-purple-200">
            <MessageSquare className="w-4 h-4" /> Subscribe to Unlock
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">

      {/* Sidebar — conversation list */}
      <div className={`w-full lg:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col ${selected ? "hidden lg:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Conversations</h2>
              <p className="text-xs text-gray-400">{filtered.length} thread{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            {!isAdmin && (
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Chat
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 px-6">
              <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm font-medium">No conversations yet</p>
              {!isAdmin && (
                <button onClick={() => setShowNew(true)}
                  className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">
                  Start a chat with HomeX →
                </button>
              )}
            </div>
          ) : filtered.map(c => {
            const hasUnread = unreadCount(c);
            const isSelected = selected?.id === c.id;
            return (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left px-5 py-4 border-b border-gray-50 transition-colors hover:bg-gray-50 ${isSelected ? "bg-indigo-50 border-indigo-100" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isAdmin ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-gradient-to-br from-purple-600 to-indigo-600"}`}>
                    {isAdmin ? (c.client_name?.[0] || "?").toUpperCase() : "HX"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${hasUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                        {isAdmin ? c.client_name : "HomeX Support"}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${hasUnread ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                      {c.subject}
                    </div>
                    {c.last_message && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">{c.last_message}</div>
                    )}
                  </div>
                  {hasUnread && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread panel */}
      <div className={`flex-1 flex flex-col ${selected ? "flex" : "hidden lg:flex"}`}>
        {selected ? (
          <ConversationThread
            key={selected.id}
            conversation={selected}
            user={user}
            isAdmin={isAdmin}
            onBack={() => setSelected(null)}
            onUpdate={reload}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">Select a conversation</h3>
            <p className="text-gray-400 text-sm">Choose a thread from the left to start chatting</p>
            {!isAdmin && (
              <button onClick={() => setShowNew(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> New Conversation
              </button>
            )}
          </div>
        )}
      </div>

      {showNew && user && (
        <NewConversationModal user={user} onCreated={handleCreated} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}