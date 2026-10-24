import type { Metadata } from "next";
import { ReportStatus } from "@/components/report/ReportStatus";

export const metadata: Metadata = { title: "Your report · Raven" };

export default async function ReportStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportStatus id={id} />;
}
