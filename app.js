
const DB_PATIENTS = [
  {
    id:"PT-10001", username:"priya1", password:"pass1", name:"Priya Sharma", age:38, gender:"Female", insurer:"UnitedHealth",
    policyNo:"POL-100001", memberId:"MEM-2001", deductible:1000, deductibleMet:800, copay:20,
    primaryDiagnosis:{name:"Type 2 Diabetes", icd10:"E11.9", category:"Endocrine"},
    diagnosisSeverity:"Moderate", disease:{comorbidities:["Hypertension","Obesity"]},
    requestedProcedure:{code:"99213", name:"Office Visit", requiresAuth:false, avgCost:150},
    billedAmount:145, riskScore:32, flagged:false, allergies:["None"], authStatus:"APPROVED",
    vitals:{bp:"126/82", pulse:"76 bpm", temp:"36.8°C", bmi:"25.8", spo2:"98%"},
    claimHistory:[{claimId:"CLM-101", status:"PAID", cpt:"99213"}]
  },
  {
    id:"PT-10002", username:"arjun2", password:"pass2", name:"Arjun Patel", age:51, gender:"Male", insurer:"Cigna",
    policyNo:"POL-100002", memberId:"MEM-2002", deductible:1500, deductibleMet:220, copay:30,
    primaryDiagnosis:{name:"Low Back Pain", icd10:"M54.5", category:"Musculoskeletal"},
    diagnosisSeverity:"Mild", disease:{comorbidities:["Obesity","Spondylosis"]},
    requestedProcedure:{code:"70553", name:"MRI Brain w/ Contrast", requiresAuth:true, avgCost:2800},
    billedAmount:2950, riskScore:58, flagged:false, allergies:["Penicillin"], authStatus:"PENDING",
    vitals:{bp:"132/88", pulse:"82 bpm", temp:"36.7°C", bmi:"29.4", spo2:"97%"},
    claimHistory:[{claimId:"CLM-102", status:"DENIED", cpt:"70553"}]
  },
  {
    id:"PT-10003", username:"meera3", password:"pass3", name:"Meera Iyer", age:44, gender:"Female", insurer:"Aetna",
    policyNo:"POL-100003", memberId:"MEM-2003", deductible:1200, deductibleMet:1200, copay:25,
    primaryDiagnosis:{name:"Essential Hypertension", icd10:"I10", category:"Cardiovascular"},
    diagnosisSeverity:"Moderate", disease:{comorbidities:["Diabetes","CKD"]},
    requestedProcedure:{code:"93306", name:"Echocardiogram", requiresAuth:true, avgCost:1200},
    billedAmount:1180, riskScore:41, flagged:false, allergies:["None"], authStatus:"APPROVED",
    vitals:{bp:"138/90", pulse:"79 bpm", temp:"36.6°C", bmi:"27.2", spo2:"99%"},
    claimHistory:[{claimId:"CLM-103", status:"APPROVED", cpt:"93306"}]
  },
  {
    id:"PT-10004", username:"rohan4", password:"pass4", name:"Rohan Reddy", age:63, gender:"Male", insurer:"Humana",
    policyNo:"POL-100004", memberId:"MEM-2004", deductible:2000, deductibleMet:300, copay:40,
    primaryDiagnosis:{name:"Chronic Kidney Disease", icd10:"N18.3", category:"Nephrology"},
    diagnosisSeverity:"Severe", disease:{comorbidities:["Hypertension","Diabetes"]},
    requestedProcedure:{code:"45378", name:"Colonoscopy", requiresAuth:true, avgCost:2100},
    billedAmount:2400, riskScore:77, flagged:true, allergies:["Sulfa"], authStatus:"DENIED",
    vitals:{bp:"146/94", pulse:"86 bpm", temp:"37.0°C", bmi:"31.1", spo2:"96%"},
    claimHistory:[{claimId:"CLM-104", status:"PENDING", cpt:"45378"}]
  }
];

const ADMIN_USER = {username:"admin", password:"admin123", role:"admin"};
let state = {
  view:"login",
  role:"admin",
  currentUser:null,
  currentPage:"dashboard",
  activePatient: DB_PATIENTS[0],
  authResult:null,
  claimResult:null,
  steps:[],
  auditLog:[
    {type:"AUTH", patient:"Priya Sharma", decision:"APPROVED", confidence:97, timestamp:new Date().toLocaleString()},
    {type:"CLAIM", patient:"Meera Iyer", decision:"PARTIAL", confidence:82, timestamp:new Date().toLocaleString()}
  ]
};

function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

function runPriorAuth(p) {
  const highRisk = p.riskScore > 65;
  const requiresAuth = p.requestedProcedure.requiresAuth;
  const severe = p.diagnosisSeverity === "Severe";
  const comorbCount = p.disease.comorbidities.filter(c => c !== "None").length;
  let decision, confidence, appeal;
  if (!requiresAuth) {
    decision = "APPROVED"; confidence = 97; appeal = "No prior authorization required for this CPT.";
  } else if (severe && comorbCount >= 2) {
    decision = "APPROVED"; confidence = 88; appeal = "No appeal needed.";
  } else if (highRisk && p.deductibleMet < p.deductible * 0.3) {
    decision = "NEEDS REVIEW"; confidence = 62; appeal = "Submit detailed clinical notes and physician letter.";
  } else if (!severe && !highRisk && p.insurer === "Cigna") {
    decision = "DENIED"; confidence = 74; appeal = "File Level 1 appeal with supporting ICD documentation.";
  } else {
    decision = "APPROVED"; confidence = 84; appeal = "No appeal needed.";
  }
  const reasoning =
`1. Medical Necessity: Patient presents with ${p.primaryDiagnosis.name} (${p.primaryDiagnosis.icd10}), severity ${p.diagnosisSeverity}.
2. CPT–ICD Alignment: Procedure ${p.requestedProcedure.code} (${p.requestedProcedure.name}) was evaluated against diagnosis context.
3. Payer Policy: ${p.insurer} plan details and deductible status were considered.
4. Risk Review: Risk score ${p.riskScore}/100 and comorbidity profile were included.
5. Outcome: ${decision} with confidence ${confidence}%.`;
  return {decision, confidence, reasoning, appeal};
}

function runClaims(p) {
  const billed = p.billedAmount;
  const highFraud = p.flagged || p.riskScore > 72;
  const bundling = p.requestedProcedure.code === "27447" || p.requestedProcedure.code === "93306";
  let decision, allowed, notes;
  if (highFraud) {
    decision = "NEEDS REVIEW"; allowed = Math.round(billed * 0.6);
    notes = "Elevated fraud indicators require manual review.";
  } else if (bundling) {
    decision = "PARTIAL"; allowed = Math.round(billed * 0.78);
    notes = "Bundling rule applied. Partial reimbursement issued.";
  } else if (p.deductibleMet < p.deductible) {
    const gap = p.deductible - p.deductibleMet;
    decision = "APPROVED"; allowed = Math.max(0, Math.round(billed * 0.85) - gap);
    notes = `Deductible gap of $${gap} applied.`;
  } else {
    decision = "APPROVED"; allowed = Math.round(billed * 0.85);
    notes = "Claim adjudicated at contracted rate.";
  }
  return {decision, allowed, notes};
}

function statusClass(status){
  const s = status.toUpperCase();
  if (s.includes("APPROVED") || s==="PARTIAL") return "approved";
  if (s.includes("DENIED")) return "denied";
  return "review";
}

function init(){
  render();
}

function render(){
  const app = document.getElementById("app");
  if(state.view === "login"){
    app.innerHTML = loginView();
    bindLogin();
    return;
  }
  app.innerHTML = appShell();
  bindShell();
  renderPage();
}

function loginView(){
  return `
  <div class="login-wrap">
    <div class="login-box">
      <div class="login-logo">ClearPath AI</div>
      <div class="login-sub">Healthcare Revenue Cycle Platform</div>
      <div class="login-tabs">
        <button class="ltab ${state.role==="admin"?"active":""}" data-role="admin">Admin</button>
        <button class="ltab ${state.role==="patient"?"active":""}" data-role="patient">Patient / Client</button>
      </div>
      <div class="hint">
        ${state.role==="admin"
          ? 'Username: <b>admin</b> &nbsp; Password: <b>admin123</b>'
          : 'Try <b>priya1/pass1</b>, <b>arjun2/pass2</b>, <b>meera3/pass3</b>, <b>rohan4/pass4</b>'}
      </div>
      <div class="field">
        <label>Username</label>
        <input id="username" placeholder="${state.role==="admin"?"admin":"e.g. priya1"}">
      </div>
      <div class="field">
        <label>Password</label>
        <input id="password" type="password" placeholder="••••••••">
      </div>
      <div id="loginErr" class="err hidden">Invalid credentials.</div>
      <button class="btn btn-primary" style="width:100%" id="loginBtn">Sign in</button>
    </div>
  </div>`;
}

function appShell(){
  const user = state.currentUser;
  const isAdmin = user.role === "admin";
  return `
  <div class="app">
    <aside class="sidebar">
      <div class="logo">
        <h1>ClearPath AI</h1>
        <p>Decision Intelligence Platform</p>
      </div>
      <div class="nav">
        <div class="nav-section">Workspace</div>
        <div class="nav-item ${state.currentPage==="dashboard"?"active":""}" data-page="dashboard">Overview</div>
        <div class="nav-item ${state.currentPage==="auth"?"active":""}" data-page="auth">Prior Authorization</div>
        <div class="nav-item ${state.currentPage==="claims"?"active":""}" data-page="claims">Claims Adjudication</div>
        <div class="nav-item ${state.currentPage==="audit"?"active":""}" data-page="audit">Audit Trail</div>
        <div class="nav-item ${state.currentPage==="simulation"?"active":""}" data-page="simulation">Policy Simulation</div>
        ${isAdmin ? '<div class="nav-item '+(state.currentPage==="patients"?"active":"")+'" data-page="patients">Patient Profiles</div>' : ''}
      </div>
      <div class="userbox">
        <div class="userchip">
          <div class="avatar">${isAdmin ? "A" : user.name.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
          <div>
            <div class="uname">${escapeHtml(isAdmin ? "Admin User" : user.name)}</div>
            <div class="urole">${isAdmin ? "Administrator" : "Patient Portal"}</div>
          </div>
        </div>
        <button class="btn btn-secondary" style="width:100%" id="logoutBtn">Log out</button>
      </div>
    </aside>
    <main class="main">
      <div class="topbar">
        <div class="page-title">${pageTitle(state.currentPage)}</div>
        <div class="status-live"><span class="dot"></span>Live Prototype</div>
      </div>
      <div class="content" id="pageContent"></div>
    </main>
  </div>`;
}

function pageTitle(page){
  return ({
    dashboard:"Overview",
    auth:"Prior Authorization",
    claims:"Claims Adjudication",
    audit:"Audit Trail",
    simulation:"Policy Simulation",
    patients:"Patient Profiles"
  })[page] || "Overview";
}

function getVisiblePatients(){
  if(state.currentUser.role === "admin") return DB_PATIENTS;
  return DB_PATIENTS.filter(p => p.username === state.currentUser.username);
}

function patientSelector(){
  const pts = getVisiblePatients();
  return `
  <div class="patient-selector">
    <div class="card-title">Patient Context <span class="kicker">${pts.length} available</span></div>
    <input class="search" id="patientSearch" placeholder="Search by patient name, ID, or insurer">
    <div class="chips" id="patientChips">
      ${pts.map(p => `<button class="chip ${state.activePatient.id===p.id?"active":""}" data-patient="${p.id}">${escapeHtml(p.name)} · ${p.id}</button>`).join("")}
    </div>
  </div>`;
}

function patientProfileCard(p){
  return `
  <div class="card">
    <div class="card-title">Patient Summary <span class="kicker">${p.id}</span></div>
    <div class="grid2">
      <div>
        <div style="font-size:1rem;font-weight:800">${escapeHtml(p.name)}</div>
        <div class="small">${p.age} years · ${p.gender} · ${escapeHtml(p.insurer)}</div>
        <div class="tag-row">
          <span class="tag blue">${escapeHtml(p.primaryDiagnosis.name)}</span>
          <span class="tag amber">${escapeHtml(p.requestedProcedure.code)} · ${escapeHtml(p.requestedProcedure.name)}</span>
          ${p.flagged ? '<span class="tag red">Flagged</span>' : '<span class="tag green">Low anomaly profile</span>'}
        </div>
      </div>
      <div>
        <div class="small">Risk Score</div>
        <div style="font-size:1.2rem;font-weight:800;margin:6px 0">${p.riskScore}/100</div>
        <div class="progress"><div style="width:${p.riskScore}%"></div></div>
      </div>
    </div>
    <div class="kv" style="margin-top:12px">
      <div class="kv-item"><div class="kv-key">ICD-10</div><div class="kv-val">${escapeHtml(p.primaryDiagnosis.icd10)}</div></div>
      <div class="kv-item"><div class="kv-key">Severity</div><div class="kv-val">${escapeHtml(p.diagnosisSeverity)}</div></div>
      <div class="kv-item"><div class="kv-key">Policy Number</div><div class="kv-val">${escapeHtml(p.policyNo)}</div></div>
      <div class="kv-item"><div class="kv-key">Member ID</div><div class="kv-val">${escapeHtml(p.memberId)}</div></div>
      <div class="kv-item"><div class="kv-key">Deductible</div><div class="kv-val">$${p.deductible}</div></div>
      <div class="kv-item"><div class="kv-key">Deductible Met</div><div class="kv-val">$${p.deductibleMet}</div></div>
    </div>
  </div>`;
}

function dashboardPage(){
  const pts = getVisiblePatients();
  const approvals = pts.filter(p => p.status==="APPROVED").length;
  const review = pts.filter(p => p.status==="NEEDS_REVIEW").length;
  const denied = pts.filter(p => p.status==="DENIED").length;
  return `
    ${state.currentUser.role==="admin" ? patientSelector() : ""}
    ${patientProfileCard(state.activePatient)}
    <div class="grid4">
      <div class="stat"><div class="label">Authorization Turnaround</div><div class="value green">↓ 80%</div><div class="small">Days to hours</div></div>
      <div class="stat"><div class="label">First-Pass Success</div><div class="value accent">↑ 35%</div><div class="small">Fewer avoidable denials</div></div>
      <div class="stat"><div class="label">Manual Review Load</div><div class="value amber">↓ 60%</div><div class="small">Routine decisions automated</div></div>
      <div class="stat"><div class="label">Audit Readiness</div><div class="value green">100%</div><div class="small">Structured decision trail</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-title">Live Portfolio Snapshot</div>
        <div class="feed-item"><div class="feed-dot" style="background:var(--gr)"></div><div><b>${approvals}</b> approved cases in current sample</div></div>
        <div class="feed-item"><div class="feed-dot" style="background:var(--am)"></div><div><b>${review}</b> cases routed for review</div></div>
        <div class="feed-item"><div class="feed-dot" style="background:var(--re)"></div><div><b>${denied}</b> denials requiring escalation path</div></div>
      </div>
      <div class="card">
        <div class="card-title">Prototype Scope</div>
        <div class="feed-item"><div class="feed-dot" style="background:var(--ac)"></div><div>Prior authorization workflow</div></div>
        <div class="feed-item"><div class="feed-dot" style="background:var(--a2)"></div><div>Claims adjudication pathway</div></div>
        <div class="feed-item"><div class="feed-dot" style="background:var(--gr)"></div><div>Explainability and structured reasoning</div></div>
        <div class="feed-item"><div class="feed-dot" style="background:var(--am)"></div><div>Policy simulation and impact preview</div></div>
      </div>
    </div>`;
}

function authPage(){
  const p = state.activePatient;
  return `
    ${state.currentUser.role==="admin" ? patientSelector() : ""}
    ${patientProfileCard(p)}
    <div class="card">
      <div class="card-title">Prior Authorization Workflow</div>
      <div class="actions">
        <button class="btn btn-primary" id="runAuthBtn">Run Authorization</button>
        <button class="btn btn-secondary" id="resetAuthBtn">Reset</button>
      </div>
    </div>
    ${state.steps.length ? `<div class="steps">${state.steps.map(s=>`<div class="step ${s.done?'done':'run'}"><span>${s.done?'✓':'›'}</span><span>${escapeHtml(s.text)}</span></div>`).join("")}</div>`:""}
    ${state.authResult ? `
      <div class="result">
        <div class="card-title">Authorization Result</div>
        <div class="status-pill ${statusClass(state.authResult.decision)}">${escapeHtml(state.authResult.decision)}</div>
        <div style="margin-top:10px;font-weight:700">Confidence: ${state.authResult.confidence}%</div>
        <div class="progress" style="margin:8px 0 14px"><div style="width:${state.authResult.confidence}%"></div></div>
        <div class="small" style="margin-bottom:8px"><b>Appeal Pathway:</b> ${escapeHtml(state.authResult.appeal)}</div>
        <div class="reasoning">${escapeHtml(state.authResult.reasoning)}</div>
      </div>
    ` : ""}`;
}

function claimsPage(){
  const p = state.activePatient;
  return `
    ${state.currentUser.role==="admin" ? patientSelector() : ""}
    ${patientProfileCard(p)}
    <div class="card">
      <div class="card-title">Claims Adjudication Workflow</div>
      <div class="actions">
        <button class="btn btn-primary" id="runClaimBtn">Run Adjudication</button>
        <button class="btn btn-secondary" id="resetClaimBtn">Reset</button>
      </div>
    </div>
    ${state.claimResult ? `
      <div class="result">
        <div class="card-title">Claim Outcome</div>
        <div class="status-pill ${statusClass(state.claimResult.decision)}">${escapeHtml(state.claimResult.decision)}</div>
        <div style="margin-top:10px;font-weight:700">Allowed Amount: $${state.claimResult.allowed.toLocaleString()}</div>
        <div class="small" style="margin-top:8px">${escapeHtml(state.claimResult.notes)}</div>
        <div class="card" style="margin-top:14px;margin-bottom:0">
          <div class="card-title">Recent Claim History</div>
          <table class="table">
            <thead><tr><th>Claim ID</th><th>Status</th><th>CPT</th></tr></thead>
            <tbody>${p.claimHistory.map(c=>`<tr><td>${escapeHtml(c.claimId)}</td><td>${escapeHtml(c.status)}</td><td>${escapeHtml(c.cpt)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    ` : ""}`;
}

function auditPage(){
  return `
    <div class="card">
      <div class="card-title">Immutable Audit Trail <span class="kicker">${state.auditLog.length} entries</span></div>
      ${state.auditLog.slice().reverse().map((a,i)=>`
        <div class="audit-item">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div><b>${escapeHtml(a.type)}</b> · ${escapeHtml(a.patient)}</div>
            <div class="small">${escapeHtml(a.timestamp)}</div>
          </div>
          <div style="margin-top:6px">
            <span class="status-pill ${statusClass(a.decision)}">${escapeHtml(a.decision)}</span>
            <span class="small" style="margin-left:8px">Confidence ${a.confidence}%</span>
          </div>
        </div>
      `).join("")}
    </div>`;
}

function simulationPage(){
  const scenarios = [
    {title:"Prior auth threshold change", before:"Sessions > 8 require auth", after:"Sessions > 12 require auth", impact:"+42% auto-approvals"},
    {title:"Imaging documentation update", before:"Standard notes accepted", after:"Detailed physician notes required", impact:"-18% immediate approval rate"},
    {title:"Appeal handling revision", before:"Manual review in 14 days", after:"Structured review in 24 hours", impact:"+63% recovery rate"},
    {title:"Telehealth modifier expansion", before:"Limited billing support", after:"Expanded eligible visit set", impact:"+12% throughput"}
  ];
  return `
    <div class="banner">
      <div style="font-size:1.1rem;font-weight:800;margin-bottom:6px">Policy Simulation Engine</div>
      <div class="small">Preview the operational effect of rule changes before rollout.</div>
    </div>
    <div class="sim-grid">
      ${scenarios.map(s=>`
        <div class="sim-card">
          <div class="card-title" style="margin-bottom:8px">${escapeHtml(s.title)}</div>
          <div class="small"><b>Before:</b> ${escapeHtml(s.before)}</div>
          <div class="small" style="margin-top:6px"><b>After:</b> ${escapeHtml(s.after)}</div>
          <div style="margin-top:10px;font-size:1rem;font-weight:800" class="amber">${escapeHtml(s.impact)}</div>
        </div>
      `).join("")}
    </div>`;
}

function patientsPage(){
  const pts = getVisiblePatients();
  return `
    <div class="card">
      <div class="card-title">Patient Profiles</div>
      <table class="table">
        <thead><tr><th>Patient</th><th>ID</th><th>Insurer</th><th>Diagnosis</th><th>Risk</th><th>Status</th></tr></thead>
        <tbody>
          ${pts.map(p=>`
            <tr data-patient-row="${p.id}">
              <td>${escapeHtml(p.name)}</td>
              <td>${escapeHtml(p.id)}</td>
              <td>${escapeHtml(p.insurer)}</td>
              <td>${escapeHtml(p.primaryDiagnosis.name)}</td>
              <td>${p.riskScore}</td>
              <td>${escapeHtml(p.status)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderPage(){
  const container = document.getElementById("pageContent");
  const page = state.currentPage;
  container.innerHTML = (
    page==="dashboard" ? dashboardPage() :
    page==="auth" ? authPage() :
    page==="claims" ? claimsPage() :
    page==="audit" ? auditPage() :
    page==="simulation" ? simulationPage() :
    page==="patients" ? patientsPage() :
    dashboardPage()
  );
  bindDynamic();
}

function bindLogin(){
  document.querySelectorAll(".ltab").forEach(btn=>{
    btn.onclick = ()=>{ state.role = btn.dataset.role; render(); };
  });
  document.getElementById("loginBtn").onclick = login;
  document.getElementById("password").addEventListener("keydown", e => { if(e.key==="Enter") login(); });
}

function login(){
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  let user = null;
  if(state.role==="admin"){
    if(u===ADMIN_USER.username && p===ADMIN_USER.password) user = {role:"admin", username:"admin", name:"Admin User"};
  } else {
    const pt = DB_PATIENTS.find(x => x.username===u && x.password===p);
    if(pt) user = {role:"patient", username:pt.username, name:pt.name};
  }
  if(!user){
    document.getElementById("loginErr").classList.remove("hidden");
    return;
  }
  state.currentUser = user;
  state.view = "app";
  state.currentPage = "dashboard";
  state.activePatient = user.role==="admin" ? DB_PATIENTS[0] : DB_PATIENTS.find(x=>x.username===user.username);
  state.authResult = null; state.claimResult = null; state.steps = [];
  render();
}

function bindShell(){
  document.querySelectorAll(".nav-item").forEach(item=>{
    item.onclick = ()=>{
      state.currentPage = item.dataset.page;
      render();
    };
  });
  document.getElementById("logoutBtn").onclick = ()=>{
    state.view = "login";
    state.currentUser = null;
    state.authResult = null;
    state.claimResult = null;
    state.steps = [];
    render();
  };
}

function bindDynamic(){
  const search = document.getElementById("patientSearch");
  if(search){
    search.addEventListener("input", ()=>{
      const q = search.value.toLowerCase();
      document.querySelectorAll("#patientChips .chip").forEach(chip=>{
        chip.style.display = chip.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }
  document.querySelectorAll("[data-patient]").forEach(btn=>{
    btn.onclick = ()=>{
      const p = DB_PATIENTS.find(x=>x.id===btn.dataset.patient);
      state.activePatient = p;
      state.authResult = null; state.claimResult = null; state.steps = [];
      render();
    };
  });
  document.querySelectorAll("[data-patient-row]").forEach(row=>{
    row.onclick = ()=>{
      const p = DB_PATIENTS.find(x=>x.id===row.dataset.patientRow);
      state.activePatient = p;
      state.currentPage = "dashboard";
      render();
    };
  });
  const runAuthBtn = document.getElementById("runAuthBtn");
  if(runAuthBtn){
    runAuthBtn.onclick = ()=>{
      state.steps = [
        {text:"Loading patient context and payer profile", done:true},
        {text:"Checking medical necessity and CPT–ICD alignment", done:true},
        {text:"Evaluating payer policy constraints", done:true},
        {text:"Scoring risk and documentation signals", done:true},
        {text:"Generating authorization decision", done:false}
      ];
      state.authResult = runPriorAuth(state.activePatient);
      state.steps[state.steps.length-1].done = true;
      state.auditLog.push({
        type:"AUTH",
        patient:state.activePatient.name,
        decision:state.authResult.decision,
        confidence:state.authResult.confidence,
        timestamp:new Date().toLocaleString()
      });
      renderPage();
    };
  }
  const resetAuthBtn = document.getElementById("resetAuthBtn");
  if(resetAuthBtn) resetAuthBtn.onclick = ()=>{ state.authResult = null; state.steps=[]; renderPage(); };

  const runClaimBtn = document.getElementById("runClaimBtn");
  if(runClaimBtn){
    runClaimBtn.onclick = ()=>{
      state.claimResult = runClaims(state.activePatient);
      state.auditLog.push({
        type:"CLAIM",
        patient:state.activePatient.name,
        decision:state.claimResult.decision,
        confidence:state.claimResult.decision==="APPROVED"?91:state.claimResult.decision==="PARTIAL"?82:67,
        timestamp:new Date().toLocaleString()
      });
      renderPage();
    };
  }
  const resetClaimBtn = document.getElementById("resetClaimBtn");
  if(resetClaimBtn) resetClaimBtn.onclick = ()=>{ state.claimResult = null; renderPage(); };
}

init();
