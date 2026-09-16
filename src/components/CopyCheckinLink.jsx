import { useState } from "react";
import { buildCheckinLink } from "../utils/checkinLink";

export default function CopyCheckinLink({ code, disabled = false }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  const link = buildCheckinLink(code);

  async function copy(event) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setFallback(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallback(true);
    }
  }

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, maxWidth: "100%" }}>
      <button type="button" onClick={copy} disabled={disabled} style={{
        padding: "8px 14px", borderRadius: 8, border: "1px solid #a5b4fc",
        background: copied ? "#f0fdf4" : "#eef2ff", color: copied ? "#16a34a" : "#4338ca",
        fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: disabled ? "default" : "pointer",
      }}>{copied ? "✓ Link copied" : "Copy Link"}</button>
      {fallback && <label style={{ fontSize: 12, color: "#64748b" }}>
        Copy this link:
        <input aria-label="Check-in link" readOnly value={link} onClick={(event) => { event.stopPropagation(); event.target.select(); }} style={{ width: "100%", boxSizing: "border-box" }} />
      </label>}
    </span>
  );
}
