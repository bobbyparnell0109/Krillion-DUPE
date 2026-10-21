"use client";

/**
 * Submit a finished run to the global leaderboard under a nickname.
 */
import { useState } from "react";
import { api, type RunAuth } from "@/lib/client/api";
import { KEYS, readJson, writeJson } from "@/lib/client/storage";
import { LIMITS } from "@/config/game";

export function NameForm({ auth, initialName }: { auth: RunAuth | null; initialName: string | null }) {
  const [name, setName] = useState(() => initialName ?? readJson<string>(KEYS.lastName, ""));
  const [saved, setSaved] = useState(Boolean(initialName));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!auth) return null;
  if (saved) {
    return <p className="text-sm text-kelp">You’re on the leaderboard as <strong>{name}</strong>.</p>;
  }

  return (
    <form
      className="flex w-full flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const { state } = await api.name(auth, name);
          writeJson(KEYS.lastName, state.name ?? name);
          setName(state.name ?? name);
          setSaved(true);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="lb-name" className="sr-only">Leaderboard name</label>
      <input
        id="lb-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={LIMITS.nameMaxLength}
        minLength={2}
        required
        placeholder="Your diver name"
        autoComplete="nickname"
        className="glass min-h-12 flex-1 rounded-2xl px-4 text-foam placeholder:text-mist/70"
      />
      <button type="submit" disabled={busy} className="min-h-12 rounded-2xl border border-foam/40 px-5 font-semibold hover:bg-white/10 disabled:opacity-50">
        {busy ? "Saving…" : "Join leaderboard"}
      </button>
      {error ? <p role="alert" className="text-sm text-coral sm:basis-full">{error}</p> : null}
    </form>
  );
}
