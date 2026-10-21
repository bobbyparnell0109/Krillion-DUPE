/**
 * Shared loading and error states for the game screens.
 */
export function LoadingPanel() {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-24 text-mist">
      <span className="text-4xl motion-safe:animate-bounce" aria-hidden="true">🫧</span>
      <span>Descending…</span>
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div role="alert" className="glass mx-auto mt-10 max-w-md rounded-3xl p-6 text-center">
      <p className="text-3xl" aria-hidden="true">🪸</p>
      <p className="mt-2 font-semibold">{message ?? "Something went wrong."}</p>
      <button type="button" onClick={onRetry} className="mt-4 min-h-12 rounded-2xl bg-foam px-6 font-bold text-abyss">
        Try again
      </button>
    </div>
  );
}
