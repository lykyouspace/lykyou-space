import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth, useStaffRole } from "../lib/auth";
import { supabase } from "../lib/supabase";
import "./beta-admin.css";

type Application = { id:string; display_name:string; email:string; social_handle:string; country:string; fan_duration:string; bias:string[]; interests:string[]; device:string; availability:string; prior_testing:boolean; reason:string; status:string; admin_notes:string; created_at:string; email_consent:boolean };
const statuses = ["pending","selected","waitlisted","not_selected","withdrawn"];

export default function BetaAdminPage(){
 const {user,configured}=useAuth(); const {isAdmin}=useStaffRole();
 const [rows,setRows]=useState<Application[]>([]); const [filter,setFilter]=useState("pending"); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(""); const [error,setError]=useState(""); const [message,setMessage]=useState("");
 const load=useCallback(async()=>{
  if(!supabase||!user||!isAdmin){setRows([]);setLoading(false);return;}
  setLoading(true);setError("");
  const {data,error}=await supabase.from("beta_applications").select("*").order("created_at",{ascending:false}).limit(300);
  if(error)setError(error.message); else setRows((data??[]) as Application[]);
  setLoading(false);
 },[user?.id,isAdmin]);
 useEffect(()=>{void load()},[load]);
 async function update(row:Application,status:string,notes:string){
  if(!supabase||!user)return;setBusy(row.id);setError("");setMessage("");
  const {error}=await supabase.from("beta_applications").update({status,admin_notes:notes,reviewed_at:new Date().toISOString(),reviewed_by:user.id}).eq("id",row.id);
  if(error)setError(error.message);else{setMessage("Application updated.");await load()}
  setBusy("");
 }
 async function grantAccess(row:Application){
  if(!supabase)return;setBusy(row.id);setError("");setMessage("");
  const {error}=await supabase.rpc("grant_beta_tester_access",{p_application_id:row.id});
  if(error)setError(error.message);else{setMessage("Beta access granted. The tester can now sign in and open the Beta Testing Zone.");await load()}
  setBusy("");
 }
 if(!configured)return <main className="beta-admin"><p>Supabase is not connected.</p></main>;
 if(!user||!isAdmin)return <main className="beta-admin"><ShieldCheck/><h1>Admin access required</h1><p>Beta applications are private and visible only to admins.</p><Link to="/admin">Back to Admin HQ</Link></main>;
 const visible=rows.filter(r=>filter==="all"||r.status===filter);
 return <main className="beta-admin"><Link to="/admin" className="beta-admin-back"><ArrowLeft size={15}/> Admin HQ</Link>
 <header><div className="beta-admin-kicker">PRIVATE · ADMIN ONLY</div><h1>Beta applications</h1><p>Review applicants and select a limited group for closed beta access. Only admins can see applicant details.</p><button onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></header>
 {error&&<p className="beta-admin-error">{error}</p>}{message&&<p className="beta-admin-success">{message}</p>}
 <div className="beta-admin-stats"><strong>{rows.length}</strong><span>Total applications</span><strong>{rows.filter(r=>r.status==="selected").length}</strong><span>Selected</span><strong>{rows.filter(r=>r.status==="pending").length}</strong><span>Awaiting review</span></div>
 <nav className="beta-admin-filters">{["pending","selected","waitlisted","not_selected","withdrawn","all"].map(x=><button className={filter===x?"active":""} key={x} onClick={()=>setFilter(x)}>{x.replace("_"," ")}</button>)}</nav>
 {loading?<p>Loading applications…</p>:visible.length===0?<p className="beta-admin-empty">No applications in this view.</p>:<div className="beta-admin-list">{visible.map(row=><div className="beta-applicant-wrap" key={row.id}><ApplicationCard row={row} busy={busy===row.id} onSave={(status,notes)=>void update(row,status,notes)}/>{row.status==="selected"&&<button className="beta-grant-access" disabled={busy===row.id} onClick={()=>void grantAccess(row)}>{busy===row.id?"Granting…":"Grant account access"}</button>}</div>)}</div>}
 </main>
}
function ApplicationCard({row,busy,onSave}:{row:Application;busy:boolean;onSave:(status:string,notes:string)=>void}){
 const [status,setStatus]=useState(row.status);const [notes,setNotes]=useState(row.admin_notes??"");
 return <article className="beta-applicant"><div className="beta-applicant-head"><div><h2>{row.display_name}</h2><p>{row.email} · {row.country}</p><span>{row.social_handle} · Applied {new Date(row.created_at).toLocaleString()}</span></div><b className={"beta-applicant-status "+row.status}>{row.status.replace("_"," ")}</b></div>
 <div className="beta-applicant-details"><p><b>Fan for:</b> {row.fan_duration} · <b>Device:</b> {row.device} · <b>Availability:</b> {row.availability}</p><p><b>Bias:</b> {row.bias.join(", ")||"—"}</p><p><b>Interests:</b> {row.interests.join(" · ")||"—"}</p><p><b>Previous beta testing:</b> {row.prior_testing?"Yes":"No"} · <b>Beta email updates:</b> {row.email_consent?"Yes":"No"}</p><blockquote>{row.reason}</blockquote></div>
 <div className="beta-applicant-review"><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}</select></label><label>Private admin notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} maxLength={1000}/></label><button disabled={busy} onClick={()=>onSave(status,notes)}>{busy?"Saving…":"Save review"}</button></div>
 </article>
}
