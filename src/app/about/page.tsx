import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { Prose } from "@/components/content/Prose";

export const metadata: Metadata = {
  title: "About",
  description: `What ${SITE.name} is and how it works behind the scenes.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Prose title={`About ${SITE.name}`} intro="A small, ad-free game about thinking differently.">
      <p>
        Most quizzes reward the answer everyone knows. {SITE.name} flips that around: any correct answer counts, but the
        less popular it is, the deeper you dive. It’s a game of lateral thinking, deep knowledge and a little bit of nerve.
      </p>
      <h2>Where the prompts come from</h2>
      <p>
        Prompts and their answer lists are generated with the help of an AI model, then filtered by a second review pass
        that rejects anything ambiguous, opinion based, time sensitive or unpleasant. A human can review, edit and retire
        prompts at any time.
      </p>
      <h2>How rarity works</h2>
      <p>
        Each answer starts with an estimate of how common it is. As players answer, we blend those estimates with real
        answer counts, so scoring gets more accurate the more people play. If you give a valid answer we didn’t know about,
        an AI judge checks it and it joins the bank.
      </p>
      <h2>Fair play</h2>
      <p>
        Scores, timers and air are calculated on the server. Leaderboard names go through a profanity filter.
      </p>
    </Prose>
  );
}
