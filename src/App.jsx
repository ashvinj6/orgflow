import { useState } from "react";
import { BarChart2, Users, Calendar, Clock, CheckSquare, Lightbulb, NotebookPen, Settings } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Events from "./pages/Events";
import Attendance from "./pages/Attendance";
import Requirements from "./pages/Requirements";
import Insights from "./pages/Insights";
import Notes from "./pages/Notes";
import OrgSettings from "./pages/OrgSettings";
import AuthPage from "./pages/AuthPage";
import MemberView from "./pages/MemberView";
import LandingPage from "./pages/LandingPage";
import Sidebar from "./components/Sidebar";
import { MembersProvider } from "./context/MembersContext";
import { EventsProvider } from "./context/EventsContext";
import { NotesProvider } from "./context/NotesContext";
import { RequirementsProvider } from "./context/RequirementsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

const PAGES = {
  dashboard:    { label: "Dashboard",    icon: <BarChart2   size={18} />, component: Dashboard },
  members:      { label: "Members",      icon: <Users       size={18} />, component: Members },
  events:       { label: "Events",       icon: <Calendar    size={18} />, component: Events },
  attendance:   { label: "Attendance",   icon: <Clock       size={18} />, component: Attendance },
  requirements: { label: "Requirements", icon: <CheckSquare size={18} />, component: Requirements },
  insights:     { label: "Insights",     icon: <Lightbulb   size={18} />, component: Insights },
  notes:        { label: "Notes",        icon: <NotebookPen size={18} />, component: Notes },
  settings:     { label: "Org Settings", icon: <Settings    size={18} />, component: OrgSettings },
};

const ORG_ROLES = [
  { value: "President",         label: "President" },
  { value: "Vice President",    label: "Vice President" },
  { value: "Treasurer",         label: "Treasurer" },
  { value: "Secretary",         label: "Secretary" },
  { value: "Events Director",   label: "Events Director" },
  { value: "Marketing Director",label: "Marketing Director" },
  { value: "Other Officer",     label: "Other Officer" },
];

// ── Shared overlay backdrop ──
function Backdrop({ children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </div>
  );
}

// ── Inline copy button helper ──
function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handle}
      style={{
        width: "100%",
        padding: "10px",
        borderRadius: 8,
        border: "1.5px solid #e2e8f0",
        background: copied ? "#f0fdf4" : "#f8fafc",
        color: copied ? "#16a34a" : "#0f172a",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        marginBottom: 8,
        transition: "all 0.15s ease",
      }}
    >
      {copied ? `✓ ${label} Copied!` : `Copy ${label}`}
    </button>
  );
}

// ── Join Code Reveal Modal ──
// Shown automatically right after a user creates a brand-new org; displays both codes
function JoinCodeRevealModal({ codes, onDismiss }) {
  const { execCode, memberCode, orgName } = codes;

  return (
    <Backdrop>
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "40px 36px",
          width: 480,
          maxWidth: "94vw",
          boxShadow: "0 32px 80px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: 16, background: "#fff7ed",
            border: "2px solid #f97316", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26, margin: "0 auto 20px",
          }}
        >
          🎉
        </div>

        <h2
          style={{
            fontSize: 22, fontWeight: 800, color: "#0f172a",
            letterSpacing: "-0.02em", marginBottom: 6,
          }}
        >
          {orgName} is ready!
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28, lineHeight: 1.6 }}>
          Save these two join codes. Share the exec code with officers and the member code
          with your general members.
        </p>

        {/* Two code boxes */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, textAlign: "left" }}>
          {[
            { label: "Exec Join Code", code: execCode, color: "#f97316" },
            { label: "Member Join Code", code: memberCode, color: "#6366f1" },
          ].map(({ label, code, color }) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: "#f8fafc",
                border: `2px dashed ${color}40`,
                borderRadius: 10,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 10, fontWeight: 700, color, textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 6,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 22, fontWeight: 800, color: "#0f172a",
                  letterSpacing: "0.2em", fontFamily: "monospace",
                }}
              >
                {code}
              </div>
            </div>
          ))}
        </div>

        <CopyButton value={execCode} label="Exec Code" />
        <CopyButton value={memberCode} label="Member Code" />

        <button
          onClick={onDismiss}
          style={{
            width: "100%", padding: "12px", borderRadius: 8, border: "none",
            background: "#f97316", color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", marginTop: 4,
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Go to Dashboard →
        </button>

        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 14, lineHeight: 1.5 }}>
          Find these codes anytime under <strong>Org Settings</strong> in the sidebar.
        </p>
      </div>
    </Backdrop>
  );
}

// ── Add Organization Modal ──
function AddOrgModal({ onClose }) {
  const { joinOrg } = useAuth();
  const [code, setCode] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!code || !role) { setError("Please enter the join code and select your role."); return; }
    const result = joinOrg(code, role);
    if (!result.success) { setError(result.error); return; }
    onClose();
  }

  return (
    <Backdrop>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 18, padding: "36px 32px",
          width: 420, maxWidth: "92vw",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
              Add Organization
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 0 }}>
              Enter an exec join code to access another org's dashboard.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, padding: "2px 6px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Exec Join Code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 8,
                border: `1.5px solid ${focused ? "#f97316" : "#e2e8f0"}`,
                fontSize: 18, fontWeight: 700, letterSpacing: "0.18em",
                background: "#f8fafc", color: "#0f172a", outline: "none",
                boxSizing: "border-box", fontFamily: "monospace",
                transition: "border-color 0.15s ease",
              }}
            />
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 5, marginBottom: 0 }}>
              Ask the organization's president or current officer for this code.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Your Role in This Org
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", fontSize: 14,
                background: "#f8fafc", color: role ? "#0f172a" : "#94a3b8",
                outline: "none", boxSizing: "border-box",
                fontFamily: "inherit", cursor: "pointer",
              }}
            >
              <option value="">Select your role...</option>
              {ORG_ROLES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px", borderRadius: 8, background: "#fef2f2",
                border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: "11px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                background: "transparent", color: "#64748b", fontSize: 14,
                fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2, padding: "11px", borderRadius: 8, border: "none",
                background: "#f97316", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Join Organization
            </button>
          </div>
        </form>
      </div>
    </Backdrop>
  );
}

// ── Org Dashboard (exec view) ──
function OrgDashboard() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const {
    user, activeOrg, newOrgCodes,
    switchOrg, getOrgJoinCode, clearNewOrgCodes, logout,
  } = useAuth();
  const PageComponent = PAGES[currentPage].component;

  return (
    <MembersProvider>
      <NotesProvider>
          <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
            <Sidebar
              pages={PAGES}
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              open={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              onLogout={logout}
              user={user}
              activeOrg={activeOrg}
              onSwitchOrg={switchOrg}
              onAddOrg={() => setShowAddOrgModal(true)}
              getOrgJoinCode={getOrgJoinCode}
            />
            <main
              style={{
                flex: 1,
                marginLeft: sidebarOpen ? 240 : 64,
                transition: "margin-left 0.3s ease",
                padding: "32px 40px",
                maxWidth: 1200,
              }}
            >
              <PageComponent onNavigate={setCurrentPage} />
            </main>
          </div>

          {/* Both-code reveal shown once right after creating a new org */}
          {newOrgCodes && (
            <JoinCodeRevealModal codes={newOrgCodes} onDismiss={clearNewOrgCodes} />
          )}

          {showAddOrgModal && (
            <AddOrgModal onClose={() => setShowAddOrgModal(false)} />
          )}
        </NotesProvider>
    </MembersProvider>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();
  const [showLanding, setShowLanding] = useState(true);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <img src="/orgflow_logo.png" alt="OrgFlow" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", margin: "0 auto 16px", display: "block" }} />
          <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 600 }}>Loading OrgFlow…</div>
        </div>
      </div>
    );
  }
  if (!user && showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  if (!user) return <AuthPage onBack={() => setShowLanding(true)} />;
  if (user.userType === "member") return <MemberView />;
  return <OrgDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <EventsProvider>
        <RequirementsProvider>
          <AppRouter />
        </RequirementsProvider>
      </EventsProvider>
    </AuthProvider>
  );
}
