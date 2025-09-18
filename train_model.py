import pandas as pd
import numpy as np
import datetime
from pathlib import Path
import joblib
from sklearn.model_selection import train_test_split
from lightgbm import LGBMRegressor, LGBMClassifier
import nfl_data_py as nfl

ART = Path(__file__).parent / "models"
ART.mkdir(exist_ok=True)

# 1. Pull historical data
def load_historical_data(start_year=2010, end_year=None):
    if not end_year:
        end_year = datetime.date.today().year - 1

    print(f"Loading schedules {start_year}–{end_year}")
    schedules = nfl.import_schedules(range(start_year, end_year + 1))
    schedules = schedules[schedules["game_type"] == "REG"]

    print("Loading advanced team stats")
    team_stats = nfl.import_team_desc(start_year, end_year)

    return schedules, team_stats

# 2. Feature builder
def build_features(schedules, team_stats):
    feats = []
    for _, g in schedules.iterrows():
        season = g["season"]
        week = g["week"]
        home = g["home_team"]
        away = g["away_team"]

        # Look back at last 5 games for each team
        recent_home = schedules[
            (schedules["season"] == season) &
            (schedules["week"] < week) &
            ((schedules["home_team"] == home) | (schedules["away_team"] == home))
        ].tail(5)
        recent_away = schedules[
            (schedules["season"] == season) &
            (schedules["week"] < week) &
            ((schedules["home_team"] == away) | (schedules["away_team"] == away))
        ].tail(5)

        feat = {
            "spread_line": g.get("spread_line", 0),
            "total_line": g.get("total_line", 45),
            "home_pts_avg": recent_home["home_score"].mean() if not recent_home.empty else 24,
            "away_pts_avg": recent_away["away_score"].mean() if not recent_away.empty else 23,
            "home_def_avg": recent_home["away_score"].mean() if not recent_home.empty else 23,
            "away_def_avg": recent_away["home_score"].mean() if not recent_away.empty else 24,
            "week": week,
            "season": season,
        }

        feats.append(feat)

    X = pd.DataFrame(feats)
    y_home = schedules["home_score"].fillna(24)
    y_away = schedules["away_score"].fillna(23)
    y_win = (schedules["home_score"] > schedules["away_score"]).astype(int)

    return X, y_home, y_away, y_win

# 3. Train models
def train_and_save():
    schedules, team_stats = load_historical_data(2010)

    X, y_home, y_away, y_win = build_features(schedules, team_stats)

    X_train, X_test, yh_train, yh_test, ya_train, ya_test, yw_train, yw_test = train_test_split(
        X, y_home, y_away, y_win, test_size=0.2, random_state=42
    )

    model_home = LGBMRegressor(n_estimators=200, learning_rate=0.05)
    model_away = LGBMRegressor(n_estimators=200, learning_rate=0.05)
    model_win = LGBMClassifier(n_estimators=200, learning_rate=0.05)

    model_home.fit(X_train, yh_train)
    model_away.fit(X_train, ya_train)
    model_win.fit(X_train, yw_train)

    joblib.dump({
        "home": model_home,
        "away": model_away,
        "win": model_win
    }, ART / "score_model.joblib")

    print("✅ Models trained and saved to models/score_model.joblib")

if __name__ == "__main__":
    train_and_save()
