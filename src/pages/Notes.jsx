import { useState } from "react";
import { useNotes } from "../context/NotesContext";
import { Card, Button, Modal, FormField, Input, Select, Textarea, Badge } from "../components/UI";

const CATEGORIES = ["Handoff", "Event Learning", "Reminder", "General"];

export default function Notes() {
  const { notes, addNote, deleteNote } = useNotes();
  const [showAdd, setShowAdd] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [expandedNote, setExpandedNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: "", author: "", category: "General", content: "" });

  const categoryColors = { Handoff: "#ef4444", "Event Learning": "#06b6d4", Reminder: "#f59e0b", General: "#6b7280" };

  const filtered = filterCategory === "All" ? notes : notes.filter((n) => n.category === filterCategory);

  const handleAdd = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;
    addNote(newNote);
    setNewNote({ title: "", author: "", category: "General", content: "" });
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text-primary, #0f172a)", letterSpacing: "-0.02em" }}>Notes</h1>
          <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14 }}>Officer notes, learnings & handoff hub</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Note</Button>
      </div>

      {/* Category Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: "1px solid var(--border, #e2e8f0)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: filterCategory === cat ? (cat === "All" ? "#f97316" : categoryColors[cat]) : "var(--bg-card, #fff)",
              color: filterCategory === cat ? "#fff" : "var(--text-muted, #64748b)",
              transition: "all 0.15s ease",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {filtered.map((n) => (
          <Card
            key={n.id}
            onClick={() => setExpandedNote(expandedNote === n.id ? null : n.id)}
            style={{ cursor: "pointer" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <Badge label={n.category} color={categoryColors[n.category] || "#6b7280"} />
              <button
                onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}
                title="Delete"
              >
                ✕
              </button>
            </div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>{n.title}</h3>
            <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)", marginBottom: 12 }}>
              {n.author} · {new Date(n.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--text-primary, #334155)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                maxHeight: expandedNote === n.id ? "none" : 80,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {n.content}
              {expandedNote !== n.id && n.content.length > 150 && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 40,
                  background: "linear-gradient(transparent, var(--bg-card, #fff))",
                }} />
              )}
            </div>
            {n.content.length > 150 && (
              <div style={{ fontSize: 12, color: "#f97316", fontWeight: 600, marginTop: 8 }}>
                {expandedNote === n.id ? "Show less" : "Read more"}
              </div>
            )}
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card style={{ textAlign: "center", color: "var(--text-muted, #94a3b8)", padding: 48 }}>
          No notes {filterCategory !== "All" ? `in ${filterCategory}` : "yet"}. Add one!
        </Card>
      )}

      {/* Add Note Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Note">
        <FormField label="Title"><Input value={newNote.title} onChange={(v) => setNewNote({ ...newNote, title: v })} placeholder="Officer Transition Notes" /></FormField>
        <FormField label="Author"><Input value={newNote.author} onChange={(v) => setNewNote({ ...newNote, author: v })} placeholder="Your name" /></FormField>
        <FormField label="Category"><Select value={newNote.category} onChange={(v) => setNewNote({ ...newNote, category: v })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} /></FormField>
        <FormField label="Content"><Textarea value={newNote.content} onChange={(v) => setNewNote({ ...newNote, content: v })} placeholder="Write your note here..." rows={6} /></FormField>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Save Note</Button>
        </div>
      </Modal>
    </div>
  );
}
