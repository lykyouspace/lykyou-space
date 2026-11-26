import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, ShieldCheck, Plus } from "lucide-react";
import { useAuth, useStaffRole } from "../lib/auth";
import { supabase } from "../lib/supabase";
import "./beta-management.css";

type Feedback={id:string;tester_id:string;category:string;title:string;description:string;severity:string;status:string;admin_response:string;created_at:string};
type Tester={user_id:string;access_status:string;granted_at:string;recognition_badge:boolean;username?:string;display_name?:string};
type Task={id:string;title:string;description:string;target_area:string;is_published:boolean};
type Issue={id:string;title:string;description:string;severity:string;status:string};
type Note={id:string;title:string;body:string;version_label:string;is_published:boolean};
type Survey={tester_id:string;overall_rating:number;ease_rating:number;would_recommend:boolean;what_worked:string;what_didnt_work:string;improvements:string;final_note:string;submitted_at:string};
const feedbackStatuses=["new","reviewing","planned","fixed","duplicate","wont_fix"];
export default function BetaManagementPage(){
 const {user,configured}=useAuth();const {isAdmin}=useStaffRole();
 const [feedback,setFeedback]=useState<Feedback[]>([]);const [privateNotes,setPrivateNotes]=useState<Record<string,string>>({});const [testers,setTesters]=useState<Tester[]>([]);
 const [tasks,setTasks]=useState<Task[]>([]);const [issues,setIssues]=useState<Issue[]>([]);const [notes,setNotes]=useState<Note[]>([]);const [surveys,setSurveys]=useState<Survey[]>([]);
 const [filter,setFilter]=useState("new");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState("");const [error,setError]=useState("");const [message,setMessage]=useState("");
 const [taskTitle,setTaskTitle]=useState("");const [taskDescription,setTaskDescription]=useState("");const [taskArea,setTaskArea]=useState("General");
 const [issueTitle,setIssueTitle]=useState("");const [issueDescription,setIssueDescription]=useState("");const [issueSeverity,setIssueSeverity]=useState("medium");
 const [noteTitle,setNoteTitle]=useState("");const [noteBody,setNoteBody]=useState("");const [noteVersion,setNoteVersion]=useState("");
 const load=useCallback(async()=>{
  if(!supabase||!user||!isAdmin){setLoading(false);return;}setLoading(true);setError("");
  const [f,t,a,i,n,surv]=await Promise.all([
   supabase.from("beta_feedback").select("*").order("created_at",{ascending:false}).limit(250),
   supabase.from("beta_tester_access").select("user_id,access_status,granted_at,recognition_badge").order("granted_at",{ascending:false}).limit(200),
   supabase.from("beta_test_tasks").select("id,title,description,target_area,is_published").order("created_at",{ascending:false}).limit(100),
   supabase.from("beta_known_issues").select("id,title,description,severity,status").order("created_at",{ascending:false}).limit(100),
   supabase.from("beta_release_notes").select("id,title,body,version_label,is_published").order("created_at",{ascending:false}).limit(100),
   supabase.from("beta_exit_surveys").select("tester_id,overall_rating,ease_rating,would_recommend,what_worked,what_didnt_work,improvements,final_note,submitted_at").order("submitted_at",{ascending:false}).limit(200)
  ]);
  if(f.error)setError(f.error.message);const feedbackRows=(f.data??[]) as Feedback[];setFeedback(feedbackRows);
  const {data:noteRows}=feedbackRows.length?await supabase.from("beta_feedback_admin_notes").select("feedback_id,internal_notes").in("feedback_id",feedbackRows.map(x=>x.id)):{data:[] as any[]};
  setPrivateNotes(Object.fromEntries((noteRows??[]).map((x:any)=>[x.feedback_id,x.internal_notes])));
  const access=(t.data??[]) as Tester[];const ids=access.map(x=>x.user_id);
  const {data:profiles}=ids.length?await supabase.from("profiles").select("id,username,display_name").in("id",ids):{data:[] as any[]};
  const byId=new Map((profiles??[]).map((p:any)=>[p.id,p]));
  setTesters(access.map(x=>({...x,username:byId.get(x.user_id)?.username,display_name:byId.get(x.user_id)?.display_name})));
  setTasks((a.data??[]) as Task[]);setIssues((i.data??[]) as Issue[]);setNotes((n.data??[]) as Note[]);setSurveys((surv.data??[]) as Survey[]);setLoading(false);
 },[user?.id,isAdmin]);
 useEffect(()=>{void load()},[load]);
 async function updateFeedback(row:Feedback,status:string,response:string,internal:string){
  if(!supabase||!user)return;setBusy(row.id);setError("");setMessage("");
  const {error:e}=await supabase.from("beta_feedback").update({status,admin_response:response,assigned_to:user.id}).eq("id",row.id);
  if(e)setError(e.message);else{
   const {error:noteError}=await supabase.from("beta_feedback_admin_notes").upsert({feedback_id:row.id,internal_notes:internal,updated_by:user.id});
   if(noteError)setError(noteError.message);else{setMessage("Feedback updated.");await load()}
  }
  setBusy("");
 }
 async function endAccess(t:Tester){
  if(!supabase)return;if(!window.confirm("End beta access for @"+(t.username??"this tester")+"? Their normal member account and content will remain unchanged."))return;
  setBusy(t.user_id);const {error:e}=await supabase.rpc("end_beta_tester_access",{p_user_id:t.user_id});
  if(e)setError(e.message);else{setMessage("Beta access ended. Their regular member account is preserved.");await load()}setBusy("");
 }
 async function addTask(e:React.FormEvent){
  e.preventDefault();if(!supabase||!user)return;setBusy("task");setError("");
  const {error:e2}=await supabase.from("beta_test_tasks").insert({title:taskTitle.trim(),description:taskDescription.trim(),target_area:taskArea,is_published:true,created_by:user.id});
  if(e2)setError(e2.message);else{setTaskTitle("");setTaskDescription("");setMessage("Testing mission published.");await load()}setBusy("");
 }
 async function addIssue(e:React.FormEvent){
  e.preventDefault();if(!supabase||!user)return;setBusy("issue");setError("");
  const {error:e2}=await supabase.from("beta_known_issues").insert({title:issueTitle.trim(),description:issueDescription.trim(),severity:issueSeverity,status:"investigating",created_by:user.id});
  if(e2)setError(e2.message);else{setIssueTitle("");setIssueDescription("");setMessage("Known issue published.");await load()}setBusy("");
 }
 async function updateIssueStatus(id:string,status:string){
  if(!supabase)return;setBusy(id);setError("");const {error:e}=await supabase.from("beta_known_issues").update({status}).eq("id",id);
  if(e)setError(e.message);else{setMessage("Known issue status updated.");await load()}setBusy("");
 }
 async function addNote(e:React.FormEvent){
  e.preventDefault();if(!supabase||!user)return;setBusy("note");setError("");
  const {error:e2}=await supabase.from("beta_release_notes").insert({title:noteTitle.trim(),body:noteBody.trim(),version_label:noteVersion.trim(),is_published:true,published_at:new Date().toISOString(),created_by:user.id});
  if(e2)setError(e2.message);else{setNoteTitle("");setNoteBody("");setNoteVersion("");setMessage("Release note published.");await load()}setBusy("");
 }
 if(!configured||!user||!isAdmin)return <main className="beta-mgmt"><h1>Admin access required</h1><Link to="/admin">Return to Admin HQ</Link></main>;
 const visible=feedback.filter(x=>filter==="all"||x.status===filter);
 return <main className="beta-mgmt"><div className="bm-shell"><Link to="/admin" className="bm-back"><ArrowLeft size={15}/> Admin HQ</Link>
 <header className="bm-hero"><span>PRIVATE · ADMIN ONLY</span><h1>Beta programme HQ</h1><p>Manage tester access, review feedback, publish testing missions and keep testers informed.</p><button onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></header>
 {error&&<p className="bm-alert error">{error}</p>}{message&&<p className="bm-alert">{message}</p>}
 <div className="bm-stats"><article><b>{testers.filter(x=>x.access_status==="active").length}</b><span>Active testers</span></article><article><b>{feedback.filter(x=>x.status==="new").length}</b><span>New reports</span></article><article><b>{feedback.filter(x=>x.status==="fixed").length}</b><span>Fixed reports</span></article><article><b>{tasks.length}</b><span>Testing missions</span></article></div>
 <section className="bm-section"><h2><ShieldCheck/> Tester access & graduation</h2><p>Grant access from the Beta applications page after selecting an applicant. Ending beta access removes only beta-only permissions; their regular account, profile and community content stay intact.</p>
 {testers.length?testers.map(t=><article className="bm-row" key={t.user_id}><div><b>{t.display_name??"LYKYOU"} · @{t.username??"member"}</b><small>{t.access_status} · Joined beta {new Date(t.granted_at).toLocaleDateString()} · {t.recognition_badge?"Early crew badge retained":"No badge"}</small></div>{t.access_status==="active"&&<button className="bm-danger" disabled={busy===t.user_id} onClick={()=>void endAccess(t)}>{busy===t.user_id?"Working…":"End beta access"}</button>}</article>):<p className="bm-muted">No testers have been granted access yet.</p>}
 <Link className="bm-link" to="/admin/beta">Review beta applications →</Link></section>
 <section className="bm-section"><h2>Feedback inbox</h2><p>Reports are private to the submitting tester and authorised admins. Admin responses are visible to the tester; internal notes are not.</p>
 <nav className="bm-filters">{["new","reviewing","planned","fixed","duplicate","wont_fix","all"].map(x=><button className={filter===x?"active":""} key={x} onClick={()=>setFilter(x)}>{x.replace("_"," ")}</button>)}</nav>
 {loading?<p>Loading…</p>:visible.length?visible.map(row=><FeedbackCard key={row.id} row={row} privateNote={privateNotes[row.id]??""} busy={busy===row.id} onSave={(s,r,n)=>void updateFeedback(row,s,r,n)}/>):<p className="bm-muted">No feedback in this view.</p>}</section>
 <section className="bm-section"><h2>Beta exit surveys</h2><p>Private end-of-beta reviews from testers. Use these to prioritise the public launch checklist.</p>{surveys.length?surveys.map(x=><article className="bm-feedback" key={x.tester_id}><div className="bm-feedback-head"><b>Tester · {x.tester_id.slice(0,8)}</b><small>{new Date(x.submitted_at).toLocaleDateString()}</small></div><p><b>Overall:</b> {x.overall_rating}/5 · <b>Ease:</b> {x.ease_rating}/5 · <b>Recommend:</b> {x.would_recommend?"Yes":"Not yet"}</p><p><b>Worked well:</b> {x.what_worked||"—"}</p><p><b>Needs work:</b> {x.what_didnt_work||"—"}</p><p><b>Improvements:</b> {x.improvements||"—"}</p><p><b>Final note:</b> {x.final_note||"—"}</p></article>):<p className="bm-muted">No exit surveys have been submitted yet.</p>}</section>
 <section className="bm-section"><h2>Testing missions</h2><form className="bm-form" onSubmit={addTask}><label>Mission title<input required minLength={3} maxLength={140} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/></label><label>Instructions<textarea required minLength={10} maxLength={3000} value={taskDescription} onChange={e=>setTaskDescription(e.target.value)}/></label><label>Feature / area<input value={taskArea} maxLength={100} onChange={e=>setTaskArea(e.target.value)}/></label><button disabled={busy==="task"}><Plus size={15}/> Publish mission</button></form>
 {tasks.map(t=><article className="bm-row" key={t.id}><div><b>{t.title}</b><small>{t.target_area} · {t.is_published?"Published":"Draft"}</small></div></article>)}</section>
 <section className="bm-section"><h2>Known issues board</h2><form className="bm-form" onSubmit={addIssue}><label>Issue title<input required minLength={4} maxLength={180} value={issueTitle} onChange={e=>setIssueTitle(e.target.value)}/></label><label>Details<textarea maxLength={2000} value={issueDescription} onChange={e=>setIssueDescription(e.target.value)}/></label><label>Severity<select value={issueSeverity} onChange={e=>setIssueSeverity(e.target.value)}><option>low</option><option>medium</option><option>high</option><option>critical</option></select></label><button disabled={busy==="issue"}><Plus size={15}/> Publish known issue</button></form>{issues.map(i=><article className="bm-row" key={i.id}><div><b>{i.title}</b><small>{i.severity}</small></div><select disabled={busy===i.id} value={i.status} onChange={e=>void updateIssueStatus(i.id,e.target.value)}><option value="investigating">Investigating</option><option value="fix_in_progress">Fix in progress</option><option value="fixed">Fixed</option><option value="wont_fix">Won’t fix</option></select></article>)}</section>
 <section className="bm-section"><h2>Release notes</h2><form className="bm-form" onSubmit={addNote}><label>Version / update label<input maxLength={40} value={noteVersion} onChange={e=>setNoteVersion(e.target.value)} placeholder="Beta update 01"/></label><label>Title<input required minLength={3} maxLength={160} value={noteTitle} onChange={e=>setNoteTitle(e.target.value)}/></label><label>What's changed?<textarea required minLength={5} maxLength={4000} value={noteBody} onChange={e=>setNoteBody(e.target.value)}/></label><button disabled={busy==="note"}><Plus size={15}/> Publish release note</button></form>{notes.map(n=><article className="bm-row" key={n.id}><div><b>{n.version_label} · {n.title}</b><small>{n.is_published?"Published":"Draft"}</small></div></article>)}</section>
 </div></main>;
}
function FeedbackCard({row,privateNote,busy,onSave}:{row:Feedback;privateNote:string;busy:boolean;onSave:(s:string,r:string,n:string)=>void}){
 const [status,setStatus]=useState(row.status);const [response,setResponse]=useState(row.admin_response??"");const [internal,setInternal]=useState(privateNote);
 return <article className="bm-feedback"><div className="bm-feedback-head"><div><b>{row.title}</b><small>{row.category.replace("_"," ")} · {row.severity} · {new Date(row.created_at).toLocaleString()}</small></div><span>{row.status}</span></div><p>{row.description}</p><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{feedbackStatuses.map(x=><option key={x} value={x}>{x.replace("_"," ")}</option>)}</select></label><label>Response to tester<textarea rows={2} value={response} onChange={e=>setResponse(e.target.value)} maxLength={2000}/></label><label>Internal admin notes<textarea rows={2} value={internal} onChange={e=>setInternal(e.target.value)} maxLength={2000}/></label><button disabled={busy} onClick={()=>onSave(status,response,internal)}>{busy?"Saving…":"Save feedback review"}</button></article>
}
