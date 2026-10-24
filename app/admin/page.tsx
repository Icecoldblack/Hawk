import type { Metadata } from "next";
import { MonitorDashboard } from "@/components/monitor/MonitorDashboard";

export const metadata: Metadata = { title: "Admin · Hawk" };

export default function AdminPage() {
  return <MonitorDashboard />;
}
