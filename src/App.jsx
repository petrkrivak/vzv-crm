import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://izkofzsnteymljqpflzm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6a29menNudGV5bWxqcXBmbHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODQ3NTksImV4cCI6MjA4ODg2MDc1OX0.Q6hLlEoxsJv44hSNKCbRwhrD5FsXWKGJcxUYVISdeWM";

// --- SUPABASE KLIENT ---

// Auth: refresh token
const refreshSession = async (refreshToken) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Token refresh selhal");
  return data;
};

// Kontrola expirace tokenu (s 60s rezervou)
const isTokenExpired = (session) => {
  if (!session?.expires_at) return false;
  return Date.now() / 1000 > session.expires_at - 60;
};

// REST API helper (pro data) — s automatickým retry při 401
const sb = async (path, opts = {}, token = null, retried = false) => {
  const { prefer, headers: extraHeaders, ...rest } = opts;
  const authHeader = token
    ? { "Authorization": `Bearer ${token}` }
    : { "Authorization": `Bearer ${SUPABASE_KEY}` };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": prefer || "return=representation",
      ...authHeader,
      ...extraHeaders,
    },
    ...rest,
  });

  // Při 401 zkus refresh tokenu (jen jednou)
  if (res.status === 401 && !retried) {
    const stored = getStoredSession();
    if (stored?.refresh_token) {
      try {
        const newSession = await refreshSession(stored.refresh_token);
        storeSession(newSession);
        // Retry s novým tokenem
        return sb(path, opts, newSession.access_token, true);
      } catch {
        storeSession(null);
        window.location.reload();
      }
    }
  }

  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

// Auth API helper
const authFetch = async (endpoint, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Chyba přihlášení");
  return data;
};

// Obnova session z localStorage
const getStoredSession = () => {
  try {
    const s = localStorage.getItem("vzv_session");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};
const storeSession = (s) => {
  if (s) localStorage.setItem("vzv_session", JSON.stringify(s));
  else localStorage.removeItem("vzv_session");
};

// --- DESIGN SYSTEM ---
const C = {
  bg: "#F4F5F7", surface: "#FFFFFF",
  border: "#E2E4E9",
  accent: "#2E8B00", accentDark: "#236D00", accentGlow:"rgba(46,139,0,0.1)", accentLight: "#F0F8EC",
  yellow: "#F5B800", yellowLight: "#FFF8E1",
  text: "#1A1A1A", textMuted: "#5C6070", textDim: "#9CA3AF",
  success: "#16A34A", warning: "#D97706", danger: "#DC2626", info: "#2563EB", purple: "#7C3AED",
  white: "#FFFFFF",
};

const NOTE_TYPES = {
  email:   { label:"Email", bg:"#F0F8EC", color:"#236D00", stroke:"#2E8B00", border:"#C8E6B0",
             icon:["M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z","M22 6l-10 7L2 6"] },
  tel:     { label:"Tel",   bg:"#FFF8E1", color:"#7A5200", stroke:"#B8860B", border:"#F5D580",
             icon:"M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" },
  sch:     { label:"Sch",   bg:"#F0F8EC", color:"#236D00", stroke:"#2E8B00", border:"#C8E6B0",
             icon:["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"] },
  nab:     { label:"Nab",   bg:"#FFF8E1", color:"#7A5200", stroke:"#B8860B", border:"#F5D580",
             icon:["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M16 13H8","M16 17H8"] },
};
const LONG_NOTE = 120;

const STATUSES = {
  company: ["Studený","Oslovený","Aktivní jednání","Zákazník","Spící"],
  deal: ["Identifikováno","Nabídka odeslána","Jednání","Vyhráno","Prohráno"],
  task: ["Plánováno","Probíhá","Dokončeno","Zrušeno"],
};
const STATUS_COLORS = {
  "Studený":C.textDim,"Oslovený":C.info,"Aktivní jednání":C.accent,"Zákazník":C.success,"Spící":C.purple,
  "Identifikováno":C.info,"Nabídka odeslána":C.warning,"Jednání":C.accent,"Vyhráno":C.success,"Prohráno":C.danger,
  "Plánováno":C.info,"Probíhá":C.warning,"Dokončeno":C.success,"Zrušeno":C.textDim,
};
const INDUSTRIES = ["Výroba","Logistika","Automotive","Stavebnictví","Zemědělství","Obchod","Jiné"];
const TASK_TYPES = ["Telefonát","Návštěva","E-mail","Nabídka","Prezentace","Jiné"];
const VZV_TYPES = ["Elektrický čelní","Elektrický CPD25","Dieselový","LPG","Retrák","Nízkozdvižný","Jiné"];
const COMPETITORS = ["Toyota","Linde","Jungheinrich","Still","Crown","Manitou","Doosan","Jiný"];
const REGIONS = ["Ústecký","Liberecký","Středočeský","Jiný"];

const uid = () => Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().split("T")[0];
const clean = (obj) => Object.fromEntries(Object.entries(obj).map(([k,v])=>[k, v===""?null:v]));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const fmtMoney = (n) => n ? new Intl.NumberFormat("cs-CZ",{style:"currency",currency:"CZK",maximumFractionDigits:0}).format(n) : "—";
const fmtDateShort = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now - date) / 86400000);
  if (diff === 0) return "dnes";
  if (diff === 1) return "včera";
  if (diff < 7) return `${diff} dní`;
  return date.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"});
};
const isOverdue = (date,status) => date && !["Dokončeno","Zrušeno","Vyhráno","Prohráno"].includes(status) && new Date(date) < new Date(today());

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
  calendar: ["M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z","M16 2v4M8 2v4M3 10h18"],
  logout: ["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4","M16 17l5-5-5-5","M21 12H9"],
  user: ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2","M12 11a4 4 0 100-8 4 4 0 000 8z"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 100 6 3 3 0 000-6z"],
  eyeOff: ["M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24","M1 1l22 22"],
};

const inp = {
  width:"100%", background:C.white, border:`1px solid ${C.border}`,
  borderRadius:8, padding:"8px 12px", color:C.text, fontSize:16,
  outline:"none", boxSizing:"border-box", transition:"border-color 0.15s",
  WebkitAppearance:"none", appearance:"none", lineHeight:1.4,
};

const s = {
  badge: (color) => ({ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}33`, letterSpacing:"0.3px", whiteSpace:"nowrap" }),
  card: { background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 22px", marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  btn: (v="primary") => ({
    display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, transition:"all 0.15s",
    ...(v==="primary"?{background:C.accent,color:C.white,boxShadow:`0 2px 8px ${C.accentGlow}`}:
       v==="ghost"?{background:"transparent",color:C.textMuted,border:`1px solid ${C.border}`}:
       v==="danger"?{background:`${C.danger}10`,color:C.danger,border:`1px solid ${C.danger}30`}:
       v==="gcal"?{background:"#EEF4FF",color:C.info,border:`1px solid ${C.info}30`}:
       v==="gcal-big"?{background:C.info,color:C.white,boxShadow:`0 2px 8px rgba(37,99,235,0.3)`,fontSize:15,padding:"13px 20px"}:
       {background:C.bg,color:C.text,border:`1px solid ${C.border}`}),
  }),
  label: { display:"block", fontSize:11, fontWeight:700, color:C.textMuted, marginBottom:4, letterSpacing:"0.5px", textTransform:"uppercase" },
};

// --- KOMPONENTY ---
const StatusBadge = ({status}) => <span style={s.badge(STATUS_COLORS[status]||C.textMuted)}>{status}</span>;
const Field = ({label,children}) => <div style={{marginBottom:10}}><label style={s.label}>{label}</label>{children}</div>;
const Input = (props) => <input style={inp} {...props}/>;
const Textarea = (props) => <textarea style={{...inp,minHeight:72,resize:"vertical"}} {...props}/>;
const Sel = ({options, withEmpty, emptyLabel, ...props}) => (
  <select style={inp} {...props}>
    {withEmpty && <option value="">{emptyLabel||"— vyberte —"}</option>}
    {options.map(o => typeof o==="string"
      ? <option key={o} value={o}>{o}</option>
      : <option key={o.id} value={o.id}>{o.name||o.full_name||o.email}</option>
    )}
  </select>
);

const AutocompleteInput = ({ value, onChange, suggestions, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const handleChange = (v) => {
    onChange(v);
    const f = suggestions.filter(s => s.toLowerCase().includes(v.toLowerCase()));
    setFiltered(f);
    setOpen(v.length > 0 && f.length > 0);
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.textDim, pointerEvents:"none" }}>
        <Icon d={Icons.search} size={14} />
      </div>
      <input style={{ ...inp, paddingLeft:34 }} value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (value.length === 0) { setFiltered(suggestions); setOpen(suggestions.length > 0); } }}
        placeholder={placeholder}/>
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200, background:C.white, border:`1px solid ${C.border}`, borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", maxHeight:220, overflow:"auto", marginTop:2 }}>
          {filtered.map((item, i) => (
            <div key={i} onMouseDown={() => { onChange(item); setOpen(false); }}
              style={{ padding:"10px 14px", cursor:"pointer", fontSize:15, color:C.text, borderBottom: i < filtered.length-1 ? `1px solid ${C.border}` : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = C.accentLight}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >{item}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const Modal = ({title, onClose, children, onSave, saveLabel="Uložit", saveDisabled}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.white,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:600,maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 32px rgba(0,0,0,0.15)"}}>
      <div style={{padding:"12px 20px 0",flexShrink:0}}>
        <div style={{width:40,height:4,borderRadius:2,background:C.border,margin:"0 auto 12px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.textMuted,padding:4}}><Icon d={Icons.x} size={20}/></button>
        </div>
      </div>
      <div style={{flex:1,overflow:"auto",padding:"0 20px"}}>
        {children}
        <div style={{height:16}}/>
      </div>
      {onSave && (
        <div style={{padding:"12px 20px 24px",borderTop:`1px solid ${C.border}`,background:C.white,flexShrink:0,display:"flex",gap:10}}>
          <button onClick={onClose} style={{...s.btn("ghost"),flex:1,justifyContent:"center",padding:"13px",fontSize:15}}>Zrušit</button>
          <button onClick={onSave} disabled={saveDisabled} style={{...s.btn("primary"),flex:2,justifyContent:"center",padding:"13px",fontSize:15,opacity:saveDisabled?0.5:1}}>{saveLabel}</button>
        </div>
      )}
      {!onSave && <div style={{height:20,flexShrink:0}}/>}
    </div>
  </div>
);

// --- LOGIN OBRAZOVKA ---
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Vyplňte email a heslo"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await authFetch("token?grant_type=password", { email, password });
      storeSession(data);
      onLogin(data);
    } catch (e) {
      setError("Nesprávný email nebo heslo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg, ${C.accentLight} 0%, ${C.bg} 50%, ${C.yellowLight} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',system-ui,sans-serif",padding:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;}input:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px ${C.accentGlow}!important;outline:none;}`}</style>
      <div style={{background:C.white,borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:400,boxShadow:"0 8px 40px rgba(0,0,0,0.12)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{background:C.accent,borderRadius:10,padding:"8px 10px",display:"flex",alignItems:"center",borderRight:`4px solid ${C.yellow}`}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17V7h4l3 5v5M14 9h4l2 4v4h-6V9z"/><circle cx="7" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 17h14v2H3z"/>
              </svg>
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:22,color:C.text,letterSpacing:"-0.5px"}}>VIVA <span style={{color:C.accent}}>CRM</span></div>
              <div style={{fontSize:10,color:C.textDim,letterSpacing:"1px",textTransform:"uppercase"}}>Lovosice · Hangcha VZV</div>
            </div>
          </div>
          <p style={{margin:0,color:C.textMuted,fontSize:14}}>Přihlaste se ke svému účtu</p>
        </div>

        {error && (
          <div style={{background:`${C.danger}10`,border:`1px solid ${C.danger}30`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.danger,fontWeight:500}}>
            ⚠ {error}
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={s.label}>Email</label>
          <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="vas@email.cz" onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        </div>

        <div style={{marginBottom:24}}>
          <label style={s.label}>Heslo</label>
          <div style={{position:"relative"}}>
            <input style={{...inp,paddingRight:44}} type={showPass?"text":"password"}
              value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            <button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textDim,padding:0,display:"flex"}}>
              <Icon d={showPass?Icons.eyeOff:Icons.eye} size={16}/>
            </button>
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading} style={{...s.btn("primary"),width:"100%",justifyContent:"center",padding:"14px",fontSize:15,opacity:loading?0.7:1}}>
          {loading ? "Přihlašuji…" : "Přihlásit se"}
        </button>

        <div style={{marginTop:20,padding:"14px",background:C.bg,borderRadius:10,fontSize:12,color:C.textMuted,textAlign:"center",lineHeight:1.6}}>
          💡 Nemáte účet? Kontaktujte správce systému.<br/>
          <span style={{color:C.textDim,fontSize:11}}>Admin vytvoří váš účet v nastavení.</span>
        </div>
      </div>
    </div>
  );
};

// --- SPRÁVA UŽIVATELŮ (admin panel) ---
const UserManagement = ({ session, profiles, onRefresh }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ email:"", password:"", full_name:"", role:"obchodnik", region:"Ústecký" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const createUser = async () => {
    if (!form.email || !form.password || !form.full_name) { setError("Vyplňte všechna povinná pole"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: { full_name: form.full_name, role: form.role },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Chyba vytvoření uživatele");

      await sb(`profiles`, {
        method: "POST",
        body: JSON.stringify({ id: data.id, email: form.email, full_name: form.full_name, role: form.role, region: form.region }),
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" }
      }, session.access_token);

      setSuccess(`Uživatel ${form.full_name} byl vytvořen. Může se přihlásit na ${form.email}`);
      setForm({ email:"", password:"", full_name:"", role:"obchodnik", region:"Ústecký" });
      onRefresh();
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const u = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>Správa uživatelů</h2>
        <button onClick={()=>{setModal(true);setError("");setSuccess("");}} style={s.btn("primary")}>
          <Icon d={Icons.plus} size={14}/>Přidat uživatele
        </button>
      </div>

      <div style={{display:"grid",gap:12}}>
        {profiles.map(p=>(
          <div key={p.id} style={{...s.card,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:p.role==="admin"?C.accentLight:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`2px solid ${p.role==="admin"?C.accent:C.border}`}}>
              <Icon d={p.role==="admin"?Icons.shield:Icons.user} size={18} stroke={p.role==="admin"?C.accent:C.textMuted}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>{p.full_name||"—"}</div>
              <div style={{fontSize:12,color:C.textMuted}}>{p.email}</div>
              {p.region&&<div style={{fontSize:11,color:C.textDim}}>Region: {p.region}</div>}
            </div>
            <span style={s.badge(p.role==="admin"?C.accent:C.info)}>{p.role==="admin"?"Admin":"Obchodník"}</span>
          </div>
        ))}
        {profiles.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textDim}}>Žádní uživatelé</div>}
      </div>

      {modal && (
        <Modal title="Nový uživatel" onClose={()=>setModal(false)}
          onSave={createUser} saveLabel={loading?"Vytvářím…":"Vytvořit uživatele"} saveDisabled={loading}>
          {error&&<div style={{background:`${C.danger}10`,border:`1px solid ${C.danger}30`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.danger}}>⚠ {error}</div>}
          {success&&<div style={{background:`${C.success}10`,border:`1px solid ${C.success}30`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.success}}>✓ {success}</div>}
          <Field label="Celé jméno *"><Input value={form.full_name} onChange={e=>u("full_name",e.target.value)} placeholder="Jan Novák"/></Field>
          <Field label="Email *"><Input type="email" value={form.email} onChange={e=>u("email",e.target.value)} placeholder="jan.novak@viva.cz"/></Field>
          <Field label="Heslo *"><Input type="password" value={form.password} onChange={e=>u("password",e.target.value)} placeholder="min. 6 znaků"/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Role"><Sel options={["obchodnik","admin"]} value={form.role} onChange={e=>u("role",e.target.value)}/></Field>
            <Field label="Region"><Sel options={REGIONS} value={form.region} onChange={e=>u("region",e.target.value)}/></Field>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- GCAL ---
const gcalLink = (task, company, contact) => {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const title = encodeURIComponent(`[VZV] ${task.title}${company?" – "+company.name:""}`);
  const details = encodeURIComponent(`Typ: ${task.type}\n${contact?"Kontakt: "+contact.name:""}\n${task.note||""}`);
  const dateStr = task.date || today();
  let dates;
  if (task.time) {
    const start = `${dateStr.replace(/-/g,"")}T${task.time.replace(":","")}00`;
    const [h,m] = task.time.split(":").map(Number);
    const endH = String(h+1).padStart(2,"0");
    const end = `${dateStr.replace(/-/g,"")}T${endH}${String(m).padStart(2,"0")}00`;
    dates = `${start}/${end}`;
  } else {
    const d = dateStr.replace(/-/g,"");
    dates = `${d}/${d}`;
  }
  return `${base}&text=${title}&dates=${dates}&details=${details}`;
};

const GCalPrompt = ({task, companies, contacts, onClose}) => {
  const company = companies.find(c=>c.id===task.company_id);
  const contact = contacts.find(c=>c.id===task.contact_id);
  const link = gcalLink(task, company, contact);
  return (
    <div style={{textAlign:"center",padding:"8px 0"}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:"#EEF4FF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
        <Icon d={Icons.calendar} size={32} stroke={C.info}/>
      </div>
      <h3 style={{margin:"0 0 8px",fontSize:20,fontWeight:800,color:C.text}}>Úkol uložen! 🎉</h3>
      <p style={{margin:"0 0 24px",fontSize:15,color:C.textMuted,lineHeight:1.5}}>
        Přidat <strong>{task.title}</strong> do Google Kalendáře?
        {task.date&&<><br/><span style={{fontSize:13,color:C.textDim}}>{fmtDate(task.date)}{task.time?` · ${task.time}`:""}</span></>}
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <a href={link} target="_blank" rel="noreferrer" onClick={onClose}
          style={{...s.btn("gcal-big"),textDecoration:"none",justifyContent:"center",width:"100%",boxSizing:"border-box"}}>
          <Icon d={Icons.gcal} size={18}/>Přidat do Google Kalendáře
        </a>
        <button onClick={onClose} style={{...s.btn("ghost"),justifyContent:"center",padding:"13px",fontSize:15}}>Přeskočit</button>
      </div>
    </div>
  );
};

const SyncBadge = ({status}) => {
  const cfg = { syncing:{color:C.warning,label:"Ukládám…"}, ok:{color:C.success,label:"Synchronizováno"}, error:{color:C.danger,label:"Chyba spojení"}, loading:{color:C.info,label:"Načítám…"} }[status]||{color:C.textDim,label:""};
  return (
    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:cfg.color,fontWeight:500}}>
      <div style={{width:6,height:6,borderRadius:3,background:cfg.color}}/>{cfg.label}
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

const AddButton = ({onClick}) => (
  <button onClick={onClick} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:"50%",border:`2px solid ${C.accent}`,background:C.accentLight,color:C.accent,cursor:"pointer",flexShrink:0,transition:"all 0.15s",padding:0}}
    onMouseEnter={e=>{e.currentTarget.style.background=C.accent;e.currentTarget.style.color=C.white;}}
    onMouseLeave={e=>{e.currentTarget.style.background=C.accentLight;e.currentTarget.style.color=C.accent;}}
  ><Icon d={Icons.plus} size={14}/></button>
);

const CardSectionHeader = ({title, onAdd}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{title}</div>
    {onAdd&&<AddButton onClick={onAdd}/>}
  </div>
);

const NoteTypeBadge = ({type}) => {
  const t = NOTE_TYPES[type];
  if (!t) return null;
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:4,background:t.bg,color:t.color,padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:600,border:`1px solid ${t.border}`}}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {Array.isArray(t.icon)?t.icon.map((p,i)=><path key={i} d={p}/>):<path d={t.icon}/>}
      </svg>
      {t.label}
    </div>
  );
};

const NoteTypeSelector = ({selected, onSelect}) => (
  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
    {Object.entries(NOTE_TYPES).map(([key, t]) => {
      const active = selected === key;
      return (
        <button key={key} onClick={()=>onSelect(key)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:`1.5px solid ${active?t.stroke:C.border}`,background:active?t.bg:C.white,color:active?t.color:C.textMuted,transition:"all 0.15s"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={active?t.stroke:"currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {Array.isArray(t.icon)?t.icon.map((p,i)=><path key={i} d={p}/>):<path d={t.icon}/>}
          </svg>
          {t.label}
        </button>
      );
    })}
  </div>
);

const NoteItem = ({note, origIdx, onEdit, onDelete}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = (note.text||"").length > LONG_NOTE;
  return (
    <div style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{width:6,height:6,borderRadius:3,background:C.accent,marginTop:5,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
            <NoteTypeBadge type={note.type}/>
            <span style={{fontSize:11,color:C.textDim}}>{fmtDate(note.date)}</span>
          </div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.5,...(isLong&&!expanded?{overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}:{})}}>{note.text}</div>
          {isLong&&<button onClick={()=>setExpanded(!expanded)} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:12,fontWeight:600,padding:"4px 0 0",textDecoration:"underline"}}>{expanded?"Skrýt":"Zobrazit více"}</button>}
        </div>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          <button onClick={()=>onEdit(origIdx,note.text,note.type)} style={{background:"none",border:"none",cursor:"pointer",color:C.textDim,padding:"2px 4px",borderRadius:4}}><Icon d={Icons.edit} size={13}/></button>
          <button onClick={()=>onDelete(origIdx)} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,padding:"2px 4px",borderRadius:4}}><Icon d={Icons.trash} size={13}/></button>
        </div>
      </div>
    </div>
  );
};

const NoteEntry = ({notes=[], onAdd, onUpdate, onDelete}) => {
  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState("email");
  const [editIdx, setEditIdx] = useState(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("email");
  const submit = () => { if (text.trim()) { onAdd(text.trim(), noteType); setText(""); } };
  const startEdit = (i, currentText, currentType) => { setEditIdx(i); setEditText(currentText); setEditType(currentType||"email"); };
  const saveEdit = (i) => { if (editText.trim()) onUpdate(i, editText.trim(), editType); setEditIdx(null); };
  const reversed = [...notes].map((n,i)=>({...n,origIdx:i})).reverse();
  return (
    <div>
      <NoteTypeSelector selected={noteType} onSelect={setNoteType}/>
      <div style={{display:"flex",gap:8}}>
        <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&e.ctrlKey&&submit()} placeholder="Napiš poznámku…" style={{...inp,minHeight:64,resize:"vertical",flex:1}}/>
        <AddButton onClick={submit}/>
      </div>
      <div style={{fontSize:10,color:C.textDim,marginTop:4,marginBottom:12}}>Ctrl+Enter pro uložení</div>
      <div>
        {reversed.map((n) => (
          editIdx===n.origIdx ? (
            <div key={n.origIdx} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <NoteTypeSelector selected={editType} onSelect={setEditType}/>
              <textarea style={{...inp,minHeight:80,resize:"vertical",marginBottom:8}} value={editText} onChange={e=>setEditText(e.target.value)} autoFocus/>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>saveEdit(n.origIdx)} style={{...s.btn("primary"),padding:"6px 14px",fontSize:12}}><Icon d={Icons.check} size={12}/>Uložit</button>
                <button onClick={()=>setEditIdx(null)} style={{...s.btn("ghost"),padding:"6px 14px",fontSize:12}}>Zrušit</button>
              </div>
            </div>
          ) : <NoteItem key={n.origIdx} note={n} origIdx={n.origIdx} onEdit={startEdit} onDelete={onDelete}/>
        ))}
        {notes.length===0&&<div style={{color:C.textDim,fontSize:13,textAlign:"center",padding:"14px 0"}}>Zatím žádné poznámky</div>}
      </div>
    </div>
  );
};

// --- FORMS ---
const TaskFormFields = ({f, u, companies, contacts, profiles}) => {
  const rc = f.company_id ? contacts.filter(c=>c.company_id===f.company_id) : contacts;
  return (
    <div>
      <Field label="Název *"><Input value={f.title} onChange={e=>u("title",e.target.value)} placeholder="Telefonát ohledně nabídky"/></Field>
      <Field label="Typ"><Sel options={TASK_TYPES} value={f.type} onChange={e=>u("type",e.target.value)}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Datum"><Input type="date" value={f.date||""} onChange={e=>u("date",e.target.value)}/></Field>
        <Field label="Čas"><Input type="time" value={f.time||""} onChange={e=>u("time",e.target.value)}/></Field>
      </div>
      <Field label="Firma"><Sel options={companies} withEmpty emptyLabel="— bez firmy —" value={f.company_id||""} onChange={e=>{u("company_id",e.target.value);u("contact_id","");}}/></Field>
      <Field label="Kontakt"><Sel options={rc} withEmpty emptyLabel="— bez kontaktu —" value={f.contact_id||""} onChange={e=>u("contact_id",e.target.value)}/></Field>
      <Field label="Stav"><Sel options={STATUSES.task} value={f.status} onChange={e=>u("status",e.target.value)}/></Field>
      <Field label="Poznámka"><Textarea value={f.note||""} onChange={e=>u("note",e.target.value)}/></Field>
    </div>
  );
};

const DealFormFields = ({f, u, companies, contacts}) => {
  const rc = contacts.filter(c=>c.company_id===f.company_id);
  return (
    <div>
      <Field label="Název *"><Input value={f.title} onChange={e=>u("title",e.target.value)} placeholder="2x HC CPD25"/></Field>
      <Field label="Firma"><Sel options={companies} withEmpty emptyLabel="— vyberte —" value={f.company_id||""} onChange={e=>{u("company_id",e.target.value);u("contact_id","");}}/></Field>
      <Field label="Kontakt"><Sel options={rc} withEmpty emptyLabel="— vyberte —" value={f.contact_id||""} onChange={e=>u("contact_id",e.target.value)}/></Field>
      <Field label="Typ VZV"><Sel options={VZV_TYPES} withEmpty emptyLabel="— vyberte —" value={f.type||""} onChange={e=>u("type",e.target.value)}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Počet ks"><Input type="number" value={f.qty||1} onChange={e=>u("qty",e.target.value)} min={1}/></Field>
        <Field label="Hodnota (Kč)"><Input type="number" value={f.value||""} onChange={e=>u("value",e.target.value)} placeholder="0"/></Field>
      </div>
      <Field label="Stav"><Sel options={STATUSES.deal} value={f.status} onChange={e=>u("status",e.target.value)}/></Field>
      <Field label="Datum followupu"><Input type="date" value={f.due_date||""} onChange={e=>u("due_date",e.target.value)}/></Field>
      <Field label="Poznámka"><Textarea value={f.note||""} onChange={e=>u("note",e.target.value)}/></Field>
    </div>
  );
};

const CompanyFormFields = ({f, u}) => (
  <div>
    <Field label="Název *"><Input value={f.name} onChange={e=>u("name",e.target.value)} placeholder="Firma s.r.o."/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Field label="IČO"><Input value={f.ico||""} onChange={e=>u("ico",e.target.value)}/></Field>
      <Field label="Počet VZV"><Input type="number" value={f.fleet||0} onChange={e=>u("fleet",Number(e.target.value))}/></Field>
    </div>
    <Field label="Odvětví"><Sel options={INDUSTRIES} withEmpty emptyLabel="— vyberte —" value={f.industry||""} onChange={e=>u("industry",e.target.value)}/></Field>
    <Field label="Stav"><Sel options={STATUSES.company} value={f.status} onChange={e=>u("status",e.target.value)}/></Field>
    <Field label="Adresa"><Input value={f.address||""} onChange={e=>u("address",e.target.value)} placeholder="Ústí nad Labem"/></Field>
    <Field label="Stávající dodavatel"><Sel options={COMPETITORS} withEmpty emptyLabel="— vyberte —" value={f.competitor||""} onChange={e=>u("competitor",e.target.value)}/></Field>
  </div>
);

const ContactFormFields = ({f, u, companies}) => (
  <div>
    <Field label="Jméno *"><Input value={f.name} onChange={e=>u("name",e.target.value)}/></Field>
    <Field label="Firma"><Sel options={companies} withEmpty emptyLabel="— bez firmy —" value={f.company_id||""} onChange={e=>u("company_id",e.target.value)}/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Field label="Pozice"><Input value={f.position||""} onChange={e=>u("position",e.target.value)}/></Field>
      <Field label="Role"><Sel options={["Rozhodovatel","Influencer","Uživatel","Blokátor"]} value={f.role||""} onChange={e=>u("role",e.target.value)}/></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Field label="Telefon"><Input value={f.phone||""} onChange={e=>u("phone",e.target.value)} placeholder="+420…"/></Field>
      <Field label="E-mail"><Input value={f.email||""} onChange={e=>u("email",e.target.value)}/></Field>
    </div>
    <Field label="LinkedIn"><Input value={f.linkedin||""} onChange={e=>u("linkedin",e.target.value)}/></Field>
    <Field label="Poznámka (obchodní)"><Textarea value={f.note||""} onChange={e=>u("note",e.target.value)}/></Field>
    <Field label="😊 Osobní poznámky"><Textarea value={f.personal_note||""} onChange={e=>u("personal_note",e.target.value)} placeholder="Záliby, charakter…"/></Field>
  </div>
);

const TaskModal = ({initial, companies, contacts, profiles, onSave, onClose}) => {
  const [f,setF] = useState(initial||{title:"",type:"Telefonát",company_id:"",contact_id:"",date:today(),time:"",status:"Plánováno",note:""});
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  return <Modal title={initial?.id?"Upravit úkol":"Nový úkol"} onClose={onClose} onSave={()=>f.title&&onSave(f)} saveLabel="Uložit úkol" saveDisabled={!f.title}><TaskFormFields f={f} u={u} companies={companies} contacts={contacts} profiles={profiles}/></Modal>;
};
const DealModal = ({initial, companies, contacts, onSave, onClose}) => {
  const [f,setF] = useState(initial||{title:"",company_id:"",contact_id:"",type:"",qty:1,value:"",status:"Identifikováno",due_date:"",note:""});
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  return <Modal title={initial?.id?"Upravit deal":"Nový deal"} onClose={onClose} onSave={()=>f.title&&onSave(f)} saveLabel="Uložit deal" saveDisabled={!f.title}><DealFormFields f={f} u={u} companies={companies} contacts={contacts}/></Modal>;
};
const CompanyModal = ({initial, onSave, onClose}) => {
  const [f,setF] = useState(initial||{name:"",industry:"",address:"",ico:"",status:"Studený",fleet:0,competitor:"",notes:[]});
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  return <Modal title={initial?.id?"Upravit firmu":"Nová firma"} onClose={onClose} onSave={()=>f.name&&onSave(f)} saveLabel="Uložit firmu" saveDisabled={!f.name}><CompanyFormFields f={f} u={u}/></Modal>;
};
const ContactModal = ({initial, companies, onSave, onClose}) => {
  const [f,setF] = useState(initial||{name:"",company_id:"",position:"",phone:"",email:"",linkedin:"",role:"Rozhodovatel",note:"",personal_note:""});
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  return <Modal title={initial?.id?"Upravit kontakt":"Nový kontakt"} onClose={onClose} onSave={()=>f.name&&onSave(f)} saveLabel="Uložit kontakt" saveDisabled={!f.name}><ContactFormFields f={f} u={u} companies={companies}/></Modal>;
};

// --- DASHBOARD ---
const Dashboard = ({data, profile, onNavigate}) => {
  const {companies,contacts,deals,tasks,profiles} = data;
  const myTasks = tasks.filter(t=>t.owner_id===profile?.id||!t.owner_id);
  const activeDeals = deals.filter(d=>!["Vyhráno","Prohráno"].includes(d.status));
  const pipeline = activeDeals.reduce((s,d)=>s+(d.value||0),0);
  const won = deals.filter(d=>d.status==="Vyhráno").reduce((s,d)=>s+(d.value||0),0);
  const overdue = myTasks.filter(t=>isOverdue(t.date,t.status));
  const todayTasks = myTasks.filter(t=>t.date===today()&&["Plánováno","Probíhá"].includes(t.status)).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  const upcoming = myTasks.filter(t=>t.status==="Plánováno"&&t.date>today()).sort((a,b)=>(a.date||"").localeCompare(b.date||""));

  const days = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-6+i); return d.toISOString().split("T")[0]; });
  const dayLabels = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-6+i); return ["Ne","Po","Út","St","Čt","Pá","So"][d.getDay()]; });
  const activityByDay = days.map(day=>companies.reduce((acc,c)=>acc+(c.notes||[]).filter(n=>n.date===day).length,0));
  const maxActivity = Math.max(...activityByDay,1);
  const totalActivity = activityByDay.reduce((a,b)=>a+b,0);

  const firstName = profile?.full_name?.split(" ")[0] || "obchodníku";

  const Stat = ({icon,label,value,sub,color,onClick}) => (
    <div onClick={onClick} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px",flex:1,minWidth:140,cursor:onClick?"pointer":"default",borderTop:`3px solid ${color}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",transition:"all 0.2s"}}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.1)")}
      onMouseLeave={e=>(e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)")}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>{label}</div>
          <div style={{fontSize:22,fontWeight:800,color:C.text}}>{value}</div>
          {sub&&<div style={{fontSize:11,color:C.textDim,marginTop:3}}>{sub}</div>}
        </div>
        <div style={{background:`${color}15`,borderRadius:8,padding:8,color}}><Icon d={icon} size={18}/></div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:16,padding:"20px 24px",background:C.white,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{fontSize:11,color:C.textDim,marginBottom:3,fontWeight:500}}>{new Date().toLocaleDateString("cs-CZ",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Dobrý den, {firstName} 👋</h1>
        <p style={{margin:"4px 0 0",color:C.textMuted,fontSize:13}}>Přehled VZV pipeline · VIVA Lovosice{profile?.region?` · ${profile.region} region`:""}</p>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
        <Stat icon={Icons.building} label="Firmy" value={companies.length} sub={`${companies.filter(c=>c.status==="Zákazník").length} zákazníků`} color={C.info} onClick={()=>onNavigate("companies")}/>
        <Stat icon={Icons.target} label="Pipeline" value={fmtMoney(pipeline)} sub={`${activeDeals.length} příležitostí`} color={C.accent} onClick={()=>onNavigate("deals")}/>
        <Stat icon={Icons.check} label="Vyhráno" value={fmtMoney(won)} sub={`${deals.filter(d=>d.status==="Vyhráno").length} dealů`} color={C.success}/>
        <Stat icon={Icons.clock} label="Po termínu" value={overdue.length} sub={overdue.length>0?"nutná akce":"vše v pořádku"} color={overdue.length>0?C.danger:C.success} onClick={()=>onNavigate("tasks")}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={s.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px"}}>Aktivita za 7 dní</div>
            <div style={{fontSize:11,color:C.textDim}}>poznámky z terénu</div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:64,marginBottom:8}}>
            {activityByDay.map((count,i)=>{
              const isToday = i===6;
              const height = count===0 ? 4 : Math.max(8,Math.round((count/maxActivity)*60));
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{width:"100%",height,background:isToday?C.accent:count===0?C.bg:`${C.accent}55`,borderRadius:"3px 3px 0 0",position:"relative"}}>
                    {count>0&&<div style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:700,color:isToday?C.accent:C.textMuted}}>{count}</div>}
                  </div>
                  <div style={{fontSize:10,color:isToday?C.accent:C.textDim,fontWeight:isToday?700:400}}>{dayLabels[i]}</div>
                </div>
              );
            })}
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:11,color:C.textMuted,flexShrink:0}}>Týdenní cíl: <strong>{totalActivity}/10</strong></div>
            <div style={{flex:1,background:C.bg,borderRadius:3,height:5}}>
              <div style={{width:`${Math.min(100,totalActivity/10*100)}%`,background:C.accent,height:"100%",borderRadius:3}}/>
            </div>
          </div>
        </div>

        <div style={s.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px"}}>
              Dnes{todayTasks.length>0?` · ${todayTasks.length} úkolů`:""}
            </div>
            <button onClick={()=>onNavigate("tasks")} style={{fontSize:11,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Vše →</button>
          </div>
          {overdue.slice(0,2).map(t=>{
            const company=companies.find(c=>c.id===t.company_id);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#FEF2F2",borderRadius:8,marginBottom:6,borderLeft:`3px solid ${C.danger}`}}>
                <div style={{fontSize:11,color:C.danger,fontWeight:700,minWidth:28}}>⚠</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:C.danger,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                  <div style={{fontSize:10,color:`${C.danger}99`}}>{company?.name} · {fmtDate(t.date)}</div>
                </div>
              </div>
            );
          })}
          {todayTasks.length===0&&overdue.length===0&&<div style={{textAlign:"center",padding:"12px 0",color:C.textDim,fontSize:13}}>Žádné úkoly na dnes 🎉</div>}
          {todayTasks.map(t=>{
            const company=companies.find(c=>c.id===t.company_id);
            const typeColors={Telefonát:C.warning,Návštěva:C.accent,"E-mail":C.info,Nabídka:C.purple};
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.bg,borderRadius:8,marginBottom:5,borderLeft:`3px solid ${typeColors[t.type]||C.border}`}}>
                <div style={{fontSize:11,color:C.textDim,minWidth:36,fontWeight:500}}>{t.time||"—"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                  <div style={{fontSize:10,color:C.textDim}}>{company?.name}</div>
                </div>
                <span style={{...s.badge(typeColors[t.type]||C.textDim),fontSize:10,padding:"1px 6px"}}>{t.type}</span>
              </div>
            );
          })}
          {upcoming.slice(0,3).map(t=>{
            const company=companies.find(c=>c.id===t.company_id);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:`1px solid ${C.border}`}}>
                <div style={{width:6,height:6,borderRadius:3,background:C.accent,flexShrink:0}}/>
                <div style={{flex:1,fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                <div style={{fontSize:11,color:C.textDim,flexShrink:0}}>{fmtDate(t.date)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={s.card}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:14}}>Pipeline po fázích</div>
          {["Identifikováno","Nabídka odeslána","Jednání"].map(stage=>{
            const items=deals.filter(d=>d.status===stage);
            const val=items.reduce((s,d)=>s+(d.value||0),0);
            const maxVal=Math.max(...["Identifikováno","Nabídka odeslána","Jednání"].map(st=>deals.filter(d=>d.status===st).reduce((s,d)=>s+(d.value||0),0)),1);
            return (
              <div key={stage} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,color:C.text,fontWeight:500}}>{stage}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.accent}}>{items.length>0?fmtMoney(val):"—"}</span>
                </div>
                <div style={{height:6,background:C.bg,borderRadius:3}}><div style={{height:"100%",width:`${val/maxVal*100}%`,background:STATUS_COLORS[stage],borderRadius:3}}/></div>
                <div style={{fontSize:10,color:C.textDim,marginTop:3}}>{items.length} příležitostí</div>
              </div>
            );
          })}
        </div>

        {profile?.role==="admin" && profiles.length > 0 ? (
          <div style={s.card}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:14}}>Tým · aktivita</div>
            {profiles.map(p=>{
              const pTasks=tasks.filter(t=>t.owner_id===p.id&&["Plánováno","Probíhá"].includes(t.status));
              const pDeals=deals.filter(d=>d.created_by===p.id&&!["Vyhráno","Prohráno"].includes(d.status));
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.accent,flexShrink:0}}>
                    {(p.full_name||p.email||"?")[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{p.full_name||p.email}</div>
                    <div style={{fontSize:11,color:C.textDim}}>{p.region||"—"}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <span style={s.badge(C.info)}>{pTasks.length} úk.</span>
                    <span style={s.badge(C.accent)}>{pDeals.length} d.</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={s.card}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:14}}>Aktivní firmy</div>
            {companies.filter(c=>["Aktivní jednání","Oslovený"].includes(c.status)).slice(0,5).map(c=>(
              <div key={c.id} onClick={()=>onNavigate("companies",c.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.querySelector&&(e.currentTarget.style.background=C.accentLight)}
                onMouseLeave={e=>e.currentTarget.querySelector&&(e.currentTarget.style.background="transparent")}>
                <div style={{width:8,height:8,borderRadius:"50%",background:STATUS_COLORS[c.status],flexShrink:0}}/>
                <div style={{flex:1,fontSize:13,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <StatusBadge status={c.status}/>
              </div>
            ))}
            {companies.filter(c=>["Aktivní jednání","Oslovený"].includes(c.status)).length===0&&<div style={{fontSize:13,color:C.textDim}}>Žádné aktivní firmy</div>}
          </div>
        )}
      </div>
    </div>
  );
};

// --- HELPERS pro sledování posledního zobrazení firmy ---
const getViewedAt = () => {
  try { return JSON.parse(localStorage.getItem("vzv_viewed_at") || "{}"); } catch { return {}; }
};
const recordViewedAt = (id) => {
  const map = getViewedAt();
  map[id] = new Date().toISOString();
  localStorage.setItem("vzv_viewed_at", JSON.stringify(map));
};
const getLastInteraction = (company, viewedAt) => {
  const lastNote = (company.notes || []).reduce((best, n) => (n.date||"") > best ? (n.date||"") : best, "");
  const lastView = viewedAt[company.id] || "";
  return lastNote > lastView ? lastNote : lastView;
};

// --- COMPANIES ---
const Companies = ({data,ops,focusId,onClearFocus}) => {
  const [modal,setModal] = useState(null);
  const [gcalTask,setGcalTask] = useState(null);
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState("Vše");
  const [detail,setDetail] = useState(focusId&&focusId!=="new"?focusId:null);
  const [viewedAt, setViewedAtState] = useState(getViewedAt);

  useEffect(()=>{
    if(focusId&&focusId!=="new"){handleSetDetail(focusId);onClearFocus&&onClearFocus();}
    else if(focusId==="new"){setModal("new");onClearFocus&&onClearFocus();}
  }, [focusId]);

  const handleSetDetail = (id) => {
    if (id) { recordViewedAt(id); setViewedAtState(getViewedAt()); }
    setDetail(id);
  };

  const companyNames = data.companies.map(c=>c.name);
  const filtered = data.companies
    .filter(c=>{
      const ms=c.name.toLowerCase().includes(search.toLowerCase())||(c.address||"").toLowerCase().includes(search.toLowerCase());
      return ms&&(filter==="Vše"||c.status===filter);
    })
    .sort((a,b)=>{
      const ia = getLastInteraction(a, viewedAt);
      const ib = getLastInteraction(b, viewedAt);
      if (ib && ia) return ib.localeCompare(ia);
      if (ib) return 1;
      if (ia) return -1;
      return (a.name||"").localeCompare(b.name||"");
    });
  const dc = data.companies.find(c=>c.id===detail);
  const handleNoteAdd = async (text, type) => { await ops.upsertCompany({...dc, notes:[...(dc.notes||[]), {text, type, date:today()}]}); };
  const handleNoteUpdate = async (idx, text, type) => { const notes=[...(dc.notes||[])]; notes[idx]={...notes[idx],text,type}; await ops.upsertCompany({...dc,notes}); };
  const handleNoteDelete = async (idx) => { const notes=[...(dc.notes||[])]; notes.splice(idx,1); await ops.upsertCompany({...dc,notes}); };
  const initials = (name) => name ? name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() : "?";

  if (dc) return (
    <div>
      <button onClick={()=>handleSetDetail(null)} style={{...s.btn("ghost"),marginBottom:18}}>← Zpět na firmy</button>
      <div style={{...s.card,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:52,height:52,borderRadius:12,background:C.accentLight,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:C.accent,flexShrink:0}}>
              {initials(dc.name)}
            </div>
            <div>
              <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.text}}>{dc.name}</h1>
              <div style={{marginTop:5,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <StatusBadge status={dc.status}/>
                {dc.industry&&<span style={{fontSize:12,color:C.textMuted}}>{dc.industry}</span>}
                {dc.fleet>0&&<span style={{fontSize:12,color:C.textMuted}}>· {dc.fleet} VZV</span>}
                {dc.competitor&&<span style={{fontSize:12,color:C.textDim}}>· vs. {dc.competitor}</span>}
                {dc.address&&<span style={{fontSize:12,color:C.textDim}}>· {dc.address}</span>}
                {dc.ico&&<span style={{fontSize:12,color:C.textDim}}>· IČO: {dc.ico}</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
            <button onClick={()=>setModal("newTask")} style={{...s.btn("primary"),padding:"7px 14px",fontSize:12}}><Icon d={Icons.plus} size={12}/>Úkol</button>
            <button onClick={()=>setModal("newDeal")} style={{...s.btn("ghost"),padding:"7px 14px",fontSize:12}}><Icon d={Icons.target} size={12}/>Deal</button>
            <button onClick={()=>setModal("edit")} style={{...s.btn("ghost"),padding:"7px 14px",fontSize:12}}><Icon d={Icons.edit} size={12}/>Upravit</button>
            <button onClick={async()=>{await ops.deleteCompany(dc.id);handleSetDetail(null);}} style={{...s.btn("danger"),padding:"7px 10px",fontSize:12}}><Icon d={Icons.trash} size={12}/></button>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:14}}>
        <div>
          <div style={s.card}>
            <CardSectionHeader title="Kontaktní osoby" onAdd={()=>setModal("newContact")}/>
            {data.contacts.filter(ct=>ct.company_id===dc.id).map(ct=>(
              <div key={ct.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.textMuted,flexShrink:0,border:`1px solid ${C.border}`}}>
                  {(ct.name||"?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:C.text}}>{ct.name}</div>
                  <div style={{fontSize:11,color:C.textMuted,marginBottom:4}}>{ct.position} · <span style={s.badge(C.purple)}>{ct.role}</span></div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {ct.phone&&<a href={`tel:${ct.phone}`} style={{fontSize:12,color:C.accent,display:"flex",gap:3,alignItems:"center",textDecoration:"none",fontWeight:500}}><Icon d={Icons.phone} size={11}/>{ct.phone}</a>}
                    {ct.email&&<a href={`mailto:${ct.email}`} style={{fontSize:12,color:C.info,display:"flex",gap:3,alignItems:"center",textDecoration:"none"}}><Icon d={Icons.mail} size={11}/>{ct.email}</a>}
                  </div>
                  {ct.personal_note&&<div style={{fontSize:11,color:"#92610a",marginTop:5,background:C.yellowLight,padding:"4px 8px",borderRadius:5,border:`1px solid ${C.yellow}40`}}>😊 {ct.personal_note}</div>}
                </div>
              </div>
            ))}
            {data.contacts.filter(ct=>ct.company_id===dc.id).length===0&&<div style={{fontSize:12,color:C.textDim,textAlign:"center",padding:"10px 0"}}>Žádné kontakty</div>}
          </div>

          <div style={s.card}>
            <CardSectionHeader title="Dealy" onAdd={()=>setModal("newDeal")}/>
            {data.deals.filter(d=>d.company_id===dc.id).map(d=>(
              <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontSize:13,color:C.text,fontWeight:500}}>{d.title}</div>
                  <div style={{fontSize:11,color:C.textDim}}>{d.type}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.accent}}>{fmtMoney(d.value)}</div>
                  <StatusBadge status={d.status}/>
                </div>
              </div>
            ))}
            {data.deals.filter(d=>d.company_id===dc.id).length===0&&<div style={{fontSize:12,color:C.textDim,textAlign:"center",padding:"10px 0"}}>Žádné dealy</div>}
          </div>

          <div style={s.card}>
            <CardSectionHeader title="Úkoly" onAdd={()=>setModal("newTask")}/>
            {data.tasks.filter(t=>t.company_id===dc.id).map(t=>(
              <div key={t.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:6,height:6,borderRadius:3,background:STATUS_COLORS[t.status],flexShrink:0}}/>
                <div style={{flex:1}}><div style={{fontSize:12,color:C.text,fontWeight:500}}>{t.title}</div><div style={{fontSize:10,color:C.textDim}}>{t.type} · {fmtDate(t.date)}{t.time?` · ${t.time}`:""}</div></div>
                <StatusBadge status={t.status}/>
              </div>
            ))}
            {data.tasks.filter(t=>t.company_id===dc.id).length===0&&<div style={{fontSize:12,color:C.textDim,textAlign:"center",padding:"10px 0"}}>Žádné úkoly</div>}
          </div>
        </div>

        <div style={s.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>Aktivita · timeline</div>
            <div style={{fontSize:11,color:C.textDim}}>{(dc.notes||[]).length} záznamů</div>
          </div>
          <NoteEntry notes={dc.notes||[]} onAdd={handleNoteAdd} onUpdate={handleNoteUpdate} onDelete={handleNoteDelete}/>
        </div>
      </div>

      {modal==="edit"&&<CompanyModal initial={dc} onSave={async(f)=>{await ops.upsertCompany({...dc,...clean(f)});setModal(null);}} onClose={()=>setModal(null)}/>}
      {modal==="newDeal"&&<DealModal initial={{title:"",company_id:dc.id,contact_id:"",type:"",qty:1,value:"",status:"Identifikováno",due_date:"",note:""}} companies={data.companies} contacts={data.contacts} onSave={async(f)=>{await ops.upsertDeal({...clean(f),id:uid(),qty:Number(f.qty)||1,value:Number(f.value)||0});setModal(null);}} onClose={()=>setModal(null)}/>}
      {modal==="newTask"&&<TaskModal initial={{title:"",type:"Telefonát",company_id:dc.id,contact_id:"",date:today(),time:"",status:"Plánováno",note:""}} companies={data.companies} contacts={data.contacts} profiles={data.profiles} onSave={async(f)=>{const saved={...clean(f),id:uid()};await ops.upsertTask(saved);setModal(null);setGcalTask(saved);}} onClose={()=>setModal(null)}/>}
      {modal==="newContact"&&<ContactModal initial={{name:"",company_id:dc.id,position:"",phone:"",email:"",linkedin:"",role:"Rozhodovatel",note:"",personal_note:""}} companies={data.companies} onSave={async(f)=>{await ops.upsertContact({...clean(f),id:uid()});setModal(null);}} onClose={()=>setModal(null)}/>}
      {gcalTask&&<Modal title="" onClose={()=>setGcalTask(null)}><GCalPrompt task={gcalTask} companies={data.companies} contacts={data.contacts} onClose={()=>setGcalTask(null)}/></Modal>}
    </div>
  );

  return (
    <div>
      <SectionHeader title="Firmy" count={filtered.length} onAdd={()=>setModal("new")} addLabel="Přidat firmu"/>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}><AutocompleteInput value={search} onChange={setSearch} suggestions={companyNames} placeholder="Hledat firmu…"/></div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {["Vše",...STATUSES.company].map(st=>(
            <button key={st} onClick={()=>setFilter(st)} style={{...s.btn(filter===st?"primary":"ghost"),padding:"7px 11px",fontSize:11}}>{st}</button>
          ))}
        </div>
      </div>
      {filtered.map(c=>{
        const lastNote=(c.notes||[]).slice(-1)[0];
        const dealValue=data.deals.filter(d=>d.company_id===c.id&&!["Vyhráno","Prohráno"].includes(d.status)).reduce((s,d)=>s+(d.value||0),0);
        return (
          <div key={c.id} onClick={()=>handleSetDetail(c.id)} style={{...s.card,cursor:"pointer",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 2px 8px rgba(46,139,0,0.1)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
                <div style={{width:36,height:36,borderRadius:8,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.accent,flexShrink:0}}>
                  {initials(c.name)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>{c.name}</div>
                  <div style={{fontSize:12,color:C.textMuted,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {c.industry&&<span>{c.industry}</span>}
                    {c.address&&<span>· {c.address}</span>}
                    {c.fleet>0&&<span>· {c.fleet} VZV</span>}
                    {lastNote&&<span style={{color:C.textDim}}>· {fmtDateShort(lastNote.date)}</span>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                {dealValue>0&&<span style={{fontSize:12,fontWeight:700,color:C.accent}}>{fmtMoney(dealValue)}</span>}
                <StatusBadge status={c.status}/>
                <Icon d={Icons.chevronRight} size={14} stroke={C.textDim}/>
              </div>
            </div>
          </div>
        );
      })}
      {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textDim}}>Žádné firmy</div>}
      {modal==="new"&&<CompanyModal onSave={async(f)=>{await ops.upsertCompany({...clean(f),id:uid(),notes:[],created:today()});setModal(null);}} onClose={()=>setModal(null)}/>}
    </div>
  );
};

// --- CONTACTS ---
const Contacts = ({data,ops,onNavigateToCompany}) => {
  const [modal,setModal] = useState(null);
  const [search,setSearch] = useState("");
  const contactNames = data.contacts.map(c=>c.name);
  const filtered = data.contacts.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||(c.position||"").toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <SectionHeader title="Kontakty" count={filtered.length} onAdd={()=>setModal("new")} addLabel="Přidat kontakt"/>
      <div style={{marginBottom:14}}><AutocompleteInput value={search} onChange={setSearch} suggestions={contactNames} placeholder="Hledat kontakt…"/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {filtered.map(ct=>{
          const company=data.companies.find(c=>c.id===ct.company_id);
          return (
            <div key={ct.id} style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div onClick={()=>ct.company_id&&onNavigateToCompany(ct.company_id)} style={{fontWeight:700,fontSize:14,color:ct.company_id?C.accent:C.text,cursor:ct.company_id?"pointer":"default",marginBottom:2}}>{ct.name}</div>
                  <div style={{fontSize:12,color:C.textMuted}}>{ct.position}</div>
                  {company&&<div onClick={()=>onNavigateToCompany(ct.company_id)} style={{fontSize:11,color:C.accent,marginTop:2,cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontWeight:500}}><Icon d={Icons.building} size={10}/>{company.name}</div>}
                </div>
                <span style={s.badge(C.purple)}>{ct.role}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,margin:"8px 0"}}>
                {ct.phone&&<a href={`tel:${ct.phone}`} style={{fontSize:12,color:C.accent,display:"flex",gap:5,alignItems:"center",textDecoration:"none",fontWeight:500}}><Icon d={Icons.phone} size={12}/>{ct.phone}</a>}
                {ct.email&&<a href={`mailto:${ct.email}`} style={{fontSize:12,color:C.info,display:"flex",gap:5,alignItems:"center",textDecoration:"none"}}><Icon d={Icons.mail} size={12}/>{ct.email}</a>}
                {ct.linkedin&&<a href={`https://${ct.linkedin}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#0A66C2",display:"flex",gap:5,alignItems:"center",textDecoration:"none"}}><Icon d={Icons.linkedin} size={12}/>LinkedIn</a>}
              </div>
              {ct.personal_note&&<div style={{fontSize:12,color:"#92610a",background:C.yellowLight,padding:"6px 10px",borderRadius:6,border:`1px solid ${C.yellow}40`,marginBottom:6}}>😊 {ct.personal_note}</div>}
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
      {modal&&<ContactModal initial={modal==="new"?undefined:data.contacts.find(c=>c.id===modal)} companies={data.companies}
        onSave={async(f)=>{await ops.upsertContact(modal==="new"?{...clean(f),id:uid()}:{...data.contacts.find(c=>c.id===modal),...clean(f)});setModal(null);}}
        onClose={()=>setModal(null)}/>}
    </div>
  );
};

// --- DEALS ---
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
            <div key={st} onClick={()=>setFilter(filter===st?"Vše":st)} style={{background:filter===st?C.accentLight:C.white,border:`1px solid ${filter===st?C.accent:C.border}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",transition:"all 0.15s"}}>
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
        const creator=data.profiles?.find(p=>p.id===d.created_by);
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
                  {creator&&<span style={{color:C.textDim}}>· {creator.full_name||creator.email}</span>}
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
      {modal&&<DealModal initial={modal==="new"?undefined:data.deals.find(d=>d.id===modal)} companies={data.companies} contacts={data.contacts}
        onSave={async(f)=>{await ops.upsertDeal(modal==="new"?{...clean(f),id:uid(),qty:Number(f.qty)||1,value:Number(f.value)||0}:{...data.deals.find(d=>d.id===modal),...clean(f),qty:Number(f.qty)||1,value:Number(f.value)||0});setModal(null);}}
        onClose={()=>setModal(null)}/>}
    </div>
  );
};

// --- TASKS ---
const Tasks = ({data,ops,profile}) => {
  const [modal,setModal] = useState(null);
  const [gcalTask,setGcalTask] = useState(null);
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
      <SectionHeader title="Moje úkoly" count={filtered.length} onAdd={()=>setModal("new")} addLabel="Přidat úkol"/>
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
            <div style={{display:"flex",gap:6,alignItems:"flex-start",flexWrap:"wrap",marginBottom:4}}>
              <span style={{fontWeight:700,fontSize:14,color:od?C.danger:C.text,flex:1,minWidth:0}}>{t.title}</span>
              <span style={s.badge(C.info)}>{t.type}</span>
              <StatusBadge status={t.status}/>
            </div>
            <div style={{fontSize:12,color:C.textMuted,display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
              {company&&<span>{company.name}</span>}
              {contact&&<span>· {contact.name}</span>}
              <span style={{color:od?C.danger:C.textDim,fontWeight:od?600:400}}>· {fmtDate(t.date)}{t.time?` · ${t.time}`:""}{od?" ⚠":""}</span>
            </div>
            {t.note&&<div style={{fontSize:12,color:C.textDim,marginBottom:8,fontStyle:"italic"}}>{t.note}</div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
              <a href={gcalLink(t,company,contact)} target="_blank" rel="noreferrer" style={{...s.btn("gcal"),textDecoration:"none",padding:"6px 10px",fontSize:12}}><Icon d={Icons.gcal} size={13}/>GCal</a>
              {t.status!=="Dokončeno"&&<button onClick={()=>ops.upsertTask({...t,status:"Dokončeno"})} style={{...s.btn("ghost"),padding:"6px 10px",fontSize:12}}><Icon d={Icons.check} size={13}/>Hotovo</button>}
              <button onClick={()=>setModal(t.id)} style={{...s.btn("ghost"),padding:"6px 10px",fontSize:12}}><Icon d={Icons.edit} size={13}/>Upravit</button>
              <button onClick={()=>ops.deleteTask(t.id)} style={{...s.btn("danger"),padding:"6px 10px",fontSize:12}}><Icon d={Icons.trash} size={13}/></button>
            </div>
          </div>
        );
      })}
      {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.textDim}}>Žádné úkoly</div>}
      {modal&&<TaskModal initial={modal==="new"?{title:"",type:"Telefonát",company_id:"",contact_id:"",date:today(),time:"",status:"Plánováno",note:"",owner_id:profile?.id}:data.tasks.find(t=>t.id===modal)} companies={data.companies} contacts={data.contacts} profiles={data.profiles}
        onSave={async(f)=>{
          const saved=modal==="new"?{...clean(f),id:uid(),owner_id:profile?.id}:{...data.tasks.find(t=>t.id===modal),...clean(f)};
          await ops.upsertTask(saved); setModal(null);
          if(modal==="new") setGcalTask(saved);
        }} onClose={()=>setModal(null)}/>}
      {gcalTask&&<Modal title="" onClose={()=>setGcalTask(null)}><GCalPrompt task={gcalTask} companies={data.companies} contacts={data.contacts} onClose={()=>setGcalTask(null)}/></Modal>}
    </div>
  );
};

// --- MAIN APP ---
const NAV = [
  {id:"dashboard",label:"Přehled",icon:Icons.chart},
  {id:"companies",label:"Firmy",icon:Icons.building},
  {id:"contacts",label:"Kontakty",icon:Icons.users},
  {id:"deals",label:"Pipeline",icon:Icons.target},
  {id:"tasks",label:"Úkoly",icon:Icons.check},
];

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState({companies:[],contacts:[],deals:[],tasks:[],profiles:[]});
  const [syncStatus, setSyncStatus] = useState("loading");
  const [page, setPage] = useState("dashboard");
  const [focusId, setFocusId] = useState(null);

  // Obnova session při načtení — s automatickým refresh tokenem
  useEffect(() => {
    const stored = getStoredSession();
    if (!stored?.access_token) {
      setAuthLoading(false);
      return;
    }

    if (isTokenExpired(stored)) {
      // Token expiroval — zkus refresh
      if (stored.refresh_token) {
        refreshSession(stored.refresh_token)
          .then(newSession => {
            storeSession(newSession);
            setSession(newSession);
          })
          .catch(() => {
            // Refresh selhal — přihlásit znovu
            storeSession(null);
          })
          .finally(() => setAuthLoading(false));
      } else {
        storeSession(null);
        setAuthLoading(false);
      }
    } else {
      setSession(stored);
      setAuthLoading(false);
    }
  }, []);

  // Načtení profilu po přihlášení
  useEffect(() => {
    if (!session?.user?.id) return;
    const loadProfile = async () => {
      try {
        const profiles = await sb(`profiles?id=eq.${session.user.id}`, {}, session.access_token);
        if (profiles.length > 0) {
          setProfile(profiles[0]);
        } else {
          const newProfile = {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email.split("@")[0],
            role: session.user.user_metadata?.role || "obchodnik",
          };
          await sb("profiles", { method:"POST", body:JSON.stringify(newProfile), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }, session.access_token);
          setProfile(newProfile);
        }
      } catch(e) { console.error("Chyba načtení profilu:", e); }
    };
    loadProfile();
  }, [session]);

  const makeApi = (token) => ({
    getCompanies: () => sb("companies?order=created.desc", {}, token),
    upsertCompany: (c) => sb("companies", { method:"POST", body:JSON.stringify(c), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }, token),
    deleteCompany: (id) => sb(`companies?id=eq.${id}`, { method:"DELETE", prefer:"" }, token),
    getContacts: () => sb("contacts?order=name.asc", {}, token),
    upsertContact: (c) => sb("contacts", { method:"POST", body:JSON.stringify(c), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }, token),
    deleteContact: (id) => sb(`contacts?id=eq.${id}`, { method:"DELETE", prefer:"" }, token),
    getDeals: () => sb("deals?order=value.desc", {}, token),
    upsertDeal: (d) => sb("deals", { method:"POST", body:JSON.stringify(d), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }, token),
    deleteDeal: (id) => sb(`deals?id=eq.${id}`, { method:"DELETE", prefer:"" }, token),
    getTasks: () => sb("tasks?order=date.asc", {}, token),
    upsertTask: (t) => sb("tasks", { method:"POST", body:JSON.stringify(t), headers:{"Prefer":"resolution=merge-duplicates,return=representation"} }, token),
    deleteTask: (id) => sb(`tasks?id=eq.${id}`, { method:"DELETE", prefer:"" }, token),
    getProfiles: () => sb("profiles?order=full_name.asc", {}, token),
  });

  const loadAll = useCallback(async () => {
    if (!session?.access_token) return;
    setSyncStatus("loading");
    const api = makeApi(session.access_token);
    try {
      const [companies, contacts, deals, tasks, profiles] = await Promise.all([
        api.getCompanies(), api.getContacts(), api.getDeals(), api.getTasks(), api.getProfiles()
      ]);
      setData({companies, contacts, deals, tasks, profiles});
      setSyncStatus("ok");
    } catch(e) { console.error(e); setSyncStatus("error"); }
  }, [session]);

  useEffect(() => { if (session) loadAll(); }, [session, loadAll]);

  const wrap = (fn) => async(...args) => {
    setSyncStatus("syncing");
    try { await fn(...args); await loadAll(); }
    catch(e) { console.error(e); setSyncStatus("error"); }
  };

  const ops = session ? (() => {
    const api = makeApi(session.access_token);
    return {
      upsertCompany: wrap(api.upsertCompany), deleteCompany: wrap(api.deleteCompany),
      upsertContact: wrap(api.upsertContact), deleteContact: wrap(api.deleteContact),
      upsertDeal: wrap(api.upsertDeal),       deleteDeal: wrap(api.deleteDeal),
      upsertTask: wrap(api.upsertTask),       deleteTask: wrap(api.deleteTask),
    };
  })() : {};

  const handleLogin = (sessionData) => { setSession(sessionData); };
  const handleLogout = () => { storeSession(null); setSession(null); setProfile(null); setData({companies:[],contacts:[],deals:[],tasks:[],profiles:[]}); };
  const navigate = (p, id=null) => { setPage(p); setFocusId(id); };
  const overdueCount = data.tasks.filter(t=>isOverdue(t.date,t.status)).length;

  if (authLoading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        <div style={{color:C.textMuted,fontSize:13}}>Načítám…</div>
      </div>
    </div>
  );

  if (!session) return <LoginScreen onLogin={handleLogin}/>;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:0.5;}
        select option{background:${C.white};color:${C.text};}
        input:focus, select:focus, textarea:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentGlow}; }
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      <div style={{position:"sticky",top:0,zIndex:100,background:C.white,borderBottom:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",height:56,gap:10}}>
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
          <nav style={{display:"flex",gap:2,flex:1}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>navigate(n.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.15s",position:"relative",background:page===n.id?C.accentLight:"transparent",color:page===n.id?C.accent:C.textMuted,borderBottom:page===n.id?`2px solid ${C.accent}`:"2px solid transparent"}}>
                <Icon d={n.icon} size={13}/>{n.label}
                {n.id==="tasks"&&overdueCount>0&&<span style={{position:"absolute",top:2,right:2,width:7,height:7,borderRadius:4,background:C.danger}}/>}
              </button>
            ))}
            {profile?.role==="admin"&&(
              <button onClick={()=>navigate("users")} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.15s",background:page==="users"?C.accentLight:"transparent",color:page==="users"?C.accent:C.textMuted,borderBottom:page==="users"?`2px solid ${C.accent}`:"2px solid transparent"}}>
                <Icon d={Icons.users} size={13}/>Uživatelé
              </button>
            )}
          </nav>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <SyncBadge status={syncStatus}/>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:profile?.role==="admin"?C.accentLight:C.bg,border:`1.5px solid ${profile?.role==="admin"?C.accent:C.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon d={profile?.role==="admin"?Icons.shield:Icons.user} size={11} stroke={profile?.role==="admin"?C.accent:C.textMuted}/>
              </div>
              <span style={{fontSize:12,fontWeight:600,color:C.text}}>{profile?.full_name?.split(" ")[0]||profile?.email||"—"}</span>
            </div>
            <button onClick={()=>loadAll()} style={{...s.btn("ghost"),padding:"6px 9px"}} title="Obnovit"><Icon d={Icons.refresh} size={13}/></button>
            <button onClick={handleLogout} style={{...s.btn("ghost"),padding:"6px 9px",color:C.danger}} title="Odhlásit se"><Icon d={Icons.logout} size={13}/></button>
          </div>
        </div>
      </div>

      {syncStatus==="error"&&<div style={{background:`${C.danger}10`,borderBottom:`1px solid ${C.danger}30`,padding:"10px 20px",textAlign:"center",fontSize:13,color:C.danger,fontWeight:500}}>⚠ Nepodařilo se připojit k databázi. Zkontroluj připojení k internetu.</div>}

      {syncStatus==="loading"&&data.companies.length===0&&(
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:"80px 0",flexDirection:"column",gap:12}}>
          <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <div style={{color:C.textMuted,fontSize:13,fontWeight:500}}>Načítám data…</div>
        </div>
      )}

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 20px"}}>
        {page==="dashboard"&&<Dashboard data={data} profile={profile} onNavigate={navigate}/>}
        {page==="companies"&&<Companies data={data} ops={ops} focusId={focusId} onClearFocus={()=>setFocusId(null)}/>}
        {page==="contacts"&&<Contacts data={data} ops={ops} onNavigateToCompany={(id)=>navigate("companies",id)}/>}
        {page==="deals"&&<Deals data={data} ops={ops}/>}
        {page==="tasks"&&<Tasks data={data} ops={ops} profile={profile}/>}
        {page==="users"&&profile?.role==="admin"&&<UserManagement session={session} profiles={data.profiles} onRefresh={loadAll}/>}
      </div>
    </div>
  );
}
