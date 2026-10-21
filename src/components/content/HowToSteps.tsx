const STEPS = [
  { icon: "🧠", title: "Read the prompt", text: "Something like “Name a type of bridge” or “Name a famous Brian”." },
  { icon: "⌨️", title: "Type an answer", text: "Any valid answer counts, but the obvious ones barely get you wet." },
  { icon: "🌊", title: "Dive deep", text: "The fewer players who give your answer, the more points and metres you earn." },
];

export function HowToSteps() {
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {STEPS.map((s, i) => (
        <li key={s.title} className="glass rounded-3xl p-5">
          <p className="text-3xl" aria-hidden="true">{s.icon}</p>
          <h3 className="mt-2 text-lg font-bold">
            <span className="sr-only">Step {i + 1}: </span>
            {s.title}
          </h3>
          <p className="mt-1 text-mist">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
