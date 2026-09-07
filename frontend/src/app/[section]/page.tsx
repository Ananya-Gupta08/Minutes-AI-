import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  FileAudio,
  MessageSquare,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

const content = {
  integrations: {
    title: "Your favorite tools. One connected flow.",
    description:
      "Bring meeting insights into the places your team already works. Integrations are on our roadmap.",
    icon: Workflow,
    cards: [
      {
        title: "Calendar connections",
        text: "Keep your meeting library in sync with your calendar.",
        icon: CalendarDays,
      },
      {
        title: "Team messaging",
        text: "Bring decisions and follow-ups into your team’s conversations.",
        icon: MessageSquare,
      },
      {
        title: "Knowledge tools",
        text: "Connect meeting insights to your shared source of truth.",
        icon: FileAudio,
      },
    ],
  },
  team: {
    title: "Clarity is better when it’s shared.",
    description:
      "Shared workspaces, team permissions, and collaborative follow-ups are coming to Minutes AI.",
    icon: Users,
    cards: [
      {
        title: "Shared libraries",
        text: "Give your team a home for every conversation.",
        icon: FileAudio,
      },
      {
        title: "Workspace roles",
        text: "Choose who can view, contribute, and manage.",
        icon: ShieldCheck,
      },
      {
        title: "Collaborative follow-ups",
        text: "Keep everyone aligned on what happens next.",
        icon: Users,
      },
    ],
  },
  "live-meeting-bot": {
    title: "Be in the moment. We’ll take the notes.",
    description:
      "Live meeting capture is on the roadmap. For now, add a transcript to explore your meeting insights.",
    icon: Mic,
    cards: [
      {
        title: "Meeting capture",
        text: "Bring your conversations into a searchable workspace.",
        icon: Mic,
      },
      {
        title: "Automatic notes",
        text: "Review the key moments after each conversation.",
        icon: Sparkles,
      },
      {
        title: "Connected calendar",
        text: "Choose which meetings to capture ahead of time.",
        icon: CalendarDays,
      },
    ],
  },
};
export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === "settings")
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">YOUR PERSONAL SPACE</div>
            <h1>Workspace settings</h1>
            <p>A few details about your Minutes AI workspace.</p>
          </div>
        </div>
        <div className="panel settings-panel">
          <h2>Profile & workspace</h2>
          <div className="settings-row">
            <span>Name</span>
            <strong>Ananya Gupta</strong>
          </div>
          <div className="settings-row">
            <span>Workspace</span>
            <strong>Ananya’s workspace</strong>
          </div>
          <div className="settings-row">
            <span>Access</span>
            <strong>Single-user demo</strong>
          </div>
          <div className="settings-row">
            <span>Analysis</span>
            <strong>Deterministic transcript analysis</strong>
          </div>
          <p>
            Profile editing, account management, and workspace preferences are
            coming later. Meetings and action items are saved automatically to
            the connected backend.
          </p>
          <Link
            prefetch={false}
            className="text-button"
            href="/help"
            style={{ marginTop: 20 }}
          >
            Getting started <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  if (section === "help")
    return (
      <div className="page placeholder-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">A LITTLE GUIDANCE</div>
            <h1>From conversation to clarity.</h1>
            <p>Get to know your Minutes AI workspace.</p>
          </div>
        </div>
        <article className="panel help-content">
          <h2>Your first meeting in four steps</h2>
          <ol>
            <li>
              Open a demo meeting from the library, or choose Add meeting.
            </li>
            <li>Paste a transcript or upload a supported text file.</li>
            <li>Review the overview, chapters, and suggested action items.</li>
            <li>
              Play the simulated timeline, click a transcript moment, or search
              for a phrase.
            </li>
          </ol>
          <h2>Supported transcript formats</h2>
          <p>
            Files must be UTF-8 text, up to 1 MB and 2,000 segments. Duration
            must contain every timestamp. Segments must be ordered and must not
            overlap.
          </p>
          <h3 style={{ marginTop: 20 }}>Plain text (.txt)</h3>
          <pre>
            {
              "Ananya: Let’s review the customer feedback.\nAlex: I will send the updated plan by Friday."
            }
          </pre>
          <h3 style={{ marginTop: 20 }}>WebVTT (.vtt)</h3>
          <pre>
            {
              "WEBVTT\n\n00:00:00.000 --> 00:00:15.000\n<v Ananya>Let’s review the customer feedback.\n\n00:00:15.000 --> 00:00:30.000\n<v Alex>I will send the updated plan by Friday."
            }
          </pre>
          <h3 style={{ marginTop: 20 }}>JSON (.json)</h3>
          <pre>
            {JSON.stringify(
              [
                {
                  speaker_name: "Ananya",
                  start_seconds: 0,
                  end_seconds: 15,
                  text: "Let’s review the customer feedback.",
                },
                {
                  speaker_name: "Alex",
                  start_seconds: 15,
                  end_seconds: 30,
                  text: "I will send the updated plan by Friday.",
                },
              ],
              null,
              2,
            )}
          </pre>
          <h2>What’s simulated?</h2>
          <p>
            Playback advances a timeline without audio. Notes, topics, and
            follow-ups use deterministic text analysis; there is no
            speech-to-text or external AI call. You can review and edit
            suggested action items before using them.
          </p>
          <h2>Shortcuts & accessibility</h2>
          <p>
            In transcript search, Enter moves to the next match and Shift +
            Enter moves to the previous one. Use Tab to navigate controls, arrow
            keys to switch insight tabs or adjust the timeline, and Escape to
            close dialogs.
          </p>
          <Link
            prefetch={false}
            href="/meetings/new"
            className="button primary"
            style={{ marginTop: 24 }}
          >
            Add a meeting <ArrowRight size={15} />
          </Link>
        </article>
      </div>
    );
  if (!(section in content)) notFound();
  const page = content[section as keyof typeof content];
  return (
    <div className="page placeholder-page">
      <div className="panel placeholder-hero">
        <span className="empty-icon">
          <page.icon size={26} />
        </span>
        <span className="demo-pill">Coming soon</span>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
        <Link prefetch={false} href="/meetings" className="button primary">
          Explore your meetings <ArrowRight size={15} />
        </Link>
      </div>
      <div className="placeholder-grid">
        {page.cards.map((c) => (
          <div className="panel placeholder-card" key={c.title}>
            <c.icon size={24} />
            <h3>{c.title}</h3>
            <p>{c.text}</p>
            <span className="demo-pill">On the roadmap</span>
          </div>
        ))}
      </div>
    </div>
  );
}
