/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminBookings from './pages/AdminBookings';
import AdminClients from './pages/AdminClients';
import AdminDashboard from './pages/AdminDashboard';
import AdminPayments from './pages/AdminPayments';
import AdminTickets from './pages/AdminTickets';
import Analytics from './pages/Analytics';
import BookService from './pages/BookService';
import CalendarView from './pages/CalendarView';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Landing from './pages/Landing';
import Payments from './pages/Payments';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Schedules from './pages/Schedules';
import ServiceManager from './pages/ServiceManager';
import SignIn from './pages/SignIn';
import StaffAccount from './pages/StaffAccount';
import StaffHR from './pages/StaffHR';
import StaffManager from './pages/StaffManager';
import StaffManagerial from './pages/StaffManagerial';
import StaffOperations from './pages/StaffOperations';
import StaffPortal from './pages/StaffPortal';
import Support from './pages/Support';
import YearPlanner from './pages/YearPlanner';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminBookings": AdminBookings,
    "AdminClients": AdminClients,
    "AdminDashboard": AdminDashboard,
    "AdminPayments": AdminPayments,
    "AdminTickets": AdminTickets,
    "Analytics": Analytics,
    "BookService": BookService,
    "CalendarView": CalendarView,
    "Dashboard": Dashboard,
    "Inventory": Inventory,
    "Landing": Landing,
    "Payments": Payments,
    "Profile": Profile,
    "Register": Register,
    "Schedules": Schedules,
    "ServiceManager": ServiceManager,
    "SignIn": SignIn,
    "StaffAccount": StaffAccount,
    "StaffHR": StaffHR,
    "StaffManager": StaffManager,
    "StaffManagerial": StaffManagerial,
    "StaffOperations": StaffOperations,
    "StaffPortal": StaffPortal,
    "Support": Support,
    "YearPlanner": YearPlanner,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};