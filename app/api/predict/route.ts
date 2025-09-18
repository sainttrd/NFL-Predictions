import { NextRequest, NextResponse } from "next/server";
import { STADIUMS } from "@/lib/stadiums";
import { predict } from "@/lib/model";

export async function GET(req:NextRequest){
  const { searchParams } = new URL(req.url);
  const home = (searchParams.get('home')||'').toUpperCase();
  const away = (searchParams.get('away')||'').toUpperCase();
  const s = STADIUMS[home];
  const p = predict({
    home, away,
    is_dome: s?.roof === 'dome',
    elevation_m: s?.elevation_m || 0,
  });
  return NextResponse.json({ game_id: `${away}@${home}`, home_team: home, away_team: away, ...p });
}
