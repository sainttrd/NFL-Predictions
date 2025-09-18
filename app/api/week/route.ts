import { NextRequest, NextResponse } from "next/server";
import { STADIUMS } from "@/lib/stadiums";
import { predict } from "@/lib/model";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const METEO = "https://api.open-meteo.com/v1/forecast";

async function fetchSchedule(season:number, week:number) {
  const url = `${ESPN}?year=${season}&week=${week}&seasontype=2`;
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();
  return (j.events||[]).map((ev:any)=>{
    const comp = ev.competitions[0];
    const home = comp.competitors.find((c:any)=>c.homeAway==='home');
    const away = comp.competitors.find((c:any)=>c.homeAway==='away');
    return {
      game_id: ev.id,
      kickoff_utc: ev.date,
      home_team: home.team.abbreviation,
      away_team: away.team.abbreviation,
    };
  });
}

async function fetchWeather(homeAbbr:string, isoDate:string){
  const s = STADIUMS[homeAbbr];
  if (!s) return {} as any;
  if (s.roof === 'dome') return { is_dome:true, elevation_m:s.elevation_m };
  const d = isoDate.slice(0,10);
  const q = new URLSearchParams({
    latitude: String(s.lat), longitude: String(s.lon),
    hourly: "temperature_2m,precipitation_probability",
    start_date: d, end_date: d
  }).toString();
  const r = await fetch(`${METEO}?${q}`, { cache: "no-store" });
  const j = await r.json();
  const temps:number[] = j?.hourly?.temperature_2m || [];
  const precip:number[] = j?.hourly?.precipitation_probability || [];
  const avg = (a:number[]) => a.length ? a.reduce((x,y)=>x+y,0)/a.length : undefined;
  return {
    is_dome:false,
    elevation_m: s.elevation_m,
    avg_temp: avg(temps),
    avg_precip: avg(precip)
  };
}

export async function GET(req:NextRequest){
  const { searchParams } = new URL(req.url);
  const season = Number(searchParams.get('season')) || new Date().getFullYear();
  const week = Number(searchParams.get('week')) || 1;

  const sched = await fetchSchedule(season, week);
  const out = [] as any[];
  for (const g of sched){
    const wx = await fetchWeather(g.home_team, g.kickoff_utc);
    const p = predict({
      home: g.home_team, away: g.away_team,
      is_dome: (STADIUMS[g.home_team]?.roof === 'dome'),
      elevation_m: wx.elevation_m || STADIUMS[g.home_team]?.elevation_m || 0,
      avg_temp: wx.avg_temp, avg_precip: wx.avg_precip,
    });
    out.push({
      game_id: g.game_id,
      home_team: g.home_team, away_team: g.away_team,
      kickoff_local: new Date(g.kickoff_utc).toLocaleString(),
      ...p
    });
  }
  return NextResponse.json(out);
}
