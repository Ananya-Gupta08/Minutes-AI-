"use client";
import { useState } from "react";
import { Check, ChevronRight, ListChecks, Sparkles } from "lucide-react";
import type { ActionItem, MeetingDetail } from "@/lib/types";
import { clockTime } from "@/lib/utils";
import { ActionItems } from "./action-items";

export function Insights({
  meeting,
  seek,
  onActions,
}: {
  meeting: MeetingDetail;
  seek: (seconds: number) => void;
  onActions: (items: ActionItem[]) => void;
}) {
  const [tab, setTab] = useState("Summary");
  return (
    <aside className="panel insights-panel">
      <header className="panel-heading">
        <h2>
          <Sparkles size={18} />
          Meeting insights
        </h2>
        <span className="demo-pill">Demo analysis</span>
      </header>
      <div
        className="insight-tabs"
        role="tablist"
        aria-label="Meeting insights"
      >
        {["Summary", "Action items", "Topics"].map((name, index, tabs) => (
          <button
            key={name}
            id={`tab-${index}`}
            role="tab"
            aria-selected={tab === name}
            aria-controls={`panel-${index}`}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => setTab(name)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (e.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                setTab(tabs[next]);
                document.getElementById(`tab-${next}`)?.focus();
              }
            }}
          >
            {name}
            {name === "Action items" && (
              <span>{meeting.action_items.length}</span>
            )}
          </button>
        ))}
      </div>
      <div
        className="insight-content"
        role="tabpanel"
        tabIndex={0}
        id={`panel-${["Summary", "Action items", "Topics"].indexOf(tab)}`}
        aria-labelledby={`tab-${["Summary", "Action items", "Topics"].indexOf(tab)}`}
      >
        {tab === "Summary" && (
          <>
            <div className="overview-heading">
              <span className="eyebrow">THE BIG PICTURE</span>
              <Sparkles size={15} />
            </div>
            <p className="summary-overview">{meeting.summary_short}</p>
            <div className="form-divider" />
            {meeting.summary_detailed.sections.map((section, i) => (
              <section className="note-section" key={section.title}>
                <h3>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {section.title}
                </h3>
                <ul>
                  {section.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </section>
            ))}
            {meeting.summary_detailed.decisions.length > 0 && (
              <section className="decisions">
                <h3>
                  <ListChecks size={17} />
                  Key decisions
                </h3>
                {meeting.summary_detailed.decisions.map((d, i) => (
                  <p key={i}>
                    <Check size={15} />
                    {d}
                  </p>
                ))}
              </section>
            )}
            <p className="analysis-caption">
              Generated with deterministic analysis. Review against the
              transcript before sharing.
            </p>
          </>
        )}
        {tab === "Action items" && (
          <ActionItems
            meetingId={meeting.id}
            items={meeting.action_items}
            people={meeting.participants.map((p) => p.name)}
            onChange={onActions}
          />
        )}{" "}
        {tab === "Topics" && (
          <>
            <div className="eyebrow">CONVERSATION TOPICS</div>
            <div className="topic-cloud">
              {meeting.topics.map((t) => (
                <span className="tag" key={t.id}>
                  {t.name}
                </span>
              ))}
              {!meeting.topics.length && (
                <p className="muted">
                  No topics yet. Add topics by editing this meeting.
                </p>
              )}
            </div>
            <h3 className="chapters-heading">Jump to a chapter</h3>
            {meeting.chapters.map((c) => (
              <button
                className="chapter"
                key={c.id}
                onClick={() => seek(c.start_seconds)}
              >
                <span className="chapter-time">
                  {clockTime(c.start_seconds)}
                </span>
                <span>
                  <strong>{c.title}</strong>
                  <small>{c.description}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
