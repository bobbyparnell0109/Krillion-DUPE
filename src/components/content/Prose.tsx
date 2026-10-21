import type { ReactNode } from "react";

/** Readable long-form text container for static pages. */
export function Prose({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl pt-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-black sm:text-5xl">{title}</h1>
      {intro ? <p className="mt-4 text-lg text-mist">{intro}</p> : null}
      <div className="mt-8 space-y-6 leading-relaxed text-mist [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foam [&_strong]:text-foam [&_a]:text-glow [&_a]:underline [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </article>
  );
}
