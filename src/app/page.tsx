import { SITE } from "@/config/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { HowToSteps } from "@/components/content/HowToSteps";
import { TierTable } from "@/components/content/TierTable";
import { Faq, FaqJsonLd } from "@/components/content/Faq";

export default function HomePage() {
  return (
    <>
      <section className="pt-10 pb-16 text-center sm:pt-20">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-glow">A daily trivia game</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl font-black leading-[1.05] text-balance sm:text-7xl">
          Obvious answers float.
          <br />
          <span className="text-glow">Rare ones sink deep.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-mist sm:text-xl">
          {SITE.name} gives you a prompt like <em className="text-foam">“Name a type of bridge”</em>. Any right answer counts, but the
          fewer people who think of yours, the deeper you dive.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/play/daily">Play Daily</ButtonLink>
          <ButtonLink href="/play/infinite" variant="secondary">Play Infinite</ButtonLink>
        </div>
        <p className="mt-4 text-sm text-mist">Free · No sign up · No ads</p>
      </section>

      <section aria-labelledby="how" className="py-10">
        <h2 id="how" className="mb-6 text-3xl font-black">How to play</h2>
        <HowToSteps />
      </section>

      <section aria-labelledby="tiers" className="py-10">
        <h2 id="tiers" className="mb-2 text-3xl font-black">From Plankton to One in a Million</h2>
        <p className="mb-4 text-mist">Every accepted answer lands in a tier based on how many players gave it.</p>
        <TierTable />
      </section>

      <section aria-labelledby="faq" className="py-10">
        <h2 id="faq" className="mb-6 text-3xl font-black">FAQ</h2>
        <Faq />
        <FaqJsonLd />
      </section>
    </>
  );
}
