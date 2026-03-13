import { useState, useEffect, useCallback } from "react";

// ── SUPABASE CONFIG ────────────────────────────────────────────────────────
const SUPABASE_URL = "https://izkofzsnteymljqpflzm.supabase.co";
const SUPABASE_KEY = "sb_publishable_fbk306J2PD4rRYNPGNaFxQ_TCjw_2h9";

const sb = async (path, opts = {}) => {
  const { prefer, headers: extraHeaders, ...rest } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": prefer || "return=representation",
      ...extraHeaders,
    },
    ...rest,
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const api = {
  getCompanies: () => sb("companies?order=created.desc"),
  upsertCompany: (c) => sb("companies", { method:"POST", body:JSON.stringify(c), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }),
  deleteCompany: (id) => sb(`companies?id=eq.${id}`, { method:"DELETE", prefer:"" }),
  getContacts: () => sb("contacts?order=name.asc"),
  upsertContact: (c) => sb("contacts", { method:"POST", body:JSON.stringify(c), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }),
  deleteContact: (id) => sb(`contacts?id=eq.${id}`, { method:"DELETE", prefer:"" }),
  getDeals: () => sb("deals?order=value.desc"),
  upsertDeal: (d) => sb("deals", { method:"POST", body:JSON.stringify(d), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }),
  deleteDeal: (id) => sb(`deals?id=eq.${id}`, { method:"DELETE", prefer:"" }),
  getTasks: () => sb("tasks?order=date.asc"),
  upsertTask: (t) => sb("tasks", { method:"POST", body:JSON.stringify(t), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }),
  deleteTask: (id) => sb(`tasks?id=eq.${id}`, { method:"DELETE", prefer:"" }),
};

// ── ICONS ──────────────────────────────────────────────────────────────────
const Icon = ({ d, size=18, stroke="currentColor", fill="none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p,i) => <path key={i} d={p}/>) : <path d={d}/>}
  </svg>
);
const Icons = {
  building: ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M9 22V12h6v10"],
  users: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75","M9 7a4 4 0 100 8 4 4 0 000-8z"],
  target: ["M22 12A10 10 0 1112 2","M22 12h-4","M12 22v-4","M6.34 6.34L9.17 9.17","M17.66 17.66l-2.83-2.83"],
  check: "M20 6L9 17l-5-5",
  plus: "M12 5v14M5 12h14",
  x: "M18 6L6 18M6 6l12 12",
  edit: ["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
  trash: ["M3 6h18","M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6","M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"],
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mail: ["M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z","M22 6l-10 7L2 6"],
  linkedin: ["M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z","M2 9h4v12H2z","M4 6a2 2 0 100-4 2 2 0 000 4z"],
  chevronRight: "M9 18l6-6-6-6",
  chart: ["M18 20V10","M12 20V4","M6 20v-6"],
  refresh: ["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"],
  search: ["M11 17a6 6 0 100-12 6 6 0 000 12z","M21 21l-4.35-4.35"],
  clock: ["M12 22a10 10 0 100-20 10 10 0 000 20z","M12 6v6l4 2"],
  gcal: ["M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z","M16 2v4M8 2v4M3 10h18","M8 14h.01M12 14h.01M16 14h.01"],
};

// ── VIVA COLORS ────────────────────────────────────────────────────────────
const C = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceHover: "#F0F8EC",
  border: "#E2E4E9",
  borderLight: "#CBD0D8",
  accent: "#2E8B00",
  accentDark: "#236D00",
  accentGlow:"rgba(46,139,0,0.1)",
  accentLight: "#F0F8EC",
  yellow: "#F5B800",
  yellowLight: "#FFF8E1",
  text: "#1A1A1A",
  textMuted: "#5C6070",
  textDim: "#9CA3AF",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",
  purple: "#7C3AED",
  white: "#FFFFFF",
};

const STATUSES = {
  company: ["Studený","Oslovený","Aktivní jednání","Zákazník","Spící"],
  deal: ["Identifikováno","Nabídka odeslána","Jednání","Vyhráno","Prohráno"],
  task: ["Plánováno","Probíhá","Dokončeno","Zrušeno"],
};
const STATUS_COLORS = {
  "Studený": C.textDim,
  "Oslovený": C.info,
  "Aktivní jednání": C.accent,
  "Zákazník": C.success,
  "Spící": C.purple,
  "Identifikováno": C.info,
  "Nabídka odeslána": C.warning,
  "Jednání": C.accent,
  "Vyhráno": C.success,
  "Prohráno": C.danger,
  "Plánováno": C.info,
  "Probíhá": C.warning,
  "Dokončeno": C.success,
  "Zrušeno": C.textDim,
};
const INDUSTRIES = ["Výroba","Logistika","Automotive","Stavebnictví","Zemědělství","Obchod","Jiné"];
const TASK_TYPES = ["Telefonát","Návštěva","E-mail","Nabídka","Prezentace","Jiné"];
const VZV_TYPES = ["Elektrický čelní","Elektrický CPD25","Dieselový","LPG","Retrák","Nízkozdvižný","Jiné"];
const COMPETITORS = ["Toyota","Linde","Jungheinrich","Still","Crown","Manitou","Doosan","Jiný"];

// ── UTILS ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const fmtMoney = (n) => n ? new Intl.NumberFormat("cs-CZ",{style:"currency",currency:"CZK",maximumFractionDigits:0}).format(n) : "—";
const isOverdue = (date,status) => date && !["Dokončeno","Zrušeno","Vyhráno","Prohráno"].includes(status) && new Date(date) < new Date(today());

const gcalLink = (task, company, contact) => {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const title = encodeURIComponent(`[VZV] ${task.title}${company?" – "+company.name:""}`);
  const details = encodeURIComponent(`Typ: ${task.type}\n${contact?"Kontakt: "+contact.name:""}\n${task.note||""}`);
  const d = (task.date||today()).replace(/-/g,"");
  return `${base}&text=${title}&dates=${d}/${d}&details=${details}`;
};

// ── STYLES ─────────────────────────────────────────────────────────────────
const s = {
  badge: (color) => ({
    display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11,
    fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}33`,
    letterSpacing:"0.3px", whiteSpace:"nowrap"
  }),
  card: {
    background: C.white, border:`1px solid ${C.border}`, borderRadius:12,
    padding:"18px 22px", marginBottom:12,
    boxShadow:"0 1px 4px rgba(0,0,0,0.06)"
  },
  input: {
    width:"100%", background:C.white, border:`1px solid ${C.border}`,
    borderRadius:8, padding:"9px 13px", color:C.text, fontSize:14,
    outline:"none", boxSizing:"border-box", transition:"border-color 0.15s"
  },
  btn: (v="primary") => ({
    display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
    borderRadius:8, border:"none", cursor:"pointer", fontSize:13,
    fontWeight:600, transition:"all 0.15s",
    ...(v==="primary" ? { background:C.accent, color:C.white, boxShadow:`0 2px 8px ${C.accentGlow}` } :
       v==="ghost" ? { background:"transparent", color:C.textMuted, border:`1px solid ${C.border}` } :
       v==="danger" ? { background:`${C.danger}10`, color:C.danger, border:`1px solid ${C.danger}30` } :
       v==="gcal" ? { background:"#EEF4FF", color:C.info, border:`1px solid ${C.info}30` } :
       { background:C.bg, color:C.text, border:`1px solid ${C.border}` }),
  }),
  label: {
    display:"block", fontSize:11, fontWeight:700, color:C.textMuted,
    marginBottom:5, letterSpacing:"0.6px", textTransform:"uppercase"
  },
};

// ── BASE COMPONENTS ────────────────────────────────────────────────────────
const StatusBadge = ({status}) => <span style={s.badge(STATUS_COLORS[status]||C.textMuted)}>{status}</span>;
const Field = ({label,children}) => <div style={{marginBottom:14}}><label style={s.label}>{label}</label>{children}</div>;
const Input = (props) => <input style={s.input} {...props}/>;
const Textarea = (props) => <textarea style={{...s.input,minHeight:76,resize:"vertical"}} {...props}/>;
const Select = ({options,...props}) => (
  <select style={{...s.input,appearance:"none"}} {...props}>
    <option value="">— vyberte —</option>
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);

const Modal = ({title,onClose,children}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:540,maxHeight:"90vh",overflow:"auto",padding:"24px 28px",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.textMuted,padding:4}}><Icon d={Icons.x} size={18}/></button>
      </div>
      {children}
    </div>
  </div>
);

const SyncBadge = ({status}) => {
  const cfg = {
    syncing:{color:C.warning,label:"Ukládám…"},
    ok:{color:C.success,label:"Synchronizováno"},
    error:{color:C.danger,label:"Chyba spojení"},
    loading:{color:C.info,label:"Načítám…"}
  }[status]||{color:C.textDim,label:""};
  return (
    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:cfg.color,fontWeight:500}}>
      <div style={{width:6,height:6,borderRadius:3,background:cfg.color}}/>
      {cfg.label}
    </div>
  );
};

const SectionHeader = ({title,count,onAdd,addLabel="Přidat"}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>{title}</h2>
      {count!==undefined&&<span style={{...s.badge(C.textDim),fontSize:12}}>{count}</span>}
    </div>
    {onAdd&&<button onClick={onAdd} style={s.btn("primary")}><Icon d={Icons.plus} size={14}/>{addLabel}</button>}
  </div>
);

const NoteEntry = ({notes=[],onAdd}) => {
  const [text,setText] = useState("");
  const submit = () => { if(text.trim()){onAdd(text.trim());setText("");} };
  return (
    <div>
      <div style={{display:"flex",gap:8}}>
        <Input value={text} onChange={e=>setText(e.target.value)} placeholder="Poznámka z návštěvy, hovoru…" onKeyDown={e=>e.key==="Enter"&&submit()}/>
        <button onClick={submit} style={s.btn("primary")}><Icon d={Icons.plus} size={14}/></button>
      </div>
      <div style={{marginTop:12}}>
        {[...notes].reverse().map((n,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:6,height:6,borderRadius:3,background:C.accent,marginTop:5,flexShrink:0}}/>
            <div>
              <div style={{fontSize:13,color:C.text}}>{n.text}</div>
              <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{fmtDate(n.date)}</div>
            </div>
          </div>
        ))}
        {notes.length===0&&<div style={{color:C.textDim,fontSize:13,textAlign:"center",padding:"14px 0"}}>Zatím žádné poznámky</div>}
      </div>
    </div>
  );
};

// ── DASHBOARD ──────────────────────────────────────────────────────────────
const Dashboard = ({data,onNavigate}) => {
  const {companies,contacts,deals,tasks} = data;
  const activeDeals = deals.filter(d=>!["Vyhráno","Prohráno"].includes(d.status));
  const pipeline = activeDeals.reduce((s,d)=>s+(d.value||0),0);
  const won = deals.filter(d=>d.status==="Vyhráno").reduce((s,d)=>s+(d.value||0),0);
  const overdue = tasks.filter(t=>isOverdue(t.date,t.status));
  const upcoming = tasks.filter(t=>t.status==="Plánováno").sort((a,b)=>(a.date||"").localeCompare(b.date||""));

  const Stat = ({icon,label,value,sub,color,onClick}) => (
    <div onClick={onClick} style={{
      background:C.white, border:`1px solid ${C.border}`, borderRadius:12,
      padding:"18px 20px", flex:1, minWidth:140,
      cursor:onClick?"pointer":"default",
      borderTop:`3px solid ${color}`,
      boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
      transition:"all 0.2s", marginBottom:0
    }}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.1)")}
      onMouseLeave={e=>(e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)")}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>{label}</div>
          <div style={{fontSize:22,fontWeight:800,color:C.text,fontFamily:"'Space Grotesk',sans-serif"}}>{value}</div>
          {sub&&<div style={{fontSize:11,color:C.textDim,marginTop:3}}>{sub}</div>}
        </div>
        <div style={{background:`${color}15`,borderRadius:8,padding:8,color}}><Icon d={icon} size={18}/></div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:24,padding:"20px 24px",background:C.white,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{fontSize:11,color:C.textDim,marginBottom:3,fontWeight:500}}>
          {new Date().toLocaleDateString("cs-CZ",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
        </div>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Dobrý den, Petře 👋</h1>
        <p style={{margin:"4px 0 0",color:C.textMuted,fontSize:13}}>Přehled vašeho VZV pipeline · VIVA Lovosice</p>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
        <Stat icon={Icons.building} label="Firmy" value={companies.length} sub={`${companies.filter(c=>c.status==="Zákazník").length} zákazníků`} color={C.info} onClick={()=>onNavigate("companies")}/>
        <Stat icon={Icons.target} label="Pipeline" value={fmtMoney(pipeline)} sub={`${activeDeals.length} příležitostí`} color={C.accent} onClick={()=>onNavigate("deals")}/>
        <Stat icon={Icons.check} label="Vyhráno" value={fmtMoney(won)} sub={`${deals.filter(d=>d.status==="Vyhráno").length} dealů`} color={C.success}/>
        <Stat icon={Icons.clock} label="Po termínu" value={overdue.length} sub={overdue.length>0?"nutná akce":"vše v pořádku"} color={overdue.length>0?C.danger:C.success} onClick={()=>onNavigate("tasks")}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={s.card}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:14}}>Pipeline po fázích</div>
          {["Identifikováno","Nabídka odeslána","Jednání"].map(stage=>{
            const items=deals.filter(d=>d.status===stage);
            return (
              <div key={stage} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:C.text,fontWeight:500}}>{stage}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.accent}}>{items.length>0?fmtMoney(items.reduce((s,d)=>s+(d.value||0),0)):"—"}</span>
                </div>
                <div style={{height:5,background:C.bg,borderRadius:3}}>
                  <div style={{height:"100%",width:`${Math.min(100,items.length*30)}%`,background:STATUS_COLORS[stage],borderRadius:3}}/>
                </div>
              </div>
            );
          })}
        </div>

        <div style={s.card}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:14}}>Nejbližší úkoly</div>
          {upcoming.slice(0,5).map(t=>{
            const company=companies.find(c=>c.id===t.company_id);
            const od=isOverdue(t.date,t.status);
            return (
              <div key={t.id} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:6,height:6,borderRadius:3,background:od?C.danger:C.accent,marginTop:4,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:od?C.danger:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                  <div style={{fontSize:11,color:C.textDim}}>{company?.name} · {fmtDate(t.date)}</div>
                </div>
                <span style={s.badge(od?C.danger:C.info)}>{t.type}</span>
              </div>
            );
          })}
          {upcoming.length===0&&<div style={{fontSize:13,color:C.textDim}}>Žádné naplánované úkoly</div>}
        </div>
      </div>

      <div style={s.card}>
        <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:14}}>Aktivní firmy</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {companies.filter(c=>["Aktivní jednání","Oslovený"].includes(c.status)).map(c=>(
            <div key={c.id} onClick={()=>onNavigate("companies",c.id)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",cursor:"pointer",flex:"1 1 160px",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.accentLight;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.bg;}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>{c.name}</div>
              <div style={{fontSize:11,color:C.textDim,marginBottom:6}}>{c.industry} · {c.fleet} VZV</div>
              <StatusBadge status={c.status}/>
            </div>
          ))}
          {companies.filter(c=>["Aktivní jednání","Oslovený"].includes(c.status)).length===0&&
            <div style={{fontSize:13,color:C.textDim}}>Žádné aktivní firmy</div>}
        </div>
      </div>
    </div>
  );
};

// ── COMPANIES ──────────────────────────────────────────────────────────────
const CompanyForm = ({initial,onSave,onClose}) => {
  const [f,setF] = useState(initial||{name:"",industry:"",address:"",ico:"",status:"Studený",fleet:0,competitor:"",notes:[]});
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Název *"><Input value={f.name} onChange={e=>u("name",e.target.value)} placeholder="Firma s.r.o."/></Field>
        <Field label="IČO"><Input value={f.ico||""} onChange={e=>u("ico",e.target.value)}/></Field>
        <Field label="Odvětví"><Select options={INDUSTRIES} value={f.industry||""} onChange={e=>u("industry",e.target.value)}/></Field>
        <Field label="Stav"><Select options={STATUSES.company} value={f.status} onChange={e=>u("status",e.target.value)}/></Field>
        <Field label="Adresa"><Input value={f.address||""} onChange={e=>u("address",e.target.value)} placeholder="Ústí nad Labem"/></Field>
        <Field label="Počet VZV"><Input type="number" value={f.fleet||0} onChange={e=>u("fleet",Number(e.target.value))}/></Field>
        <Field label="Stávající dodavatel"><Select options={COMPETITORS} value={f.competitor||""} onChange={e=>u("competitor",e.target.value)}/></Field>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}>
        <button onClick={onClose} style={s.btn("ghost")}>Zrušit</button>
        <button onClick={()=>f.name&&onSave(f)} style={s.btn("primary")}>Uložit</button>
      </div>
    </div>
  );
};

const Companies = ({data,ops,focusId,onClearFocus}) => {
  const [modal,setModal] = useState(null);
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState("Vše");
  const [detail,setDetail] = useState(focusId||null);
  useEffect(()=>{if(focusId){setDetail(focusId);onClearFocus&&onClearFocus();}}, [focusId]);

  const filtered = data.companies.filter(c=>{
    const ms=c.name.toLowerCase().includes(search.toLowerCase())||(c.address||"").toLowerCase().includes(search.toLowerCase());
    return ms&&(filter==="Vše"||c.status===filter);
  });

  const dc = data.companies.find(c=>c.id===detail);
  if (dc) return (
    <div>
      <button onClick={()=>setDetail(null)} style={{...s.btn("ghost"),marginBottom:18}}>← Zpět</button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:18}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text}}>{dc.name}</h1>
          <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <StatusBadge status={dc.status}/>
            {dc.industry&&<span style={{fontSize:12,color:C.textMuted}}>{dc.industry}</span>}
            {dc.fleet>0&&<span style={{fontSize:12,color:C.textMuted}}>· {dc.fleet} VZV</span>}
            {dc.competitor&&<span style={{fontSize:12,color:C.textDim}}>· {dc.competitor}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setModal("edit")} style={s.btn("ghost")}><Icon d={Icons.edit} size={13}/>Upravit</button>
          <button onClick={async()=>{await ops.deleteCompany(dc.id);setDetail(null);}} style={s.btn("danger")}><Icon d={Icons.trash} size={13}/></button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={s.card}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Info</div>
          {dc.address&&<div style={{fontSize:13,color:C.textMuted}}>{dc.address}</div>}
          {dc.ico&&<div style={{fontSize:12,color:C.textDim,marginTop:3}}>IČO: {dc.ico}</div>}
        </div>
        <div style={s.card}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Dealy</div>
          {data.deals.filter(d=>d.company_id===dc.id).map(d=>(
            <div key={d.id} style={{marginBottom:8}}>
              <div style={{fontSize:13,color:C.text,fontWeight:500}}>{d.title}</div>
              <div style={{fontSize:11,color:C.textDim,display:"flex",gap:5,alignItems:"center",marginTop:2}}>{fmtMoney(d.value)} · <StatusBadge status={d.status}/></div>
            </div>
          ))}
          {data.deals.filter(d=>d.company_id===dc.id).length===0&&<div style={{fontSize:12,color:C.textDim}}>Žádné dealy</div>}
        </div>
      </div>

      <div style={s.card}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Kontaktní osoby</div>
        {data.contacts.filter(ct=>ct.company_id===dc.id).map(ct=>(
          <div key={ct.id} style={{background:C.bg,borderRadius:8,padding:"12px 14px",marginBottom:8,border:`1px solid ${C.border}`}}>
            <div style={{fontWeight:600,fontSize:14,color:C.text}}>{ct.name}</div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:6}}>{ct.position} · <span style={s.badge(C.purple)}>{ct.role}</span></div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              {ct.phone&&<a href={`tel:${ct.phone}`} style={{fontSize:12,color:C.accent,display:"flex",gap:4,alignItems:"center",textDecoration:"none",fontWeight:500}}><Icon d={Icons.phone} size={12}/>{ct.phone}</a>}
              {ct.email&&<a href={`mailto:${ct.email}`} style={{fontSize:12,color:C.info,display:"flex",gap:4,alignItems:"center",textDecoration:"none"}}><Icon d={Icons.mail} size={12}/>{ct.email}</a>}
            </div>
            {ct.note&&<div style={{fontSize:12,color:C.textDim,marginTop:6,fontStyle:"italic"}}>"{ct.note}"</div>}
          </div>
        ))}
        {data.contacts.filter(ct=>ct.company_id===dc.id).length===0&&<div style={{fontSize:12,color:C.textDim}}>Žádné kontakty</div>}
      </div>

      <div style={s.card}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Poznámky z terénu</div>
        <NoteEntry notes={dc.notes||[]} onAdd={async(text)=>{
          await ops.upsertCompany({...dc,notes:[...(dc.notes||[]),{text,date:today()}]});
        }}/>
      </div>

      <div style={s.card}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Úkoly</div>
        {data.tasks.filter(t=>t.company_id===dc.id).map(t=>(
          <div key={t.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:6,height:6,borderRadius:3,background:STATUS_COLORS[t.status],flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:C.text,fontWeight:500}}>{t.title}</div>
              <div style={{fontSize:11,color:C.textDim}}>{t.type} · {fmtDate(t.date)}</div>
            </div>
            <StatusBadge status={t.status}/>
          </div>
        ))}
        {data.tasks.filter(t=>t.company_id===dc.id).length===0&&<div style={{fontSize:12,color:C.textDim}}>Žádné úkoly</div>}
      </div>

      {modal==="edit"&&<Modal title="Upravit firmu" onClose={()=>setModal(null)}><CompanyForm initial={dc} onSave={async(f)=>{await ops.upsertCompany({...dc,...f});setModal(null);}} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );

  return (
    <div>
      <SectionHeader title="Firmy" count={filtered.length} onAdd={()=>setModal("new")} addLabel="Přidat firmu"/>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textDim}}><Icon d={Icons.search} size={14}/></div>
          <input style={{...s.input,paddingLeft:34}} placeholder="Hledat firmu…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {["Vše",...STATUSES.company].map(st=>(
            <button key={st} onClick={()=>setFilter(st)} style={{...s.btn(filter===st?"primary":"ghost"),padding:"7px 11px",fontSize:11}}>{st}</button>
          ))}
        </div>
      </div>
      {filtered.map(c=>(
        <div key={c.id} onClick={()=>setDetail(c.id)} style={{...s.card,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 2px 8px rgba(46,139,0,0.1)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:3}}>{c.name}</div>
            <div style={{fontSize:12,color:C.textMuted,display:"flex",gap:6,flexWrap:"wrap"}}>
              {c.industry&&<span>{c.industry}</span>}
              {c.address&&<span>· {c.address}</span>}
              {c.fleet>0&&<span>· {c.fleet} VZV</span>}
              {c.competitor&&<span style={{color:C.textDim}}>· {c.competitor}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            <StatusBadge status={c.status}/>
            <Icon d={Icons.chevronRight} size={14} stroke={C.textDim}/>
          </div>
        </div>
      ))}
      {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textDim}}>Žádné firmy</div>}
      {modal==="new"&&<Modal title="Nová firma" onClose={()=>setModal(null)}><CompanyForm onSave={async(f)=>{await ops.upsertCompany({...f,id:uid(),notes:[],created:today()});setModal(null);}} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
};

// ── CONTACTS ───────────────────────────────────────────────────────────────
const ContactForm = ({initial,companies,onSave,onClose}) => {
  const [f,setF] = useState(initial||{name:"",company_id:"",position:"",phone:"",email:"",linkedin:"",role:"Rozhodovatel",note:""});
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Jméno *"><Input value={f.name} onChange={e=>u("name",e.target.value)}/></Field>
        <Field label="Firma">
          <select style={{...s.input,appearance:"none"}} value={f.company_id||""} onChange={e=>u("company_id",e.target.value)}>
            <option value="">— bez firmy —</option>
            {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Pozice"><Input value={f.position||""} onChange={e=>u("position",e.target.value)}/></Field>
        <Field label="Role"><Select options={["Rozhodovatel","Influencer","Uživatel","Blokátor"]} value={f.role||""} onChange={e=>u("role",e.target.value)}/></Field>
        <Field label="Telefon"><Input value={f.phone||""} onChange={e=>u("phone",e.target.value)} placeholder="+420 777 000 000"/></Field>
        <Field label="E-mail"><Input value={f.email||""} onChange={e=>u("email",e.target.value)}/></Field>
      </div>
      <Field label="LinkedIn"><Input value={f.linkedin||""} onChange={e=>u("linkedin",e.target.value)}/></Field>
      <Field label="Poznámka"><Textarea value={f.note||""} onChange={e=>u("note",e.target.value)}/></Field>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button onClick={onClose} style={s.btn("ghost")}>Zrušit</button>
        <button onClick={()=>f.name&&onSave(f)} style={s.btn("primary")}>Uložit</button>
      </div>
    </div>
  );
};

const Contacts = ({data,ops}) => {
  const [modal,setModal] = useState(null);
  const [search,setSearch] = useState("");
  const filtered = data.contacts.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||(c.position||"").toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <SectionHeader title="Kontakty" count={filtered.length} onAdd={()=>setModal("new")} addLabel="Přidat kontakt"/>
      <div style={{position:"relative",marginBottom:14}}>
        <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textDim}}><Icon d={Icons.search} size={14}/></div>
        <input style={{...s.input,paddingLeft:34}} placeholder="Hledat kontakt…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {filtered.map(ct=>{
          const company=data.companies.find(c=>c.id===ct.company_id);
          return (
            <div key={ct.id} style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>{ct.name}</div>
                  <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{ct.position}</div>
                  {company&&<div style={{fontSize:11,color:C.textDim,marginTop:1}}>{company.name}</div>}
                </div>
                <span style={s.badge(C.purple)}>{ct.role}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,margin:"8px 0"}}>
                {ct.phone&&<a href={`tel:${ct.phone}`} style={{fontSize:12,color:C.accent,display:"flex",gap:5,alignItems:"center",textDecoration:"none",fontWeight:500}}><Icon d={Icons.phone} size={12}/>{ct.phone}</a>}
                {ct.email&&<a href={`mailto:${ct.email}`} style={{fontSize:12,color:C.info,display:"flex",gap:5,alignItems:"center",textDecoration:"none"}}><Icon d={Icons.mail} size={12}/>{ct.email}</a>}
                {ct.linkedin&&<a href={`https://${ct.linkedin}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#0A66C2",display:"flex",gap:5,alignItems:"center",textDecoration:"none"}}><Icon d={Icons.linkedin} size={12}/>LinkedIn</a>}
              </div>
              {ct.note&&<div style={{fontSize:12,color:C.textDim,fontStyle:"italic",borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:4}}>"{ct.note}"</div>}
              <div style={{display:"flex",gap:6,marginTop:10}}>
                <button onClick={()=>setModal(ct.id)} style={s.btn("ghost")}><Icon d={Icons.edit} size={12}/>Upravit</button>
                <button onClick={()=>ops.deleteContact(ct.id)} style={s.btn("danger")}><Icon d={Icons.trash} size={12}/></button>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textDim}}>Žádné kontakty</div>}
      {modal&&<Modal title={modal==="new"?"Nový kontakt":"Upravit kontakt"} onClose={()=>setModal(null)}>
        <ContactForm initial={modal!=="new"?data.contacts.find(c=>c.id===modal):undefined} companies={data.companies}
          onSave={async(f)=>{await ops.upsertContact(modal==="new"?{...f,id:uid()}:{...data.contacts.find(c=>c.id===modal),...f});setModal(null);}}
          onClose={()=>setModal(null)}/>
      </Modal>}
    </div>
  );
};

// ── DEALS ──────────────────────────────────────────────────────────────────
const DealForm = ({initial,companies,contacts,onSave,onClose}) => {
  const [f,setF] = useState(initial||{title:"",company_id:"",contact_id:"",type:"",qty:1,value:"",status:"Identifikováno",due_date:"",note:""});
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const rc = contacts.filter(c=>c.company_id===f.company_id);
  return (
    <div>
      <Field label="Název *"><Input value={f.title} onChange={e=>u("title",e.target.value)} placeholder="2x HC CPD25"/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Firma">
          <select style={{...s.input,appearance:"none"}} value={f.company_id||""} onChange={e=>{u("company_id",e.target.value);u("contact_id","");}}>
            <option value="">— vyberte —</option>
            {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Kontakt">
          <select style={{...s.input,appearance:"none"}} value={f.contact_id||""} onChange={e=>u("contact_id",e.target.value)}>
            <option value="">— vyberte —</option>
            {rc.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Typ VZV"><Select options={VZV_TYPES} value={f.type||""} onChange={e=>u("type",e.target.value)}/></Field>
        <Field label="Počet ks"><Input type="number" value={f.qty||1} onChange={e=>u("qty",e.target.value)} min={1}/></Field>
        <Field label="Hodnota (Kč)"><Input type="number" value={f.value||""} onChange={e=>u("value",e.target.value)}/></Field>
        <Field label="Stav"><Select options={STATUSES.deal} value={f.status} onChange={e=>u("status",e.target.value)}/></Field>
        <Field label="Datum followupu"><Input type="date" value={f.due_date||""} onChange={e=>u("due_date",e.target.value)}/></Field>
      </div>
      <Field label="Poznámka"><Textarea value={f.note||""} onChange={e=>u("note",e.target.value)}/></Field>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button onClick={onClose} style={s.btn("ghost")}>Zrušit</button>
        <button onClick={()=>f.title&&onSave(f)} style={s.btn("primary")}>Uložit</button>
      </div>
    </div>
  );
};

const Deals = ({data,ops}) => {
  const [modal,setModal] = useState(null);
  const [filter,setFilter] = useState("Vše");
  const filtered = data.deals.filter(d=>filter==="Vše"||d.status===filter);
  return (
    <div>
      <SectionHeader title="Pipeline" count={filtered.length} onAdd={()=>setModal("new")} addLabel="Přidat deal"/>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {STATUSES.deal.map(st=>{
          const items=data.deals.filter(d=>d.status===st);
          if(!items.length) return null;
          return (
            <div key={st} onClick={()=>setFilter(filter===st?"Vše":st)} style={{
              background:filter===st?C.accentLight:C.white,
              border:`1px solid ${filter===st?C.accent:C.border}`,
              borderRadius:10, padding:"10px 14px", cursor:"pointer",
              transition:"all 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.05)"
            }}>
              <div style={{fontSize:10,color:STATUS_COLORS[st],fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px"}}>{st}</div>
              <div style={{fontSize:18,fontWeight:800,color:C.text}}>{items.length}</div>
              <div style={{fontSize:11,color:C.textDim}}>{fmtMoney(items.reduce((s,d)=>s+(d.value||0),0))}</div>
            </div>
          );
        })}
      </div>
      {filtered.sort((a,b)=>(b.value||0)-(a.value||0)).map(d=>{
        const company=data.companies.find(c=>c.id===d.company_id);
        const contact=data.contacts.find(c=>c.id===d.contact_id);
        const od=isOverdue(d.due_date,d.status);
        return (
          <div key={d.id} style={{...s.card,borderLeft:`3px solid ${STATUS_COLORS[d.status]||C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>{d.title}</div>
                <div style={{fontSize:12,color:C.textMuted,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {company&&<span>{company.name}</span>}
                  {contact&&<span>· {contact.name}</span>}
                  {d.type&&<span>· {d.type}</span>}
                  {d.qty>1&&<span>· {d.qty} ks</span>}
                </div>
                {d.note&&<div style={{fontSize:12,color:C.textDim,marginTop:5,fontStyle:"italic"}}>{d.note}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                <div style={{fontSize:18,fontWeight:800,color:C.accent}}>{fmtMoney(d.value)}</div>
                <StatusBadge status={d.status}/>
                {d.due_date&&<div style={{fontSize:11,color:od?C.danger:C.textDim,fontWeight:od?600:400}}>{od?"⚠ ":""}{fmtDate(d.due_date)}</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setModal(d.id)} style={s.btn("ghost")}><Icon d={Icons.edit} size={12}/>Upravit</button>
              <button onClick={()=>ops.deleteDeal(d.id)} style={s.btn("danger")}><Icon d={Icons.trash} size={12}/></button>
            </div>
          </div>
        );
      })}
      {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textDim}}>Žádné příležitosti</div>}
      {modal&&<Modal title={modal==="new"?"Nová příležitost":"Upravit příležitost"} onClose={()=>setModal(null)}>
        <DealForm initial={modal!=="new"?data.deals.find(d=>d.id===modal):undefined} companies={data.companies} contacts={data.contacts}
          onSave={async(f)=>{await ops.upsertDeal(modal==="new"?{...f,id:uid(),qty:Number(f.qty)||1,value:Number(f.value)||0}:{...data.deals.find(d=>d.id===modal),...f,qty:Number(f.qty)||1,value:Number(f.value)||0});setModal(null);}}
          onClose={()=>setModal(null)}/>
      </Modal>}
    </div>
  );
};

// ── TASKS ──────────────────────────────────────────────────────────────────
const TaskForm = ({initial,companies,contacts,onSave,onClose}) => {
  const [f,setF] = useState(initial||{title:"",type:"Telefonát",company_id:"",contact_id:"",date:today(),status:"Plánováno",note:""});
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const rc = contacts.filter(c=>c.company_id===f.company_id);
  return (
    <div>
      <Field label="Název *"><Input value={f.title} onChange={e=>u("title",e.target.value)} placeholder="Telefonát ohledně nabídky"/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Typ"><Select options={TASK_TYPES} value={f.type} onChange={e=>u("type",e.target.value)}/></Field>
        <Field label="Stav"><Select options={STATUSES.task} value={f.status} onChange={e=>u("status",e.target.value)}/></Field>
        <Field label="Firma">
          <select style={{...s.input,appearance:"none"}} value={f.company_id||""} onChange={e=>{u("company_id",e.target.value);u("contact_id","");}}>
            <option value="">— bez firmy —</option>
            {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Kontakt">
          <select style={{...s.input,appearance:"none"}} value={f.contact_id||""} onChange={e=>u("contact_id",e.target.value)}>
            <option value="">— bez kontaktu —</option>
            {rc.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Datum"><Input type="date" value={f.date||""} onChange={e=>u("date",e.target.value)}/></Field>
      </div>
      <Field label="Poznámka"><Textarea value={f.note||""} onChange={e=>u("note",e.target.value)}/></Field>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <button onClick={onClose} style={s.btn("ghost")}>Zrušit</button>
        <button onClick={()=>f.title&&onSave(f)} style={s.btn("primary")}>Uložit</button>
      </div>
    </div>
  );
};

const Tasks = ({data,ops}) => {
  const [modal,setModal] = useState(null);
  const [filter,setFilter] = useState("Aktivní");
  const overdueCount = data.tasks.filter(t=>isOverdue(t.date,t.status)).length;

  const filtered = data.tasks.filter(t=>{
    if(filter==="Aktivní") return ["Plánováno","Probíhá"].includes(t.status);
    if(filter==="Dnes") return t.date===today()&&["Plánováno","Probíhá"].includes(t.status);
    if(filter==="Po termínu") return isOverdue(t.date,t.status);
    if(filter==="Dokončeno") return t.status==="Dokončeno";
    return true;
  }).sort((a,b)=>(a.date||"").localeCompare(b.date||""));

  return (
    <div>
      <SectionHeader title="Úkoly" count={filtered.length} onAdd={()=>setModal("new")} addLabel="Přidat úkol"/>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["Aktivní","Dnes","Po termínu","Dokončeno","Vše"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{...s.btn(filter===f?"primary":"ghost"),fontSize:12}}>
            {f==="Po termínu"&&overdueCount>0?`⚠ Po termínu (${overdueCount})`:f}
          </button>
        ))}
      </div>
      {filtered.map(t=>{
        const company=data.companies.find(c=>c.id===t.company_id);
        const contact=data.contacts.find(c=>c.id===t.contact_id);
        const od=isOverdue(t.date,t.status);
        return (
          <div key={t.id} style={{...s.card,borderLeft:`3px solid ${od?C.danger:STATUS_COLORS[t.status]||C.border}`}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                  <span style={{fontWeight:700,fontSize:14,color:od?C.danger:C.text}}>{t.title}</span>
                  <span style={s.badge(C.info)}>{t.type}</span>
                  <StatusBadge status={t.status}/>
                </div>
                <div style={{fontSize:12,color:C.textMuted,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {company&&<span>{company.name}</span>}
                  {contact&&<span>· {contact.name}</span>}
                  <span style={{color:od?C.danger:C.textDim,fontWeight:od?600:400}}>· {fmtDate(t.date)}{od?" ⚠":""}</span>
                </div>
                {t.note&&<div style={{fontSize:12,color:C.textDim,marginTop:5,fontStyle:"italic"}}>{t.note}</div>}
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <a href={gcalLink(t,company,contact)} target="_blank" rel="noreferrer"
                  style={{...s.btn("gcal"),textDecoration:"none",padding:"6px 10px",fontSize:12}}
                  title="Přidat do Google Kalendáře">
                  <Icon d={Icons.gcal} size={13}/>GCal
                </a>
                {t.status!=="Dokončeno"&&(
                  <button onClick={()=>ops.upsertTask({...t,status:"Dokončeno"})} style={{...s.btn("ghost"),padding:"6px 10px"}} title="Hotovo">
                    <Icon d={Icons.check} size={13}/>
                  </button>
                )}
                <button onClick={()=>setModal(t.id)} style={{...s.btn("ghost"),padding:"6px 10px"}}><Icon d={Icons.edit} size={13}/></button>
                <button onClick={()=>ops.deleteTask(t.id)} style={{...s.btn("danger"),padding:"6px 10px"}}><Icon d={Icons.trash} size={13}/></button>
              </div>
            </div>
          </div>
        );
      })}
      {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textDim}}>Žádné úkoly</div>}
      {modal&&<Modal title={modal==="new"?"Nový úkol":"Upravit úkol"} onClose={()=>setModal(null)}>
        <TaskForm initial={modal!=="new"?data.tasks.find(t=>t.id===modal):undefined} companies={data.companies} contacts={data.contacts}
          onSave={async(f)=>{await ops.upsertTask(modal==="new"?{...f,id:uid()}:{...data.tasks.find(t=>t.id===modal),...f});setModal(null);}}
          onClose={()=>setModal(null)}/>
      </Modal>}
    </div>
  );
};

// ── MAIN APP ───────────────────────────────────────────────────────────────
const NAV = [
  {id:"dashboard",label:"Přehled",icon:Icons.chart},
  {id:"companies",label:"Firmy",icon:Icons.building},
  {id:"contacts",label:"Kontakty",icon:Icons.users},
  {id:"deals",label:"Pipeline",icon:Icons.target},
  {id:"tasks",label:"Úkoly",icon:Icons.check},
];

export default function App() {
  const [data,setData] = useState({companies:[],contacts:[],deals:[],tasks:[]});
  const [syncStatus,setSyncStatus] = useState("loading");
  const [page,setPage] = useState("dashboard");
  const [focusId,setFocusId] = useState(null);

  const loadAll = useCallback(async()=>{
    setSyncStatus("loading");
    try {
      const [companies,contacts,deals,tasks] = await Promise.all([
        api.getCompanies(),api.getContacts(),api.getDeals(),api.getTasks()
      ]);
      setData({companies,contacts,deals,tasks});
      setSyncStatus("ok");
    } catch(e) {
      console.error(e);
      setSyncStatus("error");
    }
  },[]);

  useEffect(()=>{loadAll();},[]);

  const wrap = (fn) => async(...args)=>{
    setSyncStatus("syncing");
    try { await fn(...args); await loadAll(); }
    catch(e) { console.error(e); setSyncStatus("error"); }
  };

  const ops = {
    upsertCompany:wrap(api.upsertCompany), deleteCompany:wrap(api.deleteCompany),
    upsertContact:wrap(api.upsertContact), deleteContact:wrap(api.deleteContact),
    upsertDeal:wrap(api.upsertDeal),       deleteDeal:wrap(api.deleteDeal),
    upsertTask:wrap(api.upsertTask),       deleteTask:wrap(api.deleteTask),
  };

  const navigate = (p,id=null)=>{ setPage(p); setFocusId(id); };
  const overdueCount = data.tasks.filter(t=>isOverdue(t.date,t.status)).length;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:none;opacity:0.5;}
        select option{background:${C.white};color:${C.text};}
        input:focus, select:focus, textarea:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentGlow}; }
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      {/* Topbar */}
      <div style={{position:"sticky",top:0,zIndex:100,background:C.white,borderBottom:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",height:56,gap:10}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginRight:16}}>
            <div style={{background:C.accent,borderRadius:8,padding:"5px 8px",display:"flex",alignItems:"center",borderRight:`3px solid ${C.yellow}`}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17V7h4l3 5v5M14 9h4l2 4v4h-6V9z"/><circle cx="7" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 17h14v2H3z"/>
              </svg>
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:C.text,letterSpacing:"-0.3px",lineHeight:1}}>VIVA <span style={{color:C.accent}}>CRM</span></div>
              <div style={{fontSize:9,color:C.textDim,letterSpacing:"0.5px",textTransform:"uppercase"}}>Lovosice</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{display:"flex",gap:2,flex:1}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>navigate(n.id)} style={{
                display:"flex",alignItems:"center",gap:5,padding:"6px 12px",
                borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
                transition:"all 0.15s",position:"relative",
                background:page===n.id?C.accentLight:"transparent",
                color:page===n.id?C.accent:C.textMuted,
                borderBottom:page===n.id?`2px solid ${C.accent}`:"2px solid transparent",
              }}>
                <Icon d={n.icon} size={13}/>{n.label}
                {n.id==="tasks"&&overdueCount>0&&(
                  <span style={{position:"absolute",top:2,right:2,width:7,height:7,borderRadius:4,background:C.danger}}/>
                )}
              </button>
            ))}
          </nav>

          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <SyncBadge status={syncStatus}/>
            <button onClick={loadAll} style={{...s.btn("ghost"),padding:"6px 9px"}} title="Obnovit">
              <Icon d={Icons.refresh} size={13}/>
            </button>
          </div>
        </div>
      </div>

      {syncStatus==="error"&&(
        <div style={{background:`${C.danger}10`,borderBottom:`1px solid ${C.danger}30`,padding:"10px 20px",textAlign:"center",fontSize:13,color:C.danger,fontWeight:500}}>
          ⚠ Nepodařilo se připojit k databázi. Zkontroluj připojení k internetu.
        </div>
      )}

      {syncStatus==="loading"&&data.companies.length===0&&(
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:"80px 0",flexDirection:"column",gap:12}}>
          <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <div style={{color:C.textMuted,fontSize:13,fontWeight:500}}>Načítám data…</div>
        </div>
      )}

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 20px"}}>
        {page==="dashboard"&&<Dashboard data={data} onNavigate={navigate}/>}
        {page==="companies"&&<Companies data={data} ops={ops} focusId={focusId} onClearFocus={()=>setFocusId(null)}/>}
        {page==="contacts"&&<Contacts data={data} ops={ops}/>}
        {page==="deals"&&<Deals data={data} ops={ops}/>}
        {page==="tasks"&&<Tasks data={data} ops={ops}/>}
      </div>
    </div>
  );
}
