import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { Prose } from "@/components/content/Prose";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${SITE.name} handles your data (spoiler: barely at all).`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Prose title="Privacy" intro="Short version: no accounts, no ads, no tracking cookies.">
      <h2>What we store on our server</h2>
      <ul>
        <li><strong>Your answers</strong>, so we can work out how rare each answer is. They aren’t linked to your identity.</li>
        <li><strong>A random player id</strong> generated in your browser, so you get one Daily Dive per day and can resume it.</li>
        <li><strong>A one-way hash of your IP address</strong> (salted, the raw address is never stored), used only for rate limiting and abuse prevention.</li>
        <li><strong>The nickname you choose</strong>, if you add a run to the leaderboard.</li>
      </ul>
      <h2>What stays in your browser</h2>
      <p>
        Streaks, personal bests, your local top 10, which prompts you’ve already seen and your mute preference are kept in
        your browser’s local storage. Clearing site data removes them.
      </p>
      <h2>Third parties</h2>
      <p>
        Answers that aren’t on our list may be sent to an AI provider (Anthropic) to judge whether they’re valid. Only the
        prompt and the answer text are sent, never anything that identifies you. The site is hosted on Vercel and the
        database on Supabase.
      </p>
      <h2>Contact</h2>
      <p>Questions or removal requests: contact the site operator.</p>
    </Prose>
  );
}
