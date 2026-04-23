// ── Card ──
export function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-card, #fff)",
        borderRadius: 12,
        border: "1px solid var(--border, #e2e8f0)",
        padding: 24,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {children}
    </div>
  );
}

// ── Stat Card ──
export function StatCard({ label, value, sublabel, color }) {
  return (
    <Card>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || "var(--text-primary, #0f172a)", marginTop: 4, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 13, color: "var(--text-muted, #64748b)", marginTop: 4 }}>{sublabel}</div>
      )}
    </Card>
  );
}

// ── Badge ──
export function Badge({ label, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: `${color}18`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}

// ── Search Input ──
export function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Search..."}
      style={{
        padding: "10px 16px",
        borderRadius: 8,
        border: "1px solid var(--border, #e2e8f0)",
        background: "var(--bg-card, #fff)",
        fontSize: 14,
        width: 280,
        outline: "none",
        color: "var(--text-primary, #0f172a)",
      }}
    />
  );
}

// ── Modal ──
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card, #fff)",
          borderRadius: 16,
          padding: 32,
          width: 480,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary, #0f172a)" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted, #94a3b8)", padding: "4px 8px" }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Button ──
export function Button({ children, onClick, variant = "primary", style: customStyle }) {
  const styles = {
    primary: { background: "#f97316", color: "#fff", border: "none" },
    secondary: { background: "transparent", color: "var(--text-primary, #0f172a)", border: "1px solid var(--border, #e2e8f0)" },
    danger: { background: "#ef4444", color: "#fff", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "opacity 0.15s ease",
        ...styles[variant],
        ...customStyle,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {children}
    </button>
  );
}

// ── Form Field ──
export function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted, #64748b)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Standard Input ──
export function Input({ value, onChange, type = "text", placeholder }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--border, #e2e8f0)",
        fontSize: 14,
        background: "var(--bg-primary, #f8fafc)",
        color: "var(--text-primary, #0f172a)",
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  );
}

// ── Select ──
export function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--border, #e2e8f0)",
        fontSize: 14,
        background: "var(--bg-primary, #f8fafc)",
        color: "var(--text-primary, #0f172a)",
        outline: "none",
        boxSizing: "border-box",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ── Textarea ──
export function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--border, #e2e8f0)",
        fontSize: 14,
        background: "var(--bg-primary, #f8fafc)",
        color: "var(--text-primary, #0f172a)",
        outline: "none",
        resize: "vertical",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    />
  );
}
