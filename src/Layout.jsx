import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe, signOut } from '@/lib/auth-helpers';
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, CalendarDays, Sparkles, Bell, Settings, User,
  Menu, X, LogOut, Shield, Ticket, ChevronRight, ChevronDown,
  CreditCard, ClipboardList, MessageSquare,
  Home, TrendingUp, Users, Package
} from "lucide-react";
import ReminderScheduler from "@/components/shared/ReminderScheduler";
import PushNotificationPrompt from "@/components/notifications/PushNotificationPrompt";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const clientNavGroups = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
      { label: "Book Service", icon: Sparkles, page: "BookService" },
      { label: "Conversations", icon: MessageSquare, page: "Conversations" },
      { label: "Calendar", icon: CalendarDays, page: "CalendarView" },
      { label: "My Schedule", icon: ClipboardList, page: "Schedules" },
    ],
  },
  {
    label: "TRANSACTIONS",
    items: [
      { label: "Payments & Billing", icon: CreditCard, page: "Payments" },
    ],
  },
  {
    label: "HELP",
    items: [
      { label: "Support Tickets", icon: Ticket, page: "Support" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { label: "My Profile", icon: User, page: "Profile" },
    ],
  },
];

const adminNavGroups = [
  {
    label: "ADMIN",
    items: [
      { label: "Admin Dashboard", icon: Shield, page: "AdminDashboard" },
      { label: "Conversations", icon: MessageSquare, page: "Conversations" },
      { label: "Analytics", icon: TrendingUp, page: "Analytics" },
      { label: "Services", icon: Sparkles, page: "ServiceManager" },
      { label: "Staff", icon: Users, page: "StaffManager" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Booked Services", icon: CalendarDays, page: "AdminBookings" },
      { label: "Raised Tickets", icon: Ticket, page: "AdminTickets" },
      { label: "All Payments", icon: CreditCard, page: "AdminPayments" },
      { label: "Clients Database", icon: Users, page: "AdminClients" },
      { label: "Field Operations",  icon: LayoutDashboard, page: "StaffPortal" },
      { label: "Inventory",        icon: Package,         page: "Inventory" },
      { label: "Year Planner",     icon: ClipboardList,   page: "YearPlanner" },
    ],
  },
];

function NavItem({ item, currentPageName, onNavigate, depth = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const active = currentPageName === item.page;
  const hasChildren = item.children && item.children.length > 0;
  const childActive = hasChildren && item.children.some(c => c.page === currentPageName);

  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive]);

  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
            ${childActive ? "bg-white/10 text-white" : "text-white/50 hover:text-white/90 hover:bg-white/5"}`}
          style={{ paddingLeft: depth > 0 ? `${depth * 16 + 12}px` : undefined }}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
            ${childActive ? "bg-indigo-500/30" : "group-hover:bg-white/10"}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="ml-3 mt-0.5 pl-3 border-l border-white/10 space-y-0.5 py-1">
            {item.children.map(child => (
              <NavItem key={child.page + child.label} item={child} currentPageName={currentPageName} onNavigate={onNavigate} depth={1} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
        ${active
          ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25"
          : "text-white/50 hover:text-white/90 hover:bg-white/5"}`}
      style={{ paddingLeft: depth > 0 ? `${depth * 8 + 12}px` : undefined }}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
      )}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 flex-shrink-0
        ${active ? "bg-white/20" : "group-hover:bg-white/10"}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="flex-1">{item.label}</span>
      {active && <div className="w-1 h-4 bg-white/60 rounded-full absolute right-3" />}
    </Link>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const notifRef = useRef(null);
  const { isSupported: pushSupported, permission: pushPermission } = usePushNotifications(user);

  // Hide sidebar on public pages and standalone staff portals (they have their own header)
  const publicPages = ["Landing", "Register", "StaffHR", "StaffAccount", "StaffOperations", "StaffManagerial", "SignIn", "StaffLogin"];
  const isPublicPage = publicPages.includes(currentPageName);

  useEffect(() => {
    getMe().then(u => {
      setUser(u);
      if (u) {
        filter(TABLES.notifications, { recipient_email: u.email, is_read: false })
          .then(setNotifications).catch(() => {});
      }
    }).catch(() => {});
  }, [currentPageName]);

  // Real-time notifications
  useEffect(() => {
    if (!user) return;
    const unsub = subscribe(TABLES.notifications, event => {
      if (event.type === "create" && event.data.recipient_email === user.email && !event.data.is_read) {
        setNotifications(p => [event.data, ...p]);
      }
    });
    return unsub;
  }, [user]);

  // Close notif on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.length;

  const handleLogout = () => signOut();

  const markAllRead = async () => {
    if (!user) return;
    await Promise.all(notifications.map(n => update(TABLES.notifications, n.id, { is_read: true })));
    setNotifications([]);
    setNotifOpen(false);
  };

  // Public pages render without sidebar
  if (isPublicPage) {
    return (
      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');`}</style>
        {children}
      </div>
    );
  }

  const allGroups = user?.role === "admin" ? adminNavGroups : clientNavGroups;

  const pageTitle = {
    Dashboard: "Dashboard",
    BookService: "Book a Service",
    CalendarView: "Service Calendar",
    Payments: "Payments & Billing",
    Support: "Support Center",
    Profile: "My Profile",
    AdminDashboard: "Admin Dashboard",
    Analytics: "Analytics",
    ServiceManager: "Service Manager",
    StaffManager: "Staff Manager",
    AdminBookings: "Booked Services",
    AdminTickets: "Raised Tickets",
    AdminPayments: "All Payments",
    AdminClients: "Clients Database",
    StaffPortal: "Field Operations",
    Inventory: "Inventory & Materials",
    Schedules: "My Schedule",
    YearPlanner: "Year Planner",
    Conversations: "Conversations",
  }[currentPageName] || currentPageName?.replace(/([A-Z])/g, ' $1').trim();

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        :root { --sidebar-w: 260px; }
        * { box-sizing: border-box; }
        @keyframes notifPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        .notif-pulse { animation: notifPulse 2s ease-in-out infinite; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slideDown { animation: slideDown 0.2s ease forwards; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col
        bg-[#111827] 
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full"}
        lg:translate-x-0 lg:static lg:flex
      `}
        style={{ width: 260 }}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-r-none">
          <div className="absolute top-0 right-0 w-48 h-48 opacity-10"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.6), transparent)" }} />
          <div className="absolute bottom-20 left-0 w-40 h-40 opacity-5"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.8), transparent)" }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M50 10 L90 45 L80 45 L80 88 L20 88 L20 45 L10 45 Z" fill="#7C3AED" stroke="#6D28D9" strokeWidth="2"/>
              <rect x="38" y="60" width="24" height="28" rx="2" fill="#8B5CF6"/>
              <rect x="38" y="38" width="24" height="18" rx="2" fill="#C4B5FD"/>
              <path d="M15 92 Q50 85 85 92" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
            <div>
              <div className="text-white font-black text-base leading-none tracking-tight">HomeX</div>
              <div className="text-white/30 text-[9px] mt-0.5 tracking-widest font-medium">HOME CARE TECH</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {allGroups.map(group => (
            <div key={group.label}>
              <div className="px-3 mb-2">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">{group.label}</span>
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavItem
                    key={item.page + item.label}
                    item={item}
                    currentPageName={currentPageName}
                    onNavigate={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        {user && (
          <div className="relative z-10 mx-3 mb-4 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate leading-none">{user.full_name || "User"}</div>
                <div className="text-white/35 text-xs mt-0.5 truncate">{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/70 transition-all"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100/80 h-16 flex items-center justify-between px-5 lg:px-8 shadow-sm shadow-black/[0.03]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-all"
            >
              {sidebarOpen ? <X className="w-4 h-4 text-gray-600" /> : <Menu className="w-4 h-4 text-gray-600" />}
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">{pageTitle}</h1>
              <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-all"
              >
                <Bell className="w-4 h-4 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="notif-pulse absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white leading-none px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="anim-slideDown absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <span className="font-bold text-gray-900 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">All caught up!</p>
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} className="px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{n.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            {user && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md cursor-pointer"
                title={user.full_name || user.email}>
                {user.full_name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </div>
        </header>

        {/* Reminder scheduler (runs silently) */}
        {user && <ReminderScheduler user={user} />}

        {/* Push notification prompt */}
        {user && pushSupported && <PushNotificationPrompt user={user} onPermissionChange={setPushEnabled} />}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}