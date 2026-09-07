"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
  ArrowRight,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileAudio,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { Library, Meeting } from "@/lib/types";
import { dateLabel, timeLabel } from "@/lib/utils";
import {
  Avatars,
  ConfirmDelete,
  EmptyState,
  ErrorState,
  LoadingState,
} from "./ui";
import { MeetingForm } from "./meeting-form";

export function LibraryView() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.toString();
  const queryRef = useRef(query);
  const [data, setData] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState<Meeting | null>(null);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    queryRef.current = query;
    const controller = new AbortController();
    api
      .library(query, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const offset = Number(new URLSearchParams(query).get("offset") || 0);
        if (offset > 0 && offset >= result.total) {
          const next = new URLSearchParams(query);
          next.delete("offset");
          router.replace(`/meetings?${next}`, { scroll: false });
        }
        setData(result);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, revision, router]);
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(queryRef.current);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "offset") next.delete("offset");
    if (next.toString() === query) return;
    queryRef.current = next.toString();
    setLoading(true);
    router.push(`/meetings?${next.toString()}`, { scroll: false });
  };
  const refresh = () => {
    setLoading(true);
    setRevision((r) => r + 1);
  };
  const clearFilters = () => {
    queryRef.current = "";
    setError("");
    setLoading(true);
    router.push("/meetings", { scroll: false });
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(deleting.id);
      toast.success("Meeting deleted");
      setDeleting(null);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (!data && loading) return <LoadingState />;
  if (error)
    return (
      <>
        <ErrorState message={error} retry={refresh} />
        {query && (
          <div className="empty-state" style={{ minHeight: 80, paddingTop: 0 }}>
            <button className="button" onClick={clearFilters}>
              Reset search and filters
            </button>
          </div>
        )}
      </>
    );
  if (!data) return null;
  const filtered = [
    "search",
    "participant",
    "topic",
    "date_from",
    "date_to",
  ].some((key) => params.has(key));
  const stats = [
    {
      label: "Total meetings",
      value: data.stats.total_meetings,
      icon: FileAudio,
      note: "All your conversations",
      color: "purple",
    },
    {
      label: "Meeting hours",
      value: `${data.stats.total_hours}`,
      icon: Clock3,
      note: "Ready to revisit",
      color: "blue",
    },
    {
      label: "Open action items",
      value: data.stats.open_action_items,
      icon: CheckCheck,
      note: "Next steps that matter",
      color: "orange",
    },
    {
      label: "Meetings this week",
      value: data.stats.meetings_this_week,
      icon: CalendarDays,
      note: "Monday through Sunday",
      color: "green",
    },
  ];
  return (
    <div className="page library-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE, AT A GLANCE</div>
          <h1>
            A clearer day starts here<span className="heading-dot">.</span>
          </h1>
          <p>
            Welcome back, Ananya. Pick up where your conversations left off.
          </p>
        </div>
        <Link prefetch={false} href="/meetings/new" className="button">
          <Plus size={17} />
          Add a transcript
        </Link>
      </div>
      <section className="stats-grid" aria-label="Meeting statistics">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className={`stat-icon ${s.color}`}>
                <s.icon size={18} />
              </span>
            </div>
            <strong>{s.value}</strong>
            <small>{s.note}</small>
          </div>
        ))}
      </section>
      <section className="insight-banner">
        <div className="banner-icon">
          <Sparkles size={24} />
        </div>
        <div>
          <h2>Good conversations deserve great follow-through.</h2>
          <p>Find the insight. Revisit the moment. Take the next step.</p>
        </div>
        <Link prefetch={false} href="/meetings/new">
          Turn a transcript into clarity <ArrowRight size={16} />
        </Link>
        <div className="banner-wave" aria-hidden="true">
          {[12, 23, 39, 24, 52, 34, 66, 43, 27, 49, 32, 19].map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </div>
      </section>
      <section className="meetings-section">
        <div className="section-heading">
          <div>
            <h2>
              All meetings <span className="count-badge">{data.total}</span>
            </h2>
            <p>A home for every conversation and everything that comes next.</p>
          </div>
          <span className="subtle-label">
            <span className="status-dot" />
            Your personal library
          </span>
        </div>
        <div className="filter-bar">
          <form
            className="library-search"
            key={params.get("search") || ""}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              change("search", String(form.get("search") || "").trim());
            }}
          >
            <Search size={18} />
            <input
              name="search"
              aria-label="Search meetings"
              placeholder="Search meetings, people, or anything said…"
              defaultValue={params.get("search") || ""}
              maxLength={200}
            />
            <button
              type="submit"
              aria-label="Search library"
              className="search-enter"
            >
              ↵
            </button>
          </form>
          <label className="select-control">
            <Users size={15} />
            <select
              aria-label="Filter by participant"
              value={params.get("participant") || ""}
              onChange={(e) => change("participant", e.target.value)}
            >
              <option value="">All participants</option>
              {data.participants.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="select-control">
            <Filter size={15} />
            <select
              aria-label="Filter by topic"
              value={params.get("topic") || ""}
              onChange={(e) => change("topic", e.target.value)}
            >
              <option value="">All topics</option>
              {data.topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <details className="dropdown">
            <summary className="button">
              <CalendarDays size={15} />
              Date range
            </summary>
            <div className="dropdown-panel date-filter">
              <label>
                From
                <input
                  type="date"
                  aria-label="From date"
                  value={params.get("date_from") || ""}
                  onChange={(e) => change("date_from", e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  aria-label="To date"
                  value={params.get("date_to") || ""}
                  onChange={(e) => change("date_to", e.target.value)}
                />
              </label>
            </div>
          </details>
          <label className="select-control sort-control">
            <ArrowDownUp size={15} />
            <select
              aria-label="Sort meetings"
              value={params.get("sort") || "newest"}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
        </div>
        {filtered && (
          <div className="active-filters">
            <span>
              Showing filtered results
              {params.get("search") ? ` for “${params.get("search")}”` : ""}
            </span>
            <button className="text-button" onClick={clearFilters}>
              <X size={14} />
              Clear filters
            </button>
          </div>
        )}
        <div
          className={`meeting-list ${loading ? "is-loading" : ""}`}
          aria-busy={loading}
        >
          <div className="list-table-heading">
            <span>MEETING</span>
            <span>PARTICIPANTS</span>
            <span>ACTION ITEMS</span>
            <span />
          </div>
          {data.meetings.map((meeting, index) => {
            const completed = meeting.action_items.filter(
              (a) => a.completed,
            ).length;
            const total = meeting.action_items.length;
            return (
              <article className="meeting-row" key={meeting.id}>
                <div className="meeting-primary">
                  <span className={`meeting-icon tone-${index % 4}`}>
                    <FileAudio size={21} />
                  </span>
                  <div className="meeting-text">
                    <Link
                      prefetch={false}
                      href={`/meetings/${meeting.id}`}
                      className="meeting-title"
                    >
                      {meeting.title}
                      <ChevronRight size={15} />
                    </Link>
                    <p>{meeting.summary_short}</p>
                    <div className="meeting-meta">
                      <span>
                        <CalendarDays size={12} />
                        {dateLabel(meeting.meeting_date)}
                      </span>
                      <span>{timeLabel(meeting.meeting_date)}</span>
                      <span>
                        <Clock3 size={12} />
                        {Math.round(meeting.duration_seconds / 60)} min
                      </span>
                      <span className="row-tags">
                        {meeting.topics.slice(0, 2).map((t) => (
                          <button
                            key={t.id}
                            className="tag"
                            onClick={() => change("topic", t.name)}
                          >
                            {t.name}
                          </button>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="people-cell">
                  <Avatars people={meeting.participants} />
                  <small>{meeting.participants.length} participants</small>
                </div>
                <div className="progress-cell">
                  <span>
                    <CheckCheck size={14} />
                    {completed}/{total} completed
                  </span>
                  <progress
                    value={completed}
                    max={total || 1}
                    aria-label={`Action items for ${meeting.title}`}
                  />
                </div>
                <details className="dropdown row-menu">
                  <summary
                    className="icon-button"
                    aria-label={`Actions for ${meeting.title}`}
                  >
                    <MoreHorizontal size={20} />
                  </summary>
                  <div className="dropdown-panel">
                    <button
                      onClick={(e) => {
                        e.currentTarget
                          .closest("details")
                          ?.removeAttribute("open");
                        setEditing(meeting);
                      }}
                    >
                      <Pencil size={15} />
                      Edit meeting
                    </button>
                    <button
                      className="danger-text"
                      onClick={(e) => {
                        e.currentTarget
                          .closest("details")
                          ?.removeAttribute("open");
                        setDeleting(meeting);
                      }}
                    >
                      <Trash2 size={15} />
                      Delete meeting
                    </button>
                  </div>
                </details>
              </article>
            );
          })}
          {data.meetings.length === 0 && (
            <EmptyState
              title={
                filtered
                  ? "No meetings match your search"
                  : "Your next great idea starts with a conversation"
              }
              description={
                filtered
                  ? "Try another keyword or clear your filters to see all meetings."
                  : "Add a transcript to bring your notes, decisions, and follow-ups together."
              }
            >
              {filtered ? (
                <button className="button" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link
                  prefetch={false}
                  className="button primary"
                  href="/meetings/new"
                >
                  <Plus size={16} />
                  Add a meeting
                </Link>
              )}
            </EmptyState>
          )}
          <div className="list-footer">
            <span>
              {data.total
                ? `Showing ${Number(params.get("offset") || 0) + 1}–${Number(params.get("offset") || 0) + data.meetings.length} of ${data.total} meetings`
                : "No meetings to show"}
            </span>
            <div>
              <button
                className="icon-button"
                aria-label="Previous page"
                disabled={!Number(params.get("offset") || 0)}
                onClick={() =>
                  change(
                    "offset",
                    String(Math.max(0, Number(params.get("offset") || 0) - 20)),
                  )
                }
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Next page"
                disabled={
                  Number(params.get("offset") || 0) + data.meetings.length >=
                  data.total
                }
                onClick={() =>
                  change(
                    "offset",
                    String(Number(params.get("offset") || 0) + 20),
                  )
                }
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
      {deleting && (
        <ConfirmDelete
          title="Delete this meeting?"
          description={`“${deleting.title}” and its transcript, notes, and action items will be permanently removed.`}
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}{" "}
      {editing && (
        <MeetingForm
          meeting={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
