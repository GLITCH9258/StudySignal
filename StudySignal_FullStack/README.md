# StudySignal — Full-Stack Statistical Inference

StudySignal is a student-performance analytics web application with a **React frontend** and a **Python Flask REST API**. It demonstrates descriptive statistics, Pearson/Spearman correlation, Welch's independent-samples t-test, and simple linear regression using a bundled sample CSV dataset.

## Project structure

- `frontend/` — React + Vite dashboard
- `backend/` — Flask API and statistical calculations
- `dataset/` — bundled student dataset
- `notebooks/` — original statistical inference notebook
- `StudySignal_Project_Report.pdf` — original report (update it if your submission requires documentation of the new full-stack architecture)

## Requirements

- Python 3.10+
- Node.js 18+ and npm

## Run the backend

Open a terminal in the project folder:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**
```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

**Windows Command Prompt**
```bat
.venv\Scripts\activate.bat
pip install -r requirements.txt
python app.py
```

**Linux/macOS**
```bash
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API runs at `http://127.0.0.1:5000`.

## Run the frontend

Open a **second terminal** in the project folder:

```bash
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://127.0.0.1:5173`).

## API routes

- `GET /api/health` — backend health check
- `GET /api/summary` — dataset summary and descriptive statistics
- `GET /api/data` — preview sample rows
- `POST /api/upload` — validate a CSV upload and return a preview
- `GET /api/correlation?x=Study_Hours&y=Marks` — Pearson and Spearman correlation
- `GET /api/ttest?group=Group_Study&value=Marks` — Welch t-test for a two-group variable
- `GET /api/regression?x=Study_Hours&y=Marks` — simple linear regression metrics

## Notes

- CSV upload currently validates and previews the uploaded dataset; the analysis controls use the bundled sample dataset.
- Regression metrics are calculated on all available rows for demonstration, not on a held-out test set.
- This is an educational prototype. Statistical significance does not establish causation.
- The dataset is synthetic/sample data and should be described that way in academic submissions.
