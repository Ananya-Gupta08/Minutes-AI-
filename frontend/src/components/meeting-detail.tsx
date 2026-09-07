"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { MeetingDetail as MeetingData } from "@/lib/types";
import { dateLabel, timeLabel } from "@/lib/utils";
import { exportMeeting } from "@/lib/export";
import { useMeetingPlayer } from "@/hooks/use-meeting-player";
import {
  Avatars,
  ConfirmDelete,
  EmptyState,
  ErrorState,
  LoadingState,
} from "./ui";
import { MeetingForm } from "./meeting-form";
import { Player } from "./player";
import { Transcript } from "./transcript";
import { Insights } from "./insights";

export function MeetingDetailView({ id }: { id: string }) {
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .meeting(id, controller.signal)
      .then((m) => {
        setMeeting(m);
        setError("");
        setMissing(false);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(e));
          setMissing(e instanceof ApiError && e.status === 404);
        }
      });
    return () => controller.abort();
  }, [id, revision]);
  if (missing)
    return (
      <EmptyState
        title="Meeting not found"
        description="This meeting may have been deleted. Your other conversations are in the library."
      >
        <Link prefetch={false} className="button primary" href="/meetings">
          Back to meetings
        </Link>
      </EmptyState>
    );
  if (error)
    return (
      <ErrorState message={error} retry={() => setRevision((r) => r + 1)} />
    );
  if (!meeting) return <LoadingState />;
  return (
    <Workspace
      key={meeting.id}
      meeting={meeting}
      setMeeting={setMeeting}
      refresh={() => setRevision((r) => r + 1)}
    />
  );
}
function Workspace({
  meeting,
  setMeeting,
  refresh,
}: {
  meeting: MeetingData;
  setMeeting: (m: MeetingData) => void;
  refresh: () => void;
}) {
  const router = useRouter();
  const player = useMeetingPlayer(meeting.duration_seconds, meeting.segments);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(meeting.id);
      toast.success("Meeting deleted");
      router.push("/meetings");
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <div className="page detail-page">
      <Link prefetch={false} className="back-link" href="/meetings">
        <ArrowLeft size={16} />
        All meetings
      </Link>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">EVERY WORD. EVERY NEXT STEP.</div>
          <h1>{meeting.title}</h1>
          <div className="detail-meta">
            <span>
              <CalendarDays size={14} />
              {dateLabel(meeting.meeting_date)} at{" "}
              {timeLabel(meeting.meeting_date)}
            </span>
            <span>
              <Clock3 size={14} />
              {Math.round(meeting.duration_seconds / 60)} minutes
            </span>
            <Avatars people={meeting.participants} />
            <span title={meeting.participants.map((p) => p.name).join(", ")}>
              {meeting.participants.length} participants
            </span>
          </div>
          <div className="detail-tags">
            {meeting.topics.map((t) => (
              <span className="tag" key={t.id}>
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="detail-actions">
          <button className="button" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Edit
          </button>
          <details className="dropdown">
            <summary className="button">
              <Download size={15} />
              Export
              <ChevronDown size={13} />
            </summary>
            <div className="dropdown-panel">
              <button
                onClick={(e) => {
                  exportMeeting(meeting, "txt");
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                <FileText size={15} />
                Transcript (.txt)
              </button>
              <button
                onClick={(e) => {
                  exportMeeting(meeting, "md");
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                <FileText size={15} />
                Meeting notes (.md)
              </button>
            </div>
          </details>
          <details className="dropdown">
            <summary className="icon-button" aria-label="More meeting actions">
              <MoreHorizontal size={21} />
            </summary>
            <div className="dropdown-panel">
              <button
                className="danger-text"
                onClick={(e) => {
                  e.currentTarget.closest("details")?.removeAttribute("open");
                  setDeleting(true);
                }}
              >
                <Trash2 size={15} />
                Delete meeting
              </button>
            </div>
          </details>
        </div>
      </div>
      <Player player={player} duration={meeting.duration_seconds} />
      <div className="detail-grid">
        <Transcript
          segments={meeting.segments}
          activeId={player.activeId}
          playing={player.playing}
          seek={player.seek}
        />
        <Insights
          meeting={meeting}
          seek={player.seek}
          onActions={(items) => setMeeting({ ...meeting, action_items: items })}
        />
      </div>
      {editing && (
        <MeetingForm
          meeting={meeting}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refresh();
          }}
        />
      )}{" "}
      {deleting && (
        <ConfirmDelete
          title="Delete this meeting?"
          description={`“${meeting.title}” and all associated notes, transcript segments, and action items will be permanently removed.`}
          busy={busy}
          onClose={() => setDeleting(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
