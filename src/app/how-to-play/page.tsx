import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { DAILY, DEPTH_BANDS, INFINITE } from "@/config/game";
import { Prose } from "@/components/content/Prose";
import { TierTable } from "@/components/content/TierTable";
import { HowToSteps } from "@/components/content/HowToSteps";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "How to play",
  description: `Learn how ${SITE.name} works: name rare answers, climb the tiers and dive deeper.`,
  alternates: { canonical: "/how-to-play" },
};

export default function HowToPlayPage() {
  return (
    <Prose title="How to play" intro="One rule: be right, but be rare.">
      <HowToSteps />

      <h2>Scoring</h2>
      <p>
        Every accepted answer is placed in a tier based on how many other players gave it. Early on we use an expert
        estimate of how common each answer is; as more people play, real answers take over.
      </p>
      <TierTable />
      <p>
        <strong>One in a Million</strong> is reserved for an answer that is tied for the rarest on the board and that no player
        has ever given before. Answers we can’t accept score nothing.
      </p>

      <h2>Daily Dive</h2>
      <ul>
        <li>{DAILY.promptCount} prompts, the same for everyone, reset at midnight UTC.</li>
        <li>{DAILY.secondsPerPrompt} seconds per prompt. When time runs out we submit whatever you’ve typed.</li>
        <li>Close the tab mid-dive? Come back and pick up where you left off.</li>
        <li>Finish to see your depth band, share an emoji summary and keep your streak alive.</li>
      </ul>
      <p>The five depth bands:</p>
      <ul>
        {DEPTH_BANDS.map((b) => (
          <li key={b.name}>
            {b.emoji} <strong>{b.name}</strong>: {b.min}m and deeper
          </li>
        ))}
      </ul>

      <h2>Infinite Dive</h2>
      <ul>
        <li>Start with {INFINITE.startingAirSeconds} seconds of air.</li>
        <li>Air drains only while a prompt is on screen, so take your time on the results.</li>
        <li>Deep Cut and One in a Million answers add 16 seconds, Shallows and Reef add 12, Plankton adds 8. Wrong answers add nothing.</li>
        <li>When your air runs out, the run ends. Beat your personal best and claim a spot on the leaderboard.</li>
      </ul>

      <h2>Typing tips</h2>
      <ul>
        <li>Capitals, accents, plurals and “the” don’t matter.</li>
        <li>UK and US spellings both work, and small typos on longer words are forgiven.</li>
        <li>Be specific: “Golden Gate” is a famous bridge, “big bridge” is not.</li>
      </ul>

      <div className="flex flex-wrap gap-3 pt-4">
        <ButtonLink href="/play/daily">Play Daily</ButtonLink>
        <ButtonLink href="/play/infinite" variant="secondary">Play Infinite</ButtonLink>
      </div>
    </Prose>
  );
}
