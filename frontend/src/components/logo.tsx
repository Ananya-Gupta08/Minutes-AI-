export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <svg
        width="35"
        height="35"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="38" height="38" rx="12" fill="#7545d8" />
        <path
          d="M8 21v3m5-9v15m5-20v23m5-17v13m5-9v4"
          stroke="white"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
        <path
          d="m29 5 1.6 4.4L35 11l-4.4 1.6L29 17l-1.6-4.4L23 11l4.4-1.6L29 5Z"
          fill="#e8d9ff"
        />
      </svg>
      {!compact && (
        <span>
          Minutes <strong>AI</strong>
        </span>
      )}
    </span>
  );
}
