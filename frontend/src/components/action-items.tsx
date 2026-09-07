"use client";
import { useState, type FormEvent } from "react";
import { CalendarDays, CheckCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { ActionInput, ActionItem } from "@/lib/types";
import { ConfirmDelete, Modal } from "./ui";

export function ActionItems({
  meetingId,
  items,
  people,
  onChange,
}: {
  meetingId: number;
  items: ActionItem[];
  people: string[];
  onChange: (items: ActionItem[]) => void;
}) {
  const [editing, setEditing] = useState<ActionItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<ActionItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState("");
  const done = items.filter((a) => a.completed).length;
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: ActionInput = {
      text: String(form.get("text")).trim(),
      assignee: String(form.get("assignee")).trim() || "Unassigned",
      due_date: String(form.get("due_date")) || null,
      completed:
        editing !== "new" && editing !== null ? editing.completed : false,
    };
    if (!data.text) {
      setError("Enter an action item.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result =
        editing === "new"
          ? await api.addAction(meetingId, data)
          : await api.updateAction((editing as ActionItem).id, data);
      onChange(
        editing === "new"
          ? [...items, result]
          : items.map((a) => (a.id === result.id ? result : a)),
      );
      setEditing(null);
      toast.success("Action item saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (item: ActionItem) => {
    setPending(item.id);
    onChange(
      items.map((a) =>
        a.id === item.id ? { ...a, completed: !item.completed } : a,
      ),
    );
    try {
      const updated = await api.updateAction(item.id, {
        completed: !item.completed,
      });
      onChange(items.map((a) => (a.id === item.id ? updated : a)));
      toast.success(
        updated.completed ? "Action item completed" : "Action item reopened",
      );
    } catch (err) {
      onChange(items);
      toast.error(errorMessage(err));
    } finally {
      setPending(null);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteAction(deleting.id);
      onChange(items.filter((a) => a.id !== deleting.id));
      setDeleting(null);
      toast.success("Action item deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="actions-tab">
      <div className="action-progress">
        <span>
          <CheckCheck size={17} />
          {done} of {items.length} completed
        </span>
        <strong>
          {items.length ? Math.round((done / items.length) * 100) : 0}%
        </strong>
        <progress
          value={done}
          max={items.length || 1}
          aria-label="Action completion progress"
        />
      </div>
      <p className="analysis-caption">
        Suggested from the transcript. Review owners and due dates.
      </p>
      {!items.length && (
        <div className="inline-empty">
          No follow-ups yet. Add one to keep the conversation moving.
        </div>
      )}
      {items.map((item) => (
        <article
          key={item.id}
          className={`action-card ${item.completed ? "completed" : ""}`}
        >
          <div className="action-main">
            <input
              type="checkbox"
              aria-label={`Complete: ${item.text}`}
              checked={item.completed}
              disabled={pending !== null || busy}
              onChange={() => void toggle(item)}
            />
            <span>{item.text}</span>
          </div>
          <div className="action-meta">
            <span className="assignee-dot" />
            {item.assignee}
            {item.due_date && (
              <span>
                <CalendarDays size={12} />
                {item.due_date}
              </span>
            )}
          </div>
          <div className="action-tools">
            <button
              className="icon-button small-icon"
              aria-label={`Edit action: ${item.text}`}
              disabled={pending !== null}
              onClick={() => {
                setError("");
                setEditing(item);
              }}
            >
              <Pencil size={14} />
            </button>
            <button
              className="icon-button small-icon"
              aria-label={`Delete action: ${item.text}`}
              disabled={pending !== null}
              onClick={() => setDeleting(item)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </article>
      ))}
      <button
        className="button add-action"
        disabled={pending !== null}
        onClick={() => {
          setError("");
          setEditing("new");
        }}
      >
        <Plus size={16} />
        Add action item
      </button>
      {editing && (
        <Modal
          title={editing === "new" ? "Add action item" : "Edit action item"}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form onSubmit={save}>
            <div className="form-body">
              <label>
                Action item
                <textarea
                  name="text"
                  aria-label="Action item text"
                  required
                  maxLength={2000}
                  data-autofocus="true"
                  rows={3}
                  defaultValue={editing === "new" ? "" : editing.text}
                />
              </label>
              <label>
                Assignee
                <input
                  name="assignee"
                  list="assignees"
                  maxLength={100}
                  defaultValue={editing === "new" ? "" : editing.assignee}
                  placeholder="Unassigned"
                />
                <datalist id="assignees">
                  {people.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </label>
              <label>
                Due date
                <input
                  name="due_date"
                  type="date"
                  defaultValue={editing === "new" ? "" : editing.due_date || ""}
                />
              </label>
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save action item"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDelete
          title="Delete action item?"
          description={`“${deleting.text}” will be permanently removed.`}
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
