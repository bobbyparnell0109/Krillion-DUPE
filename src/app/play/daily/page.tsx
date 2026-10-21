import type { Metadata } from "next";
import { DailyGame } from "@/components/game/DailyGame";

export const metadata: Metadata = {
  title: "Daily Dive",
  description: "Seven prompts, 25 seconds each, the same for everyone today. Find the rarest answers and dive deep.",
  alternates: { canonical: "/play/daily" },
};

export default function DailyPage() {
  return <DailyGame />;
}
