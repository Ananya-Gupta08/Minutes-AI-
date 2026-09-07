import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Minutes AI — Your meetings, made meaningful",
    template: "%s | Minutes AI",
  },
  description:
    "Turn conversations into clarity. An original meeting intelligence workspace with searchable transcripts, notes, and actionable follow-ups.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
        <Toaster richColors position="bottom-right" closeButton />
      </body>
    </html>
  );
}
