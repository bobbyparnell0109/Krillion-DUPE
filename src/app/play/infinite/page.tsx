import type { Metadata } from "next";
import { InfiniteGame } from "@/components/game/InfiniteGame";

export const metadata: Metadata = {
  title: "Infinite Dive",
  description: "Endless prompts against the clock. Rare answers refill your air. How deep can you go?",
  alternates: { canonical: "/play/infinite" },
};

export default function InfinitePage() {
  return <InfiniteGame />;
}
