import type { Metadata } from "next";
import { MonitorDashboard } from "@/components/monitor/MonitorDashboard";

export const metadata: Metadata = { title: "Live monitor · Hawk" };

export default function MonitorPage() {
  return <MonitorDashboard />;
}
