"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  AudioLines,
  Bell,
  ChevronRight,
  CircleHelp,
  FileAudio,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Upload,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { Logo } from "./logo";
import { Modal } from "./ui";

const nav = [
  { href: "/meetings", label: "Meetings", icon: FileAudio },
  { href: "/meetings/new", label: "Upload transcript", icon: Upload },
  { href: "/integrations", label: "Integrations", icon: Workflow, soon: true },
  { href: "/team", label: "Team", icon: Users, soon: true },
];
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(false);
  const navigation = (
    <>
      <Link
        prefetch={false}
        href="/meetings"
        className="logo-link"
        onClick={() => setDrawer(false)}
      >
        <Logo />
      </Link>
      <div className="workspace-label">
        <span className="workspace-initial">AG</span>
        <span>
          Ananya’s workspace<small>Personal workspace</small>
        </span>
      </div>
      <div className="nav-section-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {nav.map((item) => (
          <Link
            prefetch={false}
            key={item.href}
            href={item.href}
            onClick={() => setDrawer(false)}
            className={`nav-item ${(item.href === "/meetings" ? pathname === "/meetings" || /^\/meetings\/\d+/.test(pathname) : pathname === item.href) ? "active" : ""}`}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
            {item.soon && <span className="nav-soon">Coming Soon</span>}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="tiny-spark">
            <Sparkles size={17} />
          </span>
          <h3>Less replay. More clarity.</h3>
          <p>Your conversations, organized into what matters.</p>
          <Link prefetch={false} href="/meetings/new">
            Add your first transcript <ChevronRight size={14} />
          </Link>
        </div>
        <Link
          prefetch={false}
          href="/settings"
          className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
          onClick={() => setDrawer(false)}
        >
          <Settings size={19} />
          Settings
        </Link>
        <Link
          prefetch={false}
          href="/help"
          className="nav-item"
          onClick={() => setDrawer(false)}
        >
          <CircleHelp size={19} />
          Help & getting started
        </Link>
        <div className="sidebar-profile">
          <span className="profile-avatar">AG</span>
          <div>
            <strong>Ananya Gupta</strong>
            <small>Personal workspace</small>
          </div>
        </div>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">{navigation}</aside>
      {drawer && (
        <Modal
          title="Your workspace"
          className="navigation-drawer"
          onClose={() => setDrawer(false)}
        >
          <div className="mobile-navigation">{navigation}</div>
        </Modal>
      )}
      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setDrawer(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <AudioLines size={17} />
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {pathname === "/meetings/new"
                ? "Add meeting"
                : pathname.startsWith("/meetings")
                  ? "Meetings"
                  : pathname.slice(1).replace(/^./, (s) => s.toUpperCase())}
            </strong>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(
                `/meetings${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`,
              );
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search all meetings"
              placeholder="Search your workspace"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={200}
            />
            <button
              type="submit"
              aria-label="Submit workspace search"
              className="search-enter"
            >
              ↵
            </button>
          </form>
          <Link
            prefetch={false}
            href="/meetings/new"
            className="button primary top-add"
          >
            <Plus size={17} />
            <span>Add meeting</span>
          </Link>
          <button
            className="icon-button notification-button"
            aria-label="Notifications"
            onClick={() => setNotice(true)}
          >
            <Bell size={19} />
          </button>
          <Link
            prefetch={false}
            href="/settings"
            aria-label="Profile settings"
            className="profile-avatar top-avatar"
          >
            AG
          </Link>
        </header>
        <main id="main-content">{children}</main>
        <footer className="app-footer">
          <span>
            <Logo compact /> A little more clarity in every conversation.
          </span>
          <span>Made for meaningful meetings</span>
        </footer>
      </div>
      {notice && (
        <Modal title="Notifications" onClose={() => setNotice(false)}>
          <div className="empty-state">
            <Bell size={28} />
            <h3>Notifications are coming soon</h3>
            <p>This demo does not deliver workspace notifications yet.</p>
            <button className="button" onClick={() => setNotice(false)}>
              <X size={15} />
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
