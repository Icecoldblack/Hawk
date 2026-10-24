import type { Metadata } from "next";
import { ReportForm } from "@/components/report/ReportForm";

export const metadata: Metadata = { title: "Report an emergency · Raven" };

export default function ReportPage() {
  return <ReportForm />;
}
