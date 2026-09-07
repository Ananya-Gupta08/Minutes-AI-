"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertCircle, FileAudio, X } from "lucide-react";
import type { Participant } from "@/lib/types";
import { initials, avatarBackground } from "@/lib/utils";

export function Avatars({ people }: { people: Participant[] }) {
  return (
    <span className="avatar-stack">
      {people.slice(0, 4).map((p) => (
        <span
          key={p.id}
          className="avatar"
          title={p.name}
          aria-label={p.name}
          style={{ backgroundColor: avatarBackground(p.avatar_color) }}
        >
          {initials(p.name)}
        </span>
      ))}
      {people.length > 4 && (
        <span className="avatar avatar-extra">+{people.length - 4}</span>
      )}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("[data-autofocus='true']")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function ConfirmDelete({
  title,
  description,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="modal-body">
        <div className="danger-icon">
          <AlertCircle size={26} />
        </div>
        <p>{description}</p>
      </div>
      <footer className="modal-footer">
        <button
          className="button"
          onClick={onClose}
          disabled={busy}
          data-autofocus="true"
        >
          Cancel
        </button>
        <button className="button danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
      </footer>
    </Modal>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <span className="empty-icon">
        <AlertCircle />
      </span>
      <h2>We couldn’t load this workspace</h2>
      <p>{message}</p>
      {retry && (
        <button className="button primary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <FileAudio />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" aria-label="Loading meetings" role="status">
      <div className="skeleton skeleton-title" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton skeleton-stat" />
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div className="skeleton skeleton-row" key={i} />
      ))}
    </div>
  );
}
