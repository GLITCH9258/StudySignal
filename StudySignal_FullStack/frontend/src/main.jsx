import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./style.css";

const API = "http://127.0.0.1:5000";
function App() {
  const [summary, setSummary] = useState(null);
  const [preview, setPreview] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [x, setX] = useState("Study_Hours");
  const [y, setY] = useState("Marks");
  const [group, setGroup] = useState("Group_Study");
  const [uploadInfo, setUploadInfo] = useState("");

  useEffect(() => {
    fetch(`${API}/api/summary`).then(r => r.json()).then(setSummary)
      .catch(() => setError("Backend not connected. Start the Flask server, then refresh this page."));
    fetch(`${API}/api/data`).then(r => r.json()).then(d => setPreview(d.rows || [])).catch(() => {});
  }, []);

  async function runAnalysis(kind) {
    setError(""); setAnalysis(null);
    try {
      const params = new URLSearchParams(kind === "ttest" ? {group, value:y} : {x, y});
      const response = await fetch(`${API}/api/${kind}?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setAnalysis({kind, ...data});
    } catch (e) { setError(e.message); }
  }

  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData(); form.append("file", file);
    setError(""); setUploadInfo("");
    try {
      const r = await fetch(`${API}/api/upload`, {method:"POST", body:form});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed.");
      setUploadInfo(`${d.message} Rows: ${d.rows}; columns: ${d.columns}; missing values: ${d.missing_values}. Sample upload validation is complete; analysis controls currently use the included sample dataset.`);
    } catch (err) { setError(err.message); }
  }

  const numeric = summary?.numeric_columns || ["Study_Hours", "Marks"];
  const stats = summary?.descriptive_stats || {};
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><b>StudySignal</b><span>STATISTICAL LAB</span></div></div>
      <nav><a className="active" href="#overview">◫ &nbsp; Overview</a><a href="#dataset">▤ &nbsp; Dataset explorer</a><a href="#analysis">⌁ &nbsp; Statistical tests</a><a href="#regression">↗ &nbsp; Regression</a><a href="#about">ⓘ &nbsp; About project</a></nav>
      <div className="sidebar-foot"><span className="status-dot"></span> Local analysis workspace</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">STUDENT PERFORMANCE ANALYTICS</div><h1>Statistical inference dashboard</h1><p>Explore patterns in study habits and academic outcomes.</p></div><div className="avatar">SS</div></header>
      {error && <div className="alert">{error}</div>}
      <section id="overview" className="metrics">
        <Metric label="STUDENT RECORDS" value={summary?.rows ?? "—"} note="Rows in sample dataset"/>
        <Metric label="DATASET VARIABLES" value={summary?.columns ?? "—"} note="Features available"/>
        <Metric label="AVERAGE MARKS" value={summary?.mean_marks ?? "—"} note="Mean score"/>
        <Metric label="MISSING VALUES" value={summary?.missing_values ?? "—"} note="Across all columns"/>
      </section>
      <section className="grid two">
        <div className="panel">
          <div className="panel-head"><div><h2>Descriptive statistics</h2><p>Quick summary of numerical variables</p></div><span className="pill">SAMPLE DATA</span></div>
          <div className="table-wrap"><table><thead><tr><th>Variable</th><th>Mean</th><th>Median</th><th>Std. dev.</th></tr></thead><tbody>
            {Object.entries(stats).slice(0,7).map(([name,v])=><tr key={name}><td>{name.replaceAll("_"," ")}</td><td>{v.mean ?? "—"}</td><td>{v.median ?? "—"}</td><td>{v.std ?? "—"}</td></tr>)}
          </tbody></table></div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Dataset snapshot</h2><p>First rows from the included CSV</p></div></div>
          <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={preview.slice(0,8)}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="Student_ID" tick={{fontSize:10}}/><YAxis/><Tooltip/><Bar dataKey="Marks" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>
          <div className="footnote">Marks shown for the first 8 sample records.</div>
        </div>
      </section>
      <section id="dataset" className="panel section-gap">
        <div className="panel-head"><div><h2>Dataset explorer</h2><p>Upload a CSV to validate its structure and inspect basic quality checks.</p></div></div>
        <label className="upload-box"><span className="upload-icon">↑</span><span><b>Choose a CSV file</b><small>CSV format · up to 16 MB</small></span><input type="file" accept=".csv,text/csv" onChange={uploadFile}/></label>
        {uploadInfo && <div className="success">{uploadInfo}</div>}
        <div className="tag-row">{(summary?.column_names || []).map(c=><span className="tag" key={c}>{c}</span>)}</div>
      </section>
      <section id="analysis" className="panel section-gap">
        <div className="panel-head"><div><h2>Statistical testing</h2><p>Run exploratory tests against the bundled sample dataset.</p></div><span className="pill">SCIPY</span></div>
        <div className="form-grid">
          <label>First numerical variable<select value={x} onChange={e=>setX(e.target.value)}>{numeric.map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Second numerical variable<select value={y} onChange={e=>setY(e.target.value)}>{numeric.map(c=><option key={c}>{c}</option>)}</select></label>
        </div>
        <div className="button-row"><button onClick={()=>runAnalysis("correlation")}>Run Pearson & Spearman</button><label className="select-inline">Group variable <select value={group} onChange={e=>setGroup(e.target.value)}>{(summary?.column_names || []).filter(c=>!numeric.includes(c)).map(c=><option key={c}>{c}</option>)}</select></label><button className="secondary" onClick={()=>runAnalysis("ttest")}>Run Welch t-test</button></div>
        {analysis && analysis.kind !== "regression" && <Result data={analysis}/>}
      </section>
      <section id="regression" className="panel section-gap">
        <div className="panel-head"><div><h2>Linear regression</h2><p>Fit an exploratory linear model and review its metrics.</p></div><span className="pill">SCIKIT-LEARN</span></div>
        <div className="form-grid"><label>Predictor variable<select value={x} onChange={e=>setX(e.target.value)}>{numeric.map(c=><option key={c}>{c}</option>)}</select></label><label>Target variable<select value={y} onChange={e=>setY(e.target.value)}>{numeric.map(c=><option key={c}>{c}</option>)}</select></label></div>
        <button onClick={()=>runAnalysis("regression")}>Run regression</button>
        {analysis?.kind === "regression" && <Result data={analysis}/>}
      </section>
      <section id="about" className="about section-gap"><div><div className="eyebrow">ABOUT STUDYSIGNAL</div><h2>Turning student data into useful evidence.</h2><p>StudySignal is an educational statistical inference project demonstrating descriptive statistics, correlation analysis, hypothesis testing, and regression using a student lifestyle dataset.</p></div><div className="about-stack"><span>React frontend</span><span>Flask REST API</span><span>Pandas · SciPy · Scikit-learn</span></div></section>
      <footer>StudySignal · Academic project prototype · Results are exploratory and should be interpreted with the study design in mind.</footer>
    </main>
  </div>;
}

function Metric({label,value,note}) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Result({data}) {
  const entries = data.kind === "correlation"
    ? [["Pearson r",data.pearson_r],["Pearson p-value",Number(data.pearson_p).toExponential(3)],["Spearman ρ",data.spearman_rho],["Spearman p-value",Number(data.spearman_p).toExponential(3)]]
    : data.kind === "ttest"
    ? [["t statistic",data.t_statistic],["p-value",Number(data.p_value).toExponential(3)],["Group 1 mean",data.mean_1],["Group 2 mean",data.mean_2]]
    : [["Slope",data.slope],["Intercept",data.intercept],["MAE",data.mae],["RMSE",data.rmse],["R²",data.r2]];
  return <div className="result-box"><div className="result-grid">{entries.map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div><p>{data.interpretation || data.note}</p></div>;
}
createRoot(document.getElementById("root")).render(<App/>);
