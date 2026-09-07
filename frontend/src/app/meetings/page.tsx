import { Suspense } from "react";
import { LibraryView } from "@/components/library";
import { LoadingState } from "@/components/ui";
export default function MeetingsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LibraryView />
    </Suspense>
  );
}
