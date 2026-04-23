import { useState } from "react";
import { Users, Calendar, BarChart2, NotebookPen } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ORG_ROLES = [
  { value: "President", label: "President" },
  { value: "Vice President", label: "Vice President" },
  { value: "Treasurer", label: "Treasurer" },
  { value: "Secretary", label: "Secretary" },
  { value: "Events Director", label: "Events Director" },
  { value: "Marketing Director", label: "Marketing Director" },
  { value: "Other Officer", label: "Other Officer" },
];

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  background: "#f8fafc",
  color: "#0f172a",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.15s ease",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "#64748b",
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function StyledInput({ type = "text", placeholder, value, onChange, style: extra }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle, borderColor: focused ? "#f97316" : "#e2e8f0", ...extra }}
    />
  );
}

function StyledSelect({ value, onChange, options, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle, borderColor: focused ? "#f97316" : "#e2e8f0", cursor: "pointer" }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SubmitBtn({ children, disabled, loading }) {
  const off = disabled || loading;
  return (
    <button
      type="submit"
      disabled={off}
      style={{
        width: "100%", padding: "13px", borderRadius: 8, border: "none",
        background: off ? "#e2e8f0" : "#f97316",
        color: off ? "#94a3b8" : "#fff",
        fontSize: 15, fontWeight: 700,
        cursor: off ? "not-allowed" : "pointer",
        fontFamily: "inherit", marginTop: 4, transition: "opacity 0.15s ease",
      }}
      onMouseEnter={(e) => { if (!off) e.currentTarget.style.opacity = "0.88"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#dc2626",
        fontSize: 13,
        marginBottom: 14,
      }}
    >
      {msg}
    </div>
  );
}

function RoleCard({ icon, title, description, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        padding: "20px 16px",
        borderRadius: 12,
        border: `2px solid ${selected ? "#f97316" : "#e2e8f0"}`,
        background: selected ? "#fff7ed" : "#f8fafc",
        cursor: "pointer",
        transition: "all 0.15s ease",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{description}</div>
      {selected && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            fontWeight: 700,
            color: "#f97316",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          ✓ Selected
        </div>
      )}
    </div>
  );
}

// ── Sub-toggle: "Create" vs "Join" ──
function OrgSubToggle({ value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        background: "#f1f5f9",
        borderRadius: 8,
        padding: 3,
        marginBottom: 20,
      }}
    >
      {[
        { key: "create", label: "Create new org" },
        { key: "join", label: "Join with a code" },
      ].map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 6,
            border: "none",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: value === key ? "#fff" : "transparent",
            color: value === key ? "#0f172a" : "#94a3b8",
            boxShadow: value === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function AuthPage({ onBack }) {
  const { login, signup } = useAuth();

  const [mode, setMode] = useState("login");
  const [signupStep, setSignupStep] = useState(1);
  const [userType, setUserType] = useState("");
  const [orgSubMode, setOrgSubMode] = useState("create");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Org — create
  const [orgName, setOrgName] = useState("");
  const [orgRole, setOrgRole] = useState("");
  const [orgRoleOther, setOrgRoleOther] = useState("");
  const [orgFullName, setOrgFullName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPassword, setOrgPassword] = useState("");
  const [orgConfirm, setOrgConfirm] = useState("");

  // Org — join with code
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState("");
  const [joinRoleOther, setJoinRoleOther] = useState("");
  const [joinFullName, setJoinFullName] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinConfirm, setJoinConfirm] = useState("");

  // Member
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberConfirm, setMemberConfirm] = useState("");
  const [memberCode, setMemberCode] = useState("");

  function resetSignup() {
    setSignupStep(1);
    setUserType("");
    setOrgSubMode("create");
    setError("");
  }

  function switchMode(m) {
    setMode(m);
    setError("");
    resetSignup();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!loginEmail || !loginPassword) { setError("Please fill in all fields."); return; }
    setSubmitting(true);
    const result = await login(loginEmail, loginPassword);
    setSubmitting(false);
    if (!result.success) setError(result.error);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    let result;
    if (userType === "org") {
      if (orgSubMode === "create") {
        if (!orgName || !orgRole || !orgFullName || !orgEmail || !orgPassword || !orgConfirm) {
          setSubmitting(false); setError("Please fill in all fields."); return;
        }
        if (orgPassword !== orgConfirm) { setSubmitting(false); setError("Passwords do not match."); return; }
        if (orgPassword.length < 6) { setSubmitting(false); setError("Password must be at least 6 characters."); return; }
        const resolvedOrgRole = orgRole === "Other Officer" && orgRoleOther.trim() ? orgRoleOther.trim() : orgRole;
        result = await signup({ name: orgFullName, email: orgEmail, password: orgPassword, userType: "org", orgName, role: resolvedOrgRole });
      } else {
        if (!joinCode || !joinRole || !joinFullName || !joinEmail || !joinPassword || !joinConfirm) {
          setSubmitting(false); setError("Please fill in all fields."); return;
        }
        if (joinPassword !== joinConfirm) { setSubmitting(false); setError("Passwords do not match."); return; }
        if (joinPassword.length < 6) { setSubmitting(false); setError("Password must be at least 6 characters."); return; }
        const resolvedJoinRole = joinRole === "Other Officer" && joinRoleOther.trim() ? joinRoleOther.trim() : joinRole;
        result = await signup({ name: joinFullName, email: joinEmail, password: joinPassword, userType: "org", role: resolvedJoinRole, joinCode });
      }
    } else {
      if (!memberName || !memberEmail || !memberCode || !memberPassword || !memberConfirm) {
        setSubmitting(false); setError("Please fill in all fields."); return;
      }
      if (memberPassword !== memberConfirm) { setSubmitting(false); setError("Passwords do not match."); return; }
      if (memberPassword.length < 6) { setSubmitting(false); setError("Password must be at least 6 characters."); return; }
      result = await signup({ name: memberName, email: memberEmail, password: memberPassword, userType: "member", joinCode: memberCode });
    }

    setSubmitting(false);
    if (!result.success) setError(result.error);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Left branding panel ── */}
      <div
        style={{
          width: 420, minHeight: "100vh", background: "#0f172a",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "48px 40px", flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
            <img src="/orgflow_logo.png" alt="OrgFlow" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              OrgFlow
            </span>
          </div>
          <h1
            style={{
              fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1.2,
              letterSpacing: "-0.02em", marginBottom: 16,
            }}
          >
            Run your org<br />
            <span style={{ color: "#f97316" }}>without the chaos.</span>
          </h1>
          <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.7 }}>
            OrgFlow gives student organizations the tools to manage members, track
            attendance, plan events, and keep officers aligned, all in one place.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { icon: <Users size={16} />,      label: "Member directory & engagement tracking" },
            { icon: <Calendar size={16} />,   label: "Event planning & attendance logs" },
            { icon: <BarChart2 size={16} />,  label: "Insights & analytics for officers" },
            { icon: <NotebookPen size={16} />,label: "Officer notes & handoff docs" },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#f97316", display: "flex", alignItems: "center" }}>{icon}</span>
              <span style={{ fontSize: 13, color: "#cbd5e1" }}>{label}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "#475569" }}>© 2025 OrgFlow. Built for student orgs.</p>
      </div>

      {/* ── Right form panel ── */}
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px 32px", overflowY: "auto", position: "relative",
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            style={{
              position: "absolute", top: 20, right: 28,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: "#94a3b8",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
              transition: "color 0.15s ease", padding: "4px 8px", borderRadius: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            ← Back
          </button>
        )}
        <div style={{ width: "100%", maxWidth: 460 }}>

          {/* Tab switcher */}
          <div
            style={{
              display: "flex", background: "#f1f5f9", borderRadius: 10,
              padding: 4, marginBottom: 32,
            }}
          >
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 7, border: "none",
                  fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#0f172a" : "#94a3b8",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* ──── LOGIN ──── */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
                Log in to your OrgFlow account.
              </p>
              <Field label="Email">
                <StyledInput type="email" placeholder="you@university.edu" value={loginEmail} onChange={setLoginEmail} />
              </Field>
              <Field label="Password">
                <StyledInput type="password" placeholder="••••••••" value={loginPassword} onChange={setLoginPassword} />
              </Field>
              <ErrorBanner msg={error} />
              <SubmitBtn loading={submitting}>Log In</SubmitBtn>
              <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
                Don't have an account?{" "}
                <span onClick={() => switchMode("signup")} style={{ color: "#f97316", fontWeight: 600, cursor: "pointer" }}>
                  Sign up
                </span>
              </p>
            </form>
          )}

          {/* ──── SIGNUP ──── */}
          {mode === "signup" && (
            <>
              {/* Step 1 — pick role */}
              {signupStep === 1 && (
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>
                    Who are you?
                  </h2>
                  <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
                    Choose how you'll be using OrgFlow.
                  </p>
                  <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                    <RoleCard
                      icon="🏛️" title="Organization"
                      description="I'm an officer or exec board member setting up or managing a club."
                      selected={userType === "org"} onClick={() => setUserType("org")}
                    />
                    <RoleCard
                      icon="🎓" title="Member"
                      description="I'm joining a club and want to track my involvement and events."
                      selected={userType === "member"} onClick={() => setUserType("member")}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!userType) { setError("Please select your account type."); return; }
                      setError(""); setSignupStep(2);
                    }}
                    style={{
                      width: "100%", padding: "13px", borderRadius: 8, border: "none",
                      background: userType ? "#f97316" : "#e2e8f0",
                      color: userType ? "#fff" : "#94a3b8",
                      fontSize: 15, fontWeight: 700,
                      cursor: userType ? "pointer" : "not-allowed",
                      fontFamily: "inherit", transition: "all 0.15s ease",
                    }}
                  >
                    Continue →
                  </button>
                  <ErrorBanner msg={error} />
                  <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
                    Already have an account?{" "}
                    <span onClick={() => switchMode("login")} style={{ color: "#f97316", fontWeight: 600, cursor: "pointer" }}>
                      Log in
                    </span>
                  </p>
                </div>
              )}

              {/* Step 2 — fill form */}
              {signupStep === 2 && (
                <form onSubmit={handleSignup}>
                  {/* Back + heading */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <button
                      type="button" onClick={resetSignup}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, padding: 0, lineHeight: 1, fontFamily: "inherit" }}
                    >
                      ←
                    </button>
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", margin: 0 }}>
                      {userType === "org" ? "Set up your account" : "Create your member account"}
                    </h2>
                  </div>
                  <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20, marginLeft: 30 }}>
                    {userType === "org"
                      ? "Full dashboard access for officers and exec board members."
                      : "You'll be able to view your org's events and track your involvement."}
                  </p>

                  {/* ── ORG FORM ── */}
                  {userType === "org" && (
                    <>
                      <OrgSubToggle value={orgSubMode} onChange={(v) => { setOrgSubMode(v); setError(""); }} />

                      {orgSubMode === "create" && (
                        <>
                          <Field label="Organization Name">
                            <StyledInput placeholder="e.g. Computer Science Club" value={orgName} onChange={setOrgName} />
                          </Field>
                          <div style={{ display: "flex", gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <Field label="Your Full Name">
                                <StyledInput placeholder="Jane Doe" value={orgFullName} onChange={setOrgFullName} />
                              </Field>
                            </div>
                            <div style={{ flex: 1 }}>
                              <Field label="Your Role">
                                <StyledSelect value={orgRole} onChange={(v) => { setOrgRole(v); setOrgRoleOther(""); }} placeholder="Select role..." options={ORG_ROLES} />
                                {orgRole === "Other Officer" && (
                                  <StyledInput placeholder="Specify your role..." value={orgRoleOther} onChange={setOrgRoleOther} style={{ marginTop: 8 }} />
                                )}
                              </Field>
                            </div>
                          </div>
                          <Field label="Email">
                            <StyledInput type="email" placeholder="you@university.edu" value={orgEmail} onChange={setOrgEmail} />
                          </Field>
                          <Field label="Password">
                            <StyledInput type="password" placeholder="Min. 6 characters" value={orgPassword} onChange={setOrgPassword} />
                          </Field>
                          <Field label="Confirm Password">
                            <StyledInput type="password" placeholder="••••••••" value={orgConfirm} onChange={setOrgConfirm} />
                          </Field>
                        </>
                      )}

                      {orgSubMode === "join" && (
                        <>
                          {/* Join code field — visually distinct */}
                          <Field label="Exec Join Code">
                            <StyledInput
                              placeholder="e.g. ABC123"
                              value={joinCode}
                              onChange={(v) => setJoinCode(v.toUpperCase())}
                              style={{ letterSpacing: "0.15em", fontWeight: 700, fontSize: 16 }}
                            />
                          </Field>
                          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: -8, marginBottom: 14 }}>
                            Ask your org's president or current officer for this code.
                          </p>
                          <div style={{ display: "flex", gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <Field label="Your Full Name">
                                <StyledInput placeholder="Jane Doe" value={joinFullName} onChange={setJoinFullName} />
                              </Field>
                            </div>
                            <div style={{ flex: 1 }}>
                              <Field label="Your Role">
                                <StyledSelect value={joinRole} onChange={(v) => { setJoinRole(v); setJoinRoleOther(""); }} placeholder="Select role..." options={ORG_ROLES} />
                                {joinRole === "Other Officer" && (
                                  <StyledInput placeholder="Specify your role..." value={joinRoleOther} onChange={setJoinRoleOther} style={{ marginTop: 8 }} />
                                )}
                              </Field>
                            </div>
                          </div>
                          <Field label="Email">
                            <StyledInput type="email" placeholder="you@university.edu" value={joinEmail} onChange={setJoinEmail} />
                          </Field>
                          <Field label="Password">
                            <StyledInput type="password" placeholder="Min. 6 characters" value={joinPassword} onChange={setJoinPassword} />
                          </Field>
                          <Field label="Confirm Password">
                            <StyledInput type="password" placeholder="••••••••" value={joinConfirm} onChange={setJoinConfirm} />
                          </Field>
                        </>
                      )}
                    </>
                  )}

                  {/* ── MEMBER FORM ── */}
                  {userType === "member" && (
                    <>
                      <Field label="Member Join Code">
                        <StyledInput
                          placeholder="e.g. XYZ789"
                          value={memberCode}
                          onChange={(v) => setMemberCode(v.toUpperCase())}
                          style={{ letterSpacing: "0.15em", fontWeight: 700, fontSize: 16 }}
                        />
                      </Field>
                      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: -8, marginBottom: 14 }}>
                        Ask your organization's officers for the member join code.
                      </p>
                      <Field label="Full Name">
                        <StyledInput placeholder="Jane Doe" value={memberName} onChange={setMemberName} />
                      </Field>
                      <Field label="Email">
                        <StyledInput type="email" placeholder="you@university.edu" value={memberEmail} onChange={setMemberEmail} />
                      </Field>
                      <Field label="Password">
                        <StyledInput type="password" placeholder="Min. 6 characters" value={memberPassword} onChange={setMemberPassword} />
                      </Field>
                      <Field label="Confirm Password">
                        <StyledInput type="password" placeholder="••••••••" value={memberConfirm} onChange={setMemberConfirm} />
                      </Field>
                    </>
                  )}

                  <ErrorBanner msg={error} />
                  <SubmitBtn loading={submitting}>Create Account</SubmitBtn>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
