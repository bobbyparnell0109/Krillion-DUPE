"use client";

/**
 * Client state machine shared by Daily and Infinite Dive. The server owns the score and
 * the clock; this hook only orchestrates requests and tracks what to show.
 *
 * intro -> playing -> submitting -> reveal -> playing ... -> finished
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Reveal, type RunAuth, type RunState } from "@/lib/client/api";
import { getPlayerId, KEYS, markSeen, readJson, recentSeen, removeKey, writeJson } from "@/lib/client/storage";
import { INFINITE } from "@/config/game";

export type Phase = "loading" | "intro" | "playing" | "submitting" | "reveal" | "finished" | "error";

interface SavedRun extends RunAuth {
  date: string;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function useRun(mode: "daily" | "infinite") {
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<RunState | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const auth = useRef<RunAuth | null>(null);
  // Guards against double submits from Enter + timer expiry firing together.
  const busy = useRef(false);

  const fail = useCallback((err: unknown) => {
    setError(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.");
    setPhase("error");
  }, []);

  /** Decide which phase a fresh state from the server corresponds to. */
  const applyState = useCallback((s: RunState) => {
    setState(s);
    if (s.status === "finished") setPhase("finished");
    else if (s.prompt) {
      markSeen(s.prompt.id);
      setPhase("playing");
    } else setPhase("intro");
  }, []);

  // Resume today's daily run if this browser started one.
  useEffect(() => {
    if (mode !== "daily") {
      setPhase("intro");
      return;
    }
    const saved = readJson<SavedRun | null>(KEYS.dailyRun(todayUtc()), null);
    if (!saved) {
      setPhase("intro");
      return;
    }
    auth.current = { runId: saved.runId, token: saved.token };
    api
      .state(auth.current)
      .then(({ state: s }) => applyState(s))
      .catch(() => {
        removeKey(KEYS.dailyRun(todayUtc()));
        auth.current = null;
        setPhase("intro");
      });
  }, [mode, applyState]);

  const next = useCallback(async () => {
    if (!auth.current || busy.current) return;
    busy.current = true;
    try {
      const { state: s } = await api.next(auth.current);
      setReveal(null);
      applyState(s);
    } catch (err) {
      fail(err);
    } finally {
      busy.current = false;
    }
  }, [applyState, fail]);

  /** Start (or resume) a run, then fetch its first prompt. */
  const begin = useCallback(async () => {
    setError(null);
    setPhase("loading");
    try {
      if (!auth.current) {
        const playerId = getPlayerId();
        const started =
          mode === "daily"
            ? await api.startDaily(playerId)
            : await api.startInfinite(playerId, recentSeen(INFINITE.maxExcludeIds));
        auth.current = { runId: started.state.runId, token: started.token };
        if (mode === "daily") writeJson(KEYS.dailyRun(started.state.date), { ...auth.current, date: started.state.date });
        if (started.state.status === "finished") {
          applyState(started.state);
          return;
        }
      }
      await next();
    } catch (err) {
      fail(err);
    }
  }, [mode, next, applyState, fail]);

  const submit = useCallback(
    async (answer: string) => {
      if (!auth.current || busy.current) return;
      busy.current = true;
      setPhase("submitting");
      try {
        const res = await api.answer(auth.current, answer);
        setReveal(res.reveal);
        setState(res.state);
        setPhase("reveal");
      } catch (err) {
        // A 409 means the server already moved on (e.g. double submit): resync.
        if (err instanceof ApiError && err.status === 409 && auth.current) {
          const { state: s } = await api.state(auth.current);
          applyState(s);
        } else fail(err);
      } finally {
        busy.current = false;
      }
    },
    [applyState, fail],
  );

  /** After the last reveal, show the summary. */
  const finish = useCallback(() => setPhase("finished"), []);

  /** Forget the current run (infinite "dive again"). */
  const reset = useCallback(() => {
    auth.current = null;
    setState(null);
    setReveal(null);
    setPhase("intro");
  }, []);

  return { phase, state, reveal, error, auth, begin, next, submit, finish, reset, setState };
}
