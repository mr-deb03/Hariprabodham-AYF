import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";

// Code-split the secondary pages so the landing page ships less JS upfront.
const About = lazy(() => import("./pages/About"));
const Parampara = lazy(() => import("./pages/Parampara"));
const EventsPage = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Media = lazy(() => import("./pages/Media"));
const Smruti = lazy(() => import("./pages/Smruti"));
const Contact = lazy(() => import("./pages/Contact"));

// Karyakarta portal (Supabase auth) — kept in its own lazy bundle so the public
// site doesn't ship the auth/database client.
const RequireAuth = lazy(() => import("./portal/RequireAuth"));
const PortalLayout = lazy(() => import("./portal/PortalLayout"));
const PortalLogin = lazy(() => import("./pages/portal/Login"));
const PortalRegister = lazy(() => import("./pages/portal/Register"));
const PortalPending = lazy(() => import("./pages/portal/Pending"));
const PortalDashboard = lazy(() => import("./pages/portal/Dashboard"));
const PortalProfile = lazy(() => import("./pages/portal/Profile"));
const PortalAdminApprovals = lazy(() => import("./pages/portal/AdminApprovals"));
const PortalAdminMembers = lazy(() => import("./pages/portal/AdminMembers"));
const PortalAttendance = lazy(() => import("./pages/portal/Attendance"));
const PortalReport = lazy(() => import("./pages/portal/Report"));
const PortalVideos = lazy(() => import("./pages/portal/Videos"));

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/parampara" element={<Parampara />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<EventDetail />} />
          <Route path="/media" element={<Media />} />
          <Route path="/smruti" element={<Smruti />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        <Route path="/portal" element={<PortalLayout />}>
          {/* Public portal routes */}
          <Route path="login" element={<PortalLogin />} />
          <Route path="register" element={<PortalRegister />} />
          <Route path="pending" element={<PortalPending />} />

          {/* Protected routes */}
          <Route
            index
            element={
              <RequireAuth>
                <PortalDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="profile"
            element={
              <RequireAuth>
                <PortalProfile />
              </RequireAuth>
            }
          />
          <Route
            path="videos"
            element={
              <RequireAuth>
                <PortalVideos />
              </RequireAuth>
            }
          />
          <Route
            path="attendance"
            element={
              <RequireAuth attendance>
                <PortalAttendance />
              </RequireAuth>
            }
          />
          <Route
            path="report"
            element={
              <RequireAuth attendance>
                <PortalReport />
              </RequireAuth>
            }
          />
          <Route
            path="admin/approvals"
            element={
              <RequireAuth admin>
                <PortalAdminApprovals />
              </RequireAuth>
            }
          />
          <Route
            path="admin/members"
            element={
              <RequireAuth admin>
                <PortalAdminMembers />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
