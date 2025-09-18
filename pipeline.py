import pandas as pd
import datetime
from pathlib import Path
import joblib
import nfl_data_py as nfl

ART = Path(__file__).parent / "models"
ART.mkdir(exist_ok=True)

# ======================
# Load or train artifacts
# ======================
def ensure_model():
    model_path = ART / "score_model.joblib"
    if not model_path.exists():
        raise RuntimeError("❌ No trained model found. Run train_model.py first.")
    return joblib.load(model_path)

# ======================
# Predictions for a week
# ======================
def predict_week(season: int, week: int) -> pd.DataFrame:
    model = ensure_model()

    # Get schedule for that week
    games = nfl.import_schedules([season])
    games = games[(games["season"] == season) & (games["week"] == week) & (games["game_type"] == "REG")]

    if games.empty:
        return pd.DataFrame()

    # Build a simple feature set (can expand with weather/injuries later)
    feats = []
    for _, g in games.iterrows():
        home, away = g["home_team"], g["away_team"]

        feats.append({
            "spread_line": g.get("spread_line", 0),
            "total_line": g.get("total_line", 45),
            "home_pts_avg": 24,  # placeholder until we compute rolling avgs
            "away_pts_avg": 23,
            "home_def_avg": 23,
            "away_def_avg": 24,
            "week": g["week"],
            "season": g["season"],
        })

    X = pd.DataFrame(feats)

    # Run predictions
    exp_home = model["home"].predict(X)
    exp_away = model["away"].predict(X)
    p_home_win = model["win"].predict_proba(X)[:, 1]

    out = pd.DataFrame({
        "game_id": games["game_id"],
        "home_team": games["home_team"],
        "away_team": games["away_team"],
        "exp_home_pts": exp_home.round().astype(int),
        "exp_away_pts": exp_away.round().astype(int),
        "p_home_win": p_home_win
    })

    # Confidence labels
    out["confidence"] = out["p_home_win"].apply(
        lambda x: "High" if abs(x - 0.5) > 0.3 else "Med" if abs(x - 0.5) > 0.1 else "Low"
    )

    return out

# ======================
# Prediction for one matchup
# ======================
def predict_matchup(home: str, away: str, season: int, week: int):
    df = predict_week(season, week)
    row = df[(df["home_team"] == home) & (df["away_team"] == away)]
    if row.empty:
        return {
            "game_id": "N/A",
            "home_team": home,
            "away_team": away,
            "exp_home_pts": 24,
            "exp_away_pts": 23,
            "p_home_win": 0.5,
            "confidence": "Low",
        }
    return row.to_dict(orient="records")[0]
