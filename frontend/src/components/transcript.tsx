"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FileText, Search, X } from "lucide-react";
import type { Segment } from "@/lib/types";
import { clockTime, initials } from "@/lib/utils";

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = [];
  let start = 0;
  let match = text.toLowerCase().indexOf(query.toLowerCase());
  while (match !== -1) {
    parts.push(text.slice(start, match));
    parts.push(
      <mark key={match}>{text.slice(match, match + query.length)}</mark>,
    );
    start = match + query.length;
    match = text.toLowerCase().indexOf(query.toLowerCase(), start);
  }
  parts.push(text.slice(start));
  return <>{parts}</>;
}

export function Transcript({
  segments,
  activeId,
  playing,
  seek,
}: {
  segments: Segment[];
  activeId: number | null;
  playing: boolean;
  seek: (time: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<number, HTMLButtonElement>());
  const query = search.trim();
  const visible = useMemo(
    () => segments.filter((s) => !speaker || s.speaker_name === speaker),
    [segments, speaker],
  );
  const matches = useMemo(
    () =>
      query
        ? visible.filter((s) =>
            s.text.toLowerCase().includes(query.toLowerCase()),
          )
        : [],
    [visible, query],
  );
  const scrollTo = (id: number) => {
    const row = rows.current.get(id);
    const box = container.current;
    if (row && box)
      box.scrollTo({
        top:
          box.scrollTop +
          row.getBoundingClientRect().top -
          box.getBoundingClientRect().top -
          box.clientHeight / 3,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  useEffect(() => {
    if (playing && activeId !== null) scrollTo(activeId);
  }, [activeId, playing]);
  const navigate = (direction: number) => {
    if (!matches.length) return;
    const current = matches.findIndex((s) => s.id === selectedMatch);
    const index =
      current === -1
        ? direction > 0
          ? 0
          : matches.length - 1
        : (current + direction + matches.length) % matches.length;
    const target = matches[index];
    setSelectedMatch(target.id);
    seek(target.start_seconds);
    scrollTo(target.id);
  };
  return (
    <section className="panel transcript-panel">
      <header className="panel-heading">
        <h2>
          <FileText size={18} />
          Transcript
        </h2>
        <span className="subtle-label">{segments.length} segments</span>
      </header>
      <div className="transcript-tools">
        <div className="transcript-search">
          <Search size={16} />
          <input
            aria-label="Search transcript"
            placeholder="Find a word or phrase…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedMatch(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                navigate(e.shiftKey ? -1 : 1);
              }
            }}
          />
          {search && (
            <button
              className="icon-button small-icon"
              aria-label="Clear transcript search"
              onClick={() => {
                setSearch("");
                setSelectedMatch(null);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          aria-label="Filter transcript speaker"
          value={speaker}
          onChange={(e) => {
            setSpeaker(e.target.value);
            setSelectedMatch(null);
          }}
        >
          <option value="">All speakers</option>
          {[...new Set(segments.map((s) => s.speaker_name))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {query && (
        <div className="match-navigation">
          <span aria-live="polite">
            {matches.length} matching segments
            {selectedMatch !== null &&
            matches.some((s) => s.id === selectedMatch)
              ? ` · ${matches.findIndex((s) => s.id === selectedMatch) + 1} of ${matches.length}`
              : ""}
          </span>
          <div>
            <button
              className="icon-button small-icon"
              aria-label="Previous search match"
              disabled={!matches.length}
              onClick={() => navigate(-1)}
            >
              <ChevronUp size={17} />
            </button>
            <button
              className="icon-button small-icon"
              aria-label="Next search match"
              disabled={!matches.length}
              onClick={() => navigate(1)}
            >
              <ChevronDown size={17} />
            </button>
          </div>
        </div>
      )}
      <div ref={container} className="transcript-scroll">
        {visible.map((s) => (
          <button
            ref={(node) => {
              if (node) rows.current.set(s.id, node);
              else rows.current.delete(s.id);
            }}
            key={s.id}
            className={`transcript-segment ${s.id === activeId ? "active-segment" : ""} ${s.id === selectedMatch ? "selected-match" : ""}`}
            onClick={() => seek(s.start_seconds)}
            aria-label={`Seek to ${clockTime(s.start_seconds)}, ${s.speaker_name}`}
            aria-describedby={`segment-text-${s.id}`}
            aria-current={s.id === activeId ? "true" : undefined}
            data-testid="transcript-segment"
            data-start={s.start_seconds}
          >
            <span
              className={`speaker-avatar tone-${Array.from(s.speaker_name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4}`}
            >
              {initials(s.speaker_name)}
            </span>
            <span className="segment-content">
              <span className="segment-header">
                <strong>{s.speaker_name}</strong>
                <span className="timestamp">{clockTime(s.start_seconds)}</span>
                {s.id === activeId && (
                  <span className="now-playing">
                    {playing ? "Playing" : "Current moment"}
                  </span>
                )}
              </span>
              <span className="segment-text" id={`segment-text-${s.id}`}>
                <Highlight text={s.text} query={query} />
              </span>
            </span>
          </button>
        ))}
      </div>
      <footer className="transcript-footer">
        <span className="status-dot" />
        Click any moment to jump into the conversation
      </footer>
    </section>
  );
}
