"use client";
import { useEffect, useState } from "react";

interface GamePred {
  game_id: string;
  home_team: string; away_team: string;
  kickoff_local?: string;
  p_home_win: number; exp_home_pts: number; exp_away_pts: number;
  confidence: string;
}

function Badge({ level }: { level: string }) {
  const cls = level === "High" ? "bg-green-100 text-green-700" : level === "Med" ? "bg-yellow-100 text-yellow-700" : "bg-gray-200 text-gray-700";
  return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>{level}</span>;
}

export default function Home() {
  const [season, setSeason] = useState<number>(new Date().getFullYear());
  const [week, setWeek] = useState<number>(1);
  const [data, setData] = useState<GamePred[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeek = async () => {
      setErr(null); setData(null);
      try {
        const r = await fetch(`/api/week?season=${season}&week=${week}`);
        if (!r.ok) throw new Error("Failed");
        setData(await r.json());
      } catch (e:any) { setErr(e.message || "Failed"); }
    };
    fetchWeek();
  }, [season, week]);

  return (
    <main>
      <h1 className="text-2xl font-bold mb-4">NFL Predictions</h1>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setWeek(Math.max(1, week - 1))} className="px-3 py-2 rounded-xl bg-white shadow">◀ Week</button>
        <div className="px-3 py-2 rounded-xl bg-white shadow">Week {week} · {season}</div>
        <button onClick={() => setWeek(week + 1)} className="px-3 py-2 rounded-xl bg-white shadow">Week ▶</button>
        <div className="flex-1" />
        <button onClick={() => setSeason(season - 1)} className="px-3 py-2 rounded-xl bg-white shadow">◀ {season - 1}</button>
        <button onClick={() => setSeason(season + 1)} className="px-3 py-2 rounded-xl bg-white shadow">{season + 1} ▶</button>
      </div>

      {err && <div className="text-red-600">Failed to load</div>}
      {!data && !err && <div>Loading…</div>}

      <div className="grid gap-3">
        {data?.map((g) => (
          <div key={g.game_id} className="bg-white rounded-2xl p-4 shadow">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold">{g.away_team} @ {g.home_team}</h2>
              <Badge level={g.confidence} />
            </div>
            {g.kickoff_local && <div className="text-xs text-gray-500 mb-1">Kickoff: {g.kickoff_local}</div>}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-blue-500" style={{ width: `${Math.round(g.p_home_win * 100)}%` }} />
            </div>
            <div className="text-sm mb-1">Home win probability: <b>{Math.round(g.p_home_win * 100)}%</b></div>
            <div className="text-sm">Predicted score: <b>{g.home_team} {g.exp_home_pts}</b> – <b>{g.away_team} {g.exp_away_pts}</b></div>
          </div>
        ))}
      </div>
    </main>
  );
}
