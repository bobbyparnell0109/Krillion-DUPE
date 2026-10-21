"use client";

/**
 * Answer input. Exposes the current text through `valueRef` so a timer can auto-submit
 * whatever the player has typed when time runs out.
 */
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { LIMITS } from "@/config/game";

interface Props {
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  valueRef?: MutableRefObject<string>;
  promptKey: string;
}

export function AnswerForm({ onSubmit, disabled, valueRef, promptKey }: Props) {
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // New prompt: clear and focus the input.
  useEffect(() => {
    setValue("");
    if (valueRef) valueRef.current = "";
    input.current?.focus();
  }, [promptKey, valueRef]);

  return (
    <form
      className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit(value.trim());
      }}
    >
      <label htmlFor="answer" className="sr-only">Your answer</label>
      <input
        ref={input}
        id="answer"
        name="answer"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="send"
        maxLength={LIMITS.answerMaxLength}
        placeholder="Type a rare answer…"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          if (valueRef) valueRef.current = e.target.value;
        }}
        className="glass min-h-14 flex-1 rounded-2xl px-5 text-lg text-foam placeholder:text-mist/70 focus:border-glow"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="min-h-14 rounded-2xl bg-glow px-7 text-lg font-bold text-abyss transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? "Diving…" : "Dive"}
      </button>
    </form>
  );
}
