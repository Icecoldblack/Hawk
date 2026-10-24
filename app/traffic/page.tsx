import type { Metadata } from "next";
import { TrafficMonitor } from "@/components/traffic/TrafficMonitor";

export const metadata: Metadata = { title: "GDOT traffic cam · Hawk" };

export default function TrafficPage() {
  return <TrafficMonitor />;
}
