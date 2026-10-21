import { SITE } from "@/config/site";
import { DAILY, INFINITE } from "@/config/game";

export const FAQ_ITEMS = [
  {
    q: `How does ${SITE.name} decide how rare my answer is?`,
    a: "Every prompt has a bank of accepted answers. Each one starts with an estimated popularity, then we blend in what real players actually answer. The fewer people who give your answer, the higher it scores.",
  },
  {
    q: "What if my answer is right but not on the list?",
    a: "Unmatched answers are checked by an AI judge. If it is valid, it is added to the bank and you score for it. Everything the judge rejects is logged so a human can review it and grow the list.",
  },
  {
    q: "Do I need to spell things perfectly?",
    a: "No. We ignore capitals, accents, plurals, “the” at the start, UK vs US spelling and small typos on longer words. Short words have to be exact, so “cat” never turns into “car”.",
  },
  {
    q: "When does the Daily Dive reset?",
    a: `Every day at midnight UTC. Everyone gets the same ${DAILY.promptCount} prompts, with ${DAILY.secondsPerPrompt} seconds for each.`,
  },
  {
    q: "How does air work in Infinite Dive?",
    a: `You start with ${INFINITE.startingAirSeconds} seconds. Air only drains while a prompt is on screen, never on the results screen. Good answers top it up (up to ${INFINITE.maxAirSeconds}s); wrong answers don't.`,
  },
  {
    q: "Do I need an account?",
    a: "No accounts, no email, no ads. Your streaks and personal bests are saved in your browser. If you want to appear on the leaderboard, just pick a nickname at the end of a run.",
  },
  {
    q: "Can I cheat by editing my score?",
    a: "Scores, timers and air are all calculated on our server, so editing the page doesn't change anything.",
  },
];

/** Accessible FAQ using native disclosure widgets. */
export function Faq() {
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item) => (
        <details key={item.q} className="glass group rounded-2xl p-4">
          <summary className="cursor-pointer list-none font-semibold marker:hidden">
            <span className="mr-2 inline-block transition group-open:rotate-90" aria-hidden="true">›</span>
            {item.q}
          </summary>
          <p className="mt-3 text-mist">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/** FAQPage structured data for search engines. */
export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
