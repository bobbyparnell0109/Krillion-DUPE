import { ACCEPTED_TIERS, TIERS } from "@/config/game";

/** The scoring tiers, straight from config so docs never drift from the game. */
export function TierTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-separate border-spacing-y-2 text-left">
        <caption className="sr-only">Scoring tiers from most common to rarest</caption>
        <thead className="text-xs uppercase tracking-wider text-mist">
          <tr>
            <th scope="col" className="px-3">Tier</th>
            <th scope="col" className="px-3">What it means</th>
            <th scope="col" className="px-3 text-right">Points</th>
            <th scope="col" className="px-3 text-right">Depth</th>
            <th scope="col" className="px-3 text-right">Air</th>
          </tr>
        </thead>
        <tbody>
          {ACCEPTED_TIERS.map((id) => {
            const t = TIERS[id];
            return (
              <tr key={id} className="bg-white/5">
                <th scope="row" className="rounded-l-xl px-3 py-2 font-bold" style={{ color: t.color }}>
                  <span aria-hidden="true">{t.emoji} </span>{t.name}
                </th>
                <td className="px-3 py-2 text-mist">{t.blurb}</td>
                <td className="px-3 py-2 text-right font-mono">{t.points}</td>
                <td className="px-3 py-2 text-right font-mono">{t.depth}m</td>
                <td className="rounded-r-xl px-3 py-2 text-right font-mono">+{t.airBonus}s</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
