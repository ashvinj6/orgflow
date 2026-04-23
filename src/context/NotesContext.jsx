import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const NotesContext = createContext();

export function NotesProvider({ children }) {
  const { activeOrgId, user } = useAuth();
  const [notes, setNotes] = useState([]);

  const loadNotes = useCallback(async () => {
    if (!activeOrgId) { setNotes([]); return; }
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  }, [activeOrgId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = async (note) => {
    const { data, error } = await supabase
      .from("notes")
      .insert({
        org_id: activeOrgId,
        author_id: user?.id || null,
        author_name: user?.name || "Unknown",
        title: note.title,
        content: note.content || null,
        category: note.category || null,
      })
      .select()
      .single();
    if (error) return null;
    setNotes((prev) => [data, ...prev]);
    return data;
  };

  const updateNote = async (id, updates) => {
    const { data } = await supabase
      .from("notes")
      .update({ title: updates.title, content: updates.content, category: updates.category })
      .eq("id", id)
      .select()
      .single();
    if (data) setNotes((prev) => prev.map((n) => (n.id === id ? data : n)));
  };

  const deleteNote = async (id) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotesContext.Provider value={{ notes, addNote, updateNote, deleteNote }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
