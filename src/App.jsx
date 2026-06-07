import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { getMe } from '@/lib/auth-helpers';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import Layout from "./Layout";

// ── Page imports ──
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BookService from "./pages/BookService";
import CalendarView from "./pages/CalendarView";
import Payments from "./pages/Payments";
import Support from "./pages/Support";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import ServiceManager from "./pages/ServiceManager";
import StaffManager from "./pages/StaffManager";
import AdminBookings from "./pages/AdminBookings";
import AdminTickets from "./pages/AdminTickets";
import AdminPayments from "./pages/AdminPayments";
import AdminClients from "./pages/AdminClients";
import StaffPortal from "./pages/StaffPortal";
import Inventory from "./pages/Inventory";
import Schedules from "./pages/Schedules";
import YearPlanner from "./pages/YearPlanner";
import SignIn from "./pages/SignIn";
import StaffHR from "./pages/StaffHR";
import StaffAccount from "./pages/StaffAccount";
import StaffOperations from "./pages/StaffOperations";
import StaffManagerial from "./pages/StaffManagerial";
import AdminLogin from "./pages/AdminLogin";
import StaffLogin from "./pages/StaffLogin";
import Conversations from "./pages/Conversations";
import Subscribe from "./pages/Subscribe";

// ── Wrapper that passes currentPageName to Layout ──
const W = ({ page, children }) => (
  <Layout currentPageName={page}>{children}</Layout>
);

import { ROLE_HOME } from "@/lib/roles";

// ── Route guard: redirect if role doesn't match ──
function RoleGuard({ allow, redirectTo, children }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(u => { setRole(u?.role || "user"); })
      .catch(() => { setRole("user"); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  // allow can be a string or array of allowed roles
  const allowed = Array.isArray(allow) ? allow : [allow];

  // Special shorthand: "user" means only the client role
  if (allowed.includes("user") && !allowed.includes("admin")) {
    // Client-only route: non-clients get redirected to their home
    if (role && role !== "user") return <Navigate to={ROLE_HOME[role] || "/Landing"} replace />;
  }

  // Admin-only route
  if (allowed.includes("admin") && allowed.length === 1) {
    if (role !== "admin") return <Navigate to={redirectTo} replace />;
  }

  // Staff role-specific routes (admin always passes through)
  if (allowed.some(r => r.startsWith("staff_"))) {
    if (role !== "admin" && !allowed.includes(role)) return <Navigate to={redirectTo} replace />;
  }

  return children;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") return <UserNotRegisteredError />;
    if (authError.type === "auth_required") { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      {/* ── Public pages (no layout) ── */}
      <Route path="/Landing" element={<Landing />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/SignIn" element={<SignIn />} />
      <Route path="/AdminLogin" element={<AdminLogin />} />
      <Route path="/StaffLogin" element={<StaffLogin />} />
      <Route path="/Subscribe" element={<Subscribe />} />
      <Route path="/StaffHR" element={
        <RoleGuard allow={["admin","staff_hr"]} redirectTo="/Landing">
          <StaffHR />
        </RoleGuard>
      } />
      <Route path="/StaffAccount" element={
        <RoleGuard allow={["admin","staff_account"]} redirectTo="/Landing">
          <StaffAccount />
        </RoleGuard>
      } />
      <Route path="/StaffOperations" element={
        <RoleGuard allow={["admin","staff_operations"]} redirectTo="/Landing">
          <StaffOperations />
        </RoleGuard>
      } />
      <Route path="/StaffManagerial" element={
        <RoleGuard allow={["admin","staff_managerial"]} redirectTo="/Landing">
          <StaffManagerial />
        </RoleGuard>
      } />

      {/* ── Root redirect: public home is Landing; after login goes to Dashboard ── */}
      <Route path="/" element={<Navigate to="/Landing" replace />} />

      {/* ── Client-only routes ── */}
      <Route path="/Dashboard" element={
        <RoleGuard allow="user" redirectTo="/AdminDashboard">
          <W page="Dashboard"><Dashboard /></W>
        </RoleGuard>
      } />
      <Route path="/BookService" element={
        <RoleGuard allow="user" redirectTo="/AdminDashboard">
          <W page="BookService"><BookService /></W>
        </RoleGuard>
      } />
      <Route path="/CalendarView" element={
        <RoleGuard allow="user" redirectTo="/AdminDashboard">
          <W page="CalendarView"><CalendarView /></W>
        </RoleGuard>
      } />
      <Route path="/Payments" element={
        <RoleGuard allow="user" redirectTo="/AdminDashboard">
          <W page="Payments"><Payments /></W>
        </RoleGuard>
      } />
      <Route path="/Support" element={
        <RoleGuard allow="user" redirectTo="/AdminDashboard">
          <W page="Support"><Support /></W>
        </RoleGuard>
      } />
      <Route path="/Profile" element={
        <RoleGuard allow="user" redirectTo="/AdminDashboard">
          <W page="Profile"><Profile /></W>
        </RoleGuard>
      } />
      <Route path="/Schedules" element={
        <RoleGuard allow="user" redirectTo="/AdminDashboard">
          <W page="Schedules"><Schedules /></W>
        </RoleGuard>
      } />
      <Route path="/Conversations" element={
        <RoleGuard allow={["user","admin","staff_hr","staff_operations","staff_managerial"]} redirectTo="/Landing">
          <W page="Conversations"><Conversations /></W>
        </RoleGuard>
      } />

      {/* ── Admin-only routes ── */}
      <Route path="/AdminDashboard" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="AdminDashboard"><AdminDashboard /></W>
        </RoleGuard>
      } />
      <Route path="/Analytics" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="Analytics"><Analytics /></W>
        </RoleGuard>
      } />
      <Route path="/ServiceManager" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="ServiceManager"><ServiceManager /></W>
        </RoleGuard>
      } />
      <Route path="/StaffManager" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="StaffManager"><StaffManager /></W>
        </RoleGuard>
      } />
      <Route path="/AdminBookings" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="AdminBookings"><AdminBookings /></W>
        </RoleGuard>
      } />
      <Route path="/AdminTickets" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="AdminTickets"><AdminTickets /></W>
        </RoleGuard>
      } />
      <Route path="/AdminPayments" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="AdminPayments"><AdminPayments /></W>
        </RoleGuard>
      } />
      <Route path="/AdminClients" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="AdminClients"><AdminClients /></W>
        </RoleGuard>
      } />
      <Route path="/StaffPortal" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="StaffPortal"><StaffPortal /></W>
        </RoleGuard>
      } />
      <Route path="/Inventory" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="Inventory"><Inventory /></W>
        </RoleGuard>
      } />
      <Route path="/YearPlanner" element={
        <RoleGuard allow="admin" redirectTo="/Dashboard">
          <W page="YearPlanner"><YearPlanner /></W>
        </RoleGuard>
      } />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};



function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;