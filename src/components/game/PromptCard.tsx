/**
 * The live prompt. Big, readable, announced to screen readers when it changes.
 */
export function PromptCard({ text, category, label }: { text: string; category: string; label?: string }) {
  return (
    <section aria-labelledby="prompt-text" className="animate-sink text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-glow">
        {label ? `${label} · ` : ""}
        {category}
      </p>
      <h1 id="prompt-text" aria-live="polite" className="mt-3 font-[family-name:var(--font-display)] text-3xl font-black leading-tight text-balance sm:text-5xl">
        {text}
      </h1>
    </section>
  );
}
