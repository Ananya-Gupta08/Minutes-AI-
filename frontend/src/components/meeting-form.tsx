"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { Meeting, MeetingCreate, MeetingInput } from "@/lib/types";
import { toLocalInput } from "@/lib/utils";
import { Modal } from "./ui";

export function MeetingForm({
  meeting,
  onClose,
  onSaved,
}: {
  meeting?: Meeting;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [raw, setRaw] = useState("");
  const [format, setFormat] =
    useState<MeetingCreate["transcript_format"]>("txt");
  const [method, setMethod] = useState<"paste" | "upload">("paste");
  const [filename, setFilename] = useState("");
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const readFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setFilename("");
    setRaw("");
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "vtt", "json"].includes(extension || "")) {
      setError("Choose a .txt, .vtt, or .json transcript.");
      return;
    }
    if (file.size > 1_000_000) {
      setError("Your file must be smaller than 1 MB.");
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      if (!text.trim()) {
        setError("This file is empty. Choose a transcript with some text.");
        return;
      }
      setRaw(text);
      setFormat(extension as MeetingCreate["transcript_format"]);
      setFilename(file.name);
    } catch {
      setError("This file could not be read. Please choose it again.");
    } finally {
      setReading(false);
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const values = new FormData(event.currentTarget);
    const split = (key: string) => [
      ...new Set(
        String(values.get(key) || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    const title = String(values.get("title") || "").trim();
    if (!title) {
      setError("Enter a meeting title.");
      return;
    }
    const date = new Date(String(values.get("meeting_date")));
    if (Number.isNaN(date.getTime())) {
      setError("Choose a valid meeting date and time.");
      return;
    }
    const data: MeetingInput = {
      title,
      meeting_date: date.toISOString(),
      duration_seconds: Math.round(Number(values.get("duration")) * 60),
      participants: split("participants"),
      tags: split("tags"),
    };
    if (!meeting && raw.trim().length < 3) {
      setError("Add a transcript with at least three characters.");
      return;
    }
    setBusy(true);
    try {
      if (meeting) {
        await api.update(meeting.id, data);
        toast.success("Meeting updated");
        onSaved?.();
      } else {
        const result = await api.create({
          ...data,
          raw_transcript: raw,
          transcript_format: format,
        });
        toast.success("Meeting added. Your notes are ready.");
        router.push(`/meetings/${result.id}`);
      }
    } catch (e) {
      setError(errorMessage(e));
      toast.error("Could not save meeting");
    } finally {
      setBusy(false);
    }
  };
  const form = (
    <form onSubmit={submit}>
      <div className="form-body">
        <label>
          <span>
            Meeting title <span className="required">*</span>
          </span>
          <input
            data-autofocus={meeting ? "true" : undefined}
            name="title"
            required
            maxLength={200}
            placeholder="e.g. Product roadmap planning"
            defaultValue={meeting?.title}
          />
        </label>
        <div className="form-grid">
          <label>
            <span>
              Date &amp; time <span className="required">*</span>
            </span>
            <input
              name="meeting_date"
              type="datetime-local"
              required
              defaultValue={toLocalInput(
                meeting?.meeting_date || new Date().toISOString(),
              )}
            />
          </label>
          <label>
            <span>
              Duration (minutes) <span className="required">*</span>
            </span>
            <input
              name="duration"
              type="number"
              min={1 / 60}
              max="1440"
              step="any"
              required
              defaultValue={meeting ? meeting.duration_seconds / 60 : 30}
            />
          </label>
        </div>
        <label>
          Participants
          <input
            name="participants"
            aria-label="Participants"
            aria-describedby="participants-help"
            maxLength={5000}
            placeholder="Ananya Gupta, Alex Morgan, Sarah Chen"
            defaultValue={meeting?.participants.map((p) => p.name).join(", ")}
          />
          <small id="participants-help">
            Separate names with commas. Transcript speakers are added
            automatically on creation.
          </small>
        </label>
        <label>
          Topics
          <input
            name="tags"
            aria-label="Topics"
            aria-describedby="topics-help"
            maxLength={1200}
            placeholder="Product, Planning, Strategy"
            defaultValue={meeting?.topics.map((t) => t.name).join(", ")}
          />
          <small id="topics-help">Optional. Separate topics with commas.</small>
        </label>
        {!meeting && (
          <>
            <div className="form-divider" />
            <div className="transcript-form-heading">
              <h2>Add your conversation</h2>
              <span className="subtle-label">Text transcripts only</span>
            </div>
            <div className="method-tabs">
              <button
                type="button"
                className={method === "paste" ? "selected" : ""}
                onClick={() => setMethod("paste")}
              >
                <FileText size={17} />
                Paste transcript
              </button>
              <button
                type="button"
                className={method === "upload" ? "selected" : ""}
                onClick={() => setMethod("upload")}
              >
                <Upload size={17} />
                Upload a file
              </button>
            </div>
            {method === "upload" && (
              <div
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void readFile(e.dataTransfer.files[0]);
                }}
              >
                <span className="empty-icon">
                  <Upload size={23} />
                </span>
                <h3>
                  {reading
                    ? "Reading your transcript…"
                    : filename || "Drop your transcript here"}
                </h3>
                <p>.txt, .vtt, or .json · Up to 1 MB</p>
                <button
                  type="button"
                  className="button"
                  disabled={reading}
                  onClick={() => fileRef.current?.click()}
                >
                  Choose file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.vtt,.json"
                  className="sr-only"
                  aria-label="Upload transcript file"
                  onChange={(e) => void readFile(e.target.files?.[0])}
                />
              </div>
            )}
            <label className="format-label">
              Transcript format
              <select
                aria-label="Transcript format"
                value={format}
                onChange={(e) =>
                  setFormat(
                    e.target.value as MeetingCreate["transcript_format"],
                  )
                }
              >
                <option value="txt">Plain text</option>
                <option value="vtt">WebVTT</option>
                <option value="json">JSON segments</option>
              </select>
            </label>
            <label>
              {method === "upload" ? "Transcript preview" : "Transcript"}
              <textarea
                aria-label="Transcript"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                maxLength={1_000_000}
                rows={10}
                required
                placeholder={
                  "Ananya: Let’s align on the priorities for this week.\nAlex: I will send the updated roadmap by Friday.\nSarah: Agreed, we’ll start with the onboarding improvements."
                }
              />
              <small>
                {format === "txt"
                  ? "Use one speaker turn per line. “Name: text” is recognized automatically."
                  : format === "json"
                    ? 'Array of objects: {"speaker_name":"Ananya", "start_seconds":0, "end_seconds":15, "text":"Hello"}.'
                    : "Use WEBVTT cues with start and end timestamps. Duration must include the final cue."}
              </small>
            </label>
            <div className="analysis-note">
              <Sparkles size={19} />
              <p>
                <strong>From conversation to clarity</strong>Your transcript
                becomes searchable notes, chapters, and suggested follow-ups
                using a deterministic demo analyzer.
              </p>
            </div>
          </>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
      </div>
      <footer className="modal-footer">
        {meeting ? (
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        ) : (
          <Link prefetch={false} className="button" href="/meetings">
            Cancel
          </Link>
        )}
        <button
          type="submit"
          className="button primary"
          disabled={busy || reading}
        >
          {busy ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <Sparkles size={17} />
          )}{" "}
          {busy
            ? "Saving meeting…"
            : meeting
              ? "Save changes"
              : "Create meeting"}
        </button>
      </footer>
    </form>
  );
  if (meeting)
    return (
      <Modal
        title="Edit meeting"
        onClose={() => {
          if (!busy) onClose?.();
        }}
      >
        {form}
      </Modal>
    );
  return (
    <div className="page create-page">
      <Link prefetch={false} className="back-link" href="/meetings">
        <ArrowLeft size={16} />
        Back to meetings
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE EVERY CONVERSATION COUNT</div>
          <h1>
            Add a meeting<span className="heading-dot">.</span>
          </h1>
          <p>
            Bring your transcript. We’ll help you find the moments that matter.
          </p>
        </div>
      </div>
      <div className="create-layout">
        <section className="panel">{form}</section>
        <aside className="create-aside">
          <span className="empty-icon">
            <Sparkles size={26} />
          </span>
          <h2>Your meeting, thoughtfully organized.</h2>
          <p>Everything you need to move from discussion to doing.</p>
          {[
            "A searchable, interactive transcript",
            "A concise overview and detailed notes",
            "Chapters to revisit key moments",
            "Suggested action items with owners",
          ].map((t, i) => (
            <div className="create-benefit" key={t}>
              <span>{i + 1}</span>
              {t}
            </div>
          ))}
          <div className="form-divider" />
          <p className="small">
            Have a recording? This demo accepts text transcripts. Audio
            transcription and live meeting capture are coming later.
          </p>
          <Link prefetch={false} className="text-button" href="/help">
            View supported formats{" "}
            <X size={12} style={{ transform: "rotate(45deg)" }} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
