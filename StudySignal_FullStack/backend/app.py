from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "dataset" / "studysignal_student_dataset.csv"

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

def load_data(upload=None):
    if upload is not None:
        df = pd.read_csv(upload)
    else:
        df = pd.read_csv(DEFAULT_DATA)
    df.columns = [str(c).strip() for c in df.columns]
    return df

def numeric_columns(df):
    return df.select_dtypes(include=[np.number]).columns.tolist()

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "app": "StudySignal API"})

@app.get("/api/summary")
def summary():
    df = load_data()
    nums = numeric_columns(df)
    stats_map = {}
    for col in nums:
        s = df[col].dropna()
        stats_map[col] = {
            "mean": round(float(s.mean()), 3) if len(s) else None,
            "median": round(float(s.median()), 3) if len(s) else None,
            "std": round(float(s.std()), 3) if len(s) > 1 else None
        }
    marks = df["Marks"].dropna() if "Marks" in df else pd.Series(dtype=float)
    return jsonify({
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_names": df.columns.tolist(),
        "numeric_columns": nums,
        "missing_values": int(df.isna().sum().sum()),
        "descriptive_stats": stats_map,
        "mean_marks": round(float(marks.mean()), 2) if len(marks) else None,
        "pass_rate": round(float((df["Pass_Status"].astype(str).str.lower() == "pass").mean() * 100), 2)
                     if "Pass_Status" in df else None
    })

@app.get("/api/data")
def data_preview():
    df = load_data()
    return jsonify({"columns": df.columns.tolist(), "rows": df.head(12).replace({np.nan: None}).to_dict(orient="records")})

@app.post("/api/upload")
def upload():
    file = request.files.get("file")
    if not file or not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Please upload a CSV file."}), 400
    try:
        df = load_data(file)
        nums = numeric_columns(df)
        return jsonify({
            "message": "CSV validated successfully. This upload is analyzed for this request only.",
            "rows": int(len(df)), "columns": int(len(df.columns)),
            "column_names": df.columns.tolist(), "numeric_columns": nums,
            "missing_values": int(df.isna().sum().sum()),
            "preview": df.head(8).replace({np.nan: None}).to_dict(orient="records")
        })
    except Exception as exc:
        return jsonify({"error": f"Could not read CSV: {exc}"}), 400

@app.get("/api/correlation")
def correlation():
    df = load_data()
    x = request.args.get("x", "Study_Hours")
    y = request.args.get("y", "Marks")
    if x not in df.columns or y not in df.columns:
        return jsonify({"error": "Choose columns that exist in the sample dataset."}), 400
    pair = df[[x, y]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(pair) < 3 or pair[x].nunique() < 2 or pair[y].nunique() < 2:
        return jsonify({"error": "At least three valid rows with variation in both columns are required."}), 400
    r, p = stats.pearsonr(pair[x], pair[y])
    rho, sp = stats.spearmanr(pair[x], pair[y])
    return jsonify({
        "x": x, "y": y, "n": int(len(pair)),
        "pearson_r": round(float(r), 4), "pearson_p": float(p),
        "spearman_rho": round(float(rho), 4), "spearman_p": float(sp),
        "interpretation": ("positive" if r > 0 else "negative" if r < 0 else "no linear") +
                          " linear association; " + ("statistically significant at 0.05." if p < 0.05 else "not statistically significant at 0.05.")
    })

@app.get("/api/ttest")
def ttest():
    df = load_data()
    group = request.args.get("group", "Group_Study")
    value = request.args.get("value", "Marks")
    if group not in df.columns or value not in df.columns:
        return jsonify({"error": "Selected columns are not present."}), 400
    groups = df[group].dropna().unique().tolist()
    if len(groups) != 2:
        return jsonify({"error": f"Independent t-test needs exactly two groups. Found {len(groups)}."}), 400
    a = pd.to_numeric(df.loc[df[group] == groups[0], value], errors="coerce").dropna()
    b = pd.to_numeric(df.loc[df[group] == groups[1], value], errors="coerce").dropna()
    if len(a) < 2 or len(b) < 2:
        return jsonify({"error": "Each group needs at least two valid numeric observations."}), 400
    result = stats.ttest_ind(a, b, equal_var=False)
    return jsonify({
        "group_column": group, "value_column": value,
        "group_1": str(groups[0]), "n_1": len(a), "mean_1": round(float(a.mean()), 3),
        "group_2": str(groups[1]), "n_2": len(b), "mean_2": round(float(b.mean()), 3),
        "t_statistic": round(float(result.statistic), 4), "p_value": float(result.pvalue),
        "interpretation": "Statistically significant difference at 0.05." if result.pvalue < 0.05 else "No statistically significant difference at 0.05."
    })

@app.get("/api/regression")
def regression():
    df = load_data()
    x_col = request.args.get("x", "Study_Hours")
    y_col = request.args.get("y", "Marks")
    if x_col not in df.columns or y_col not in df.columns:
        return jsonify({"error": "Selected columns are not present."}), 400
    pair = df[[x_col, y_col]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(pair) < 5:
        return jsonify({"error": "At least five valid observations are required."}), 400
    X = pair[[x_col]].to_numpy()
    y = pair[y_col].to_numpy()
    model = LinearRegression().fit(X, y)
    pred = model.predict(X)
    return jsonify({
        "x": x_col, "y": y_col, "n": len(pair),
        "intercept": round(float(model.intercept_), 4),
        "slope": round(float(model.coef_[0]), 4),
        "mae": round(float(mean_absolute_error(y, pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y, pred))), 4),
        "r2": round(float(r2_score(y, pred)), 4),
        "note": "Metrics are calculated on the available rows for an exploratory demonstration, not a held-out test set."
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
