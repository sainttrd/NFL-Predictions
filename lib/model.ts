// Tiny baseline model to get you live ASAP.
// Inputs: home/away strength (stubbed), weather mods, elevation, dome.
// You can swap this for a trained model later.

export type Features = {
  home: string; away: string; is_dome: boolean; elevation_m: number;
  avg_temp?: number | null; avg_precip?: number | null;
};

// Seed power ratings (very rough) – replace with learned ratings later
const RATING: Record<string, number> = {
  ARI: -1, ATL: 0, BAL: 4, BUF: 3, CAR: -2, CHI: 0, CIN: 2, CLE: 2,
  DAL: 3, DEN: 1, DET: 2, GB: 1, HOU: 2, IND: 0, JAX: 1, KC: 5, LAC: 0,
  LAR: 2, LV: -1, MIA: 2, MIN: 0, NE: -2, NO: 0, NYG: -1, NYJ: 0, PHI: 3,
  PIT: 1, SEA: 1, SF: 5, TB: 0, TEN: -1, WAS: -2
};

export function predict(f: Features) {
  const base = 0.50 + 0.04; // home field ~4%
  const ratingEdge = (RATING[f.home] - RATING[f.away]) * 0.02; // 2% per rating point
  let p = base + ratingEdge;

  if (!f.is_dome) {
    if (f.avg_precip && f.avg_precip > 50) p += 0.02; // sloppy helps home a bit
    if (typeof f.avg_temp === 'number' && f.avg_temp < 0) p += 0.01;
  }
  if (f.elevation_m >= 1500) p += 0.01; // Denver bump

  p = Math.max(0.02, Math.min(0.98, p));
  // Score guess around league average 45 with tilt to favorite
  const total = 45 + (p - 0.5) * 10;
  const home = Math.round(total * p);
  const away = Math.max(10, Math.round(total - home));

  let conf = 'Low';
  if (Math.abs(p - 0.5) > 0.25) conf = 'High';
  else if (Math.abs(p - 0.5) > 0.12) conf = 'Med';

  return { p_home_win: p, exp_home_pts: home, exp_away_pts: away, confidence: conf };
}
