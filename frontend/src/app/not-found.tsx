import Link from "next/link";
import { EmptyState } from "@/components/ui";
export default function NotFound() {
  return (
    <EmptyState
      title="This page isn’t here"
      description="Head back to your workspace to find your meetings."
    >
      <Link prefetch={false} className="button primary" href="/meetings">
        Back to meetings
      </Link>
    </EmptyState>
  );
}
