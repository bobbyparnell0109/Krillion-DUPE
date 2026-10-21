"use client";

import { useState } from "react";

/** Copies text to the clipboard, with a textarea fallback for older browsers. */
export function CopyButton({ text, label = "Copy result" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="min-h-12 rounded-2xl bg-glow px-6 font-bold text-abyss hover:brightness-110"
    >
      <span aria-live="polite">{copied ? "Copied! ✓" : label}</span>
    </button>
  );
}
