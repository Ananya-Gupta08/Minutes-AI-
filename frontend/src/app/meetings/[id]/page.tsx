import { MeetingDetailView } from "@/components/meeting-detail";
export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingDetailView key={id} id={id} />;
}
