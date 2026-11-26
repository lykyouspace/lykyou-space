import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bug, Lightbulb, MessageSquare, ClipboardCheck, Send, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import "./beta-hub.css";

type Feedback = { id:string; category:string; title:string; description:string; severity:string; status:string; admin_response:string; created_at:string };
type Task = { id:string; title:string; description:string; target_area:string; due_at:string|null };
type Issue = { id:string; title:string; description:string; severity:string; status:string };
type Note = { id:string; title:string; body:string; version_label:string; published_at:string };

const categories = [
  ["bug","Bug report"],["ui_ux","UI / UX feedback"],["feature","Feature feedback"],["suggestion","Suggestion"],
  ["performance","Performance"],["security_privacy","Security / privacy"],["general","General review"]
];

export default function BetaHubPage() {
  const { user, configured } = useAuth();
  const [active,setActive]=useState(false); const [loading,setLoading]=useState(true);
  const [feedback,setFeedback]=useState<Feedback[]>([]); const [tasks,setTasks]=useState<Task[]>([]);
  const [issues,setIssues]=useState<Issue[]>([]); const [notes,setNotes]=useState<Note[]>([]);
  const [category,setCategory]=useState("bug"); const [severity,setSeverity]=useState("medium");
  const [title,setTitle]=useState(""); const [description,setDescription]=useState("");
  const [pageUrl,setPageUrl]=useState(""); const [steps,setSteps]=useState("");
  const [expected,setExpected]=useState(""); const [actual,setActual]=useState("");
  const [device,setDevice]=useState("Mobile"); const [browser,setBrowser]=useState("");
  const [attachment,setAttachment]=useState(""); const [busy,setBusy]=useState(false);
  const [error,setError]=useState(""); const [message,setMessage]=useState("");
  const load=useCallback(async()=>{
    if(!supabase||!user){setLoading(false);return;}
    setLoading(true);
    const [{data:access},{data:reports},{data:taskRows},{data:issueRows},{data:releaseRows}]=await Promise.all([
      supabase.from("beta_tester_access").select("access_status,recognition_badge").eq("user_id",user.id).maybeSingle(),
      supabase.from("beta_feedback").select("id,category,title,description,severity,status,admin_response,created_at").eq("tester_id",user.id).order("created_at",{ascending:false}).limit(50),
      supabase.from("beta_test_tasks").select("id,title,description,target_area,due_at").eq("is_published",true).order("created_at",{ascending:false}).limit(50),
      supabase.from("beta_known_issues").select("id,title,description,severity,status").order("created_at",{ascending:false}).limit(50),
      supabase.from("beta_release_notes").select("id,title,body,version_label,published_at").eq("is_published",true).order("published_at",{ascending:false}).limit(30)
    ]);
    setActive(access?.access_status==="active"); setFeedback((reports??[]) as Feedback[]);
    setTasks((taskRows??[]) as Task[]); setIssues((issueRows??[]) as Issue[]); setNotes((releaseRows??[]) as Note[]);
    setLoading(false);
  },[user?.id]);
  useEffect(()=>{void load()},[load]);
  async function submit(e:React.FormEvent){
    e.preventDefault(); if(!supabase||!user)return;
    setBusy(true);setError("");setMessage("");
    const {error:err}=await supabase.from("beta_feedback").insert({
      tester_id:user.id,category,title:title.trim(),description:description.trim(),severity,
      page_url:pageUrl.trim(),steps_to_reproduce:steps.trim(),expected_result:expected.trim(),
      actual_result:actual.trim(),device,browser:browser.trim(),attachment_url:attachment.trim()
    });
    if(err)setError(err.message);else{setMessage("Your feedback has been sent to the beta team.");setTitle("");setDescription("");setPageUrl("");setSteps("");setExpected("");setActual("");setBrowser("");setAttachment("");await load();}
    setBusy(false);
  }
  async function completeTask(task:Task){
    if(!supabase||!user)return;
    const {error:err}=await supabase.from("beta_task_completions").upsert({task_id:task.id,tester_id:user.id,status:"completed",completed_at:new Date().toISOString()},{onConflict:"task_id,tester_id"});
    if(err)setError(err.message);else setMessage("Testing task marked as completed.");
  }
  if(loading)return <main className="beta-hub"><p>Opening your Beta Testing Zone…</p></main>;
  if(!configured||!user)return <main className="beta-hub"><h1>Beta Testing Zone</h1><p>Please sign in to access the tester area.</p><Link to="/login">Sign in</Link></main>;
  if(!active)return <main className="beta-hub"><Link to="/" className="bh-back"><ArrowLeft size={15}/> LYKYOU Space</Link><div className="bh-empty"><Sparkles/><h1>Beta access required</h1><p>This area is reserved for selected beta testers with active access. If you were selected, sign in with the same email address used for your beta application and contact the team if access hasn't appeared yet.</p><Link to="/beta">View beta information</Link></div></main>;
  return <main className="beta-hub"><div className="bh-shell">
    <Link to="/" className="bh-back"><ArrowLeft size={15}/> Back to LYKYOU Space</Link>
    <header className="bh-hero"><span className="bh-kicker"><Sparkles size={14}/> PRIVATE TESTER SPACE</span><h1>Welcome to the <em>Beta Zone</em></h1><p>Your feedback, ideas and bug reports help shape LYKYOU Space before public launch.</p><span className="bh-badge"><CheckCircle2 size={14}/> EARLY CREW TESTER</span></header>
    {error&&<p className="bh-alert error">{error}</p>}{message&&<p className="bh-alert">{message}</p>}
    <nav className="bh-nav"><a href="#submit"><Bug/> Report & feedback</a><a href="#tasks"><ClipboardCheck/> Testing tasks</a><a href="#issues"><Lightbulb/> Known issues</a><a href="#updates"><MessageSquare/> Release notes</a></nav>
    <section className="bh-section" id="submit"><div className="bh-section-title"><Bug/><div><h2>Feedback & bug reports</h2><p>Report problems, share ideas or tell us how the Space feels to use.</p></div></div>
      <form className="bh-form" onSubmit={submit}>
        <label>What are you submitting?<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
        <label>Short title<input required minLength={4} maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Profile cover won't save"/></label>
        <label>Description<textarea required minLength={10} maxLength={4000} rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell us what happened, or share your feedback…"/></label>
        <div className="bh-grid"><label>Severity<select value={severity} onChange={e=>setSeverity(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Device<select value={device} onChange={e=>setDevice(e.target.value)}><option>Mobile</option><option>Desktop</option><option>Tablet</option><option>Other</option></select></label></div>
        <label>Page / feature<input maxLength={500} value={pageUrl} onChange={e=>setPageUrl(e.target.value)} placeholder="Page name or URL"/></label>
        <label>Steps to reproduce<textarea rows={2} maxLength={2000} value={steps} onChange={e=>setSteps(e.target.value)} placeholder="1. Open… 2. Tap… 3. Notice…"/></label>
        <div className="bh-grid"><label>Expected result<textarea rows={2} maxLength={1000} value={expected} onChange={e=>setExpected(e.target.value)}/></label><label>What actually happened<textarea rows={2} maxLength={1000} value={actual} onChange={e=>setActual(e.target.value)}/></label></div>
        <div className="bh-grid"><label>Browser (optional)<input maxLength={100} value={browser} onChange={e=>setBrowser(e.target.value)} placeholder="Chrome, Safari…"/></label><label>Screenshot link (optional)<input type="url" maxLength={1000} value={attachment} onChange={e=>setAttachment(e.target.value)} placeholder="External link only; no uploads"/></label></div>
        <p className="bh-hint">Please don't include passwords, private messages or sensitive personal information. Screenshot links are optional and are not uploaded to LYKYOU Space storage.</p>
        <button disabled={busy} type="submit"><Send size={16}/>{busy?"Sending…":"Send to the beta team"}</button>
      </form>
    </section>
    <section className="bh-section"><div className="bh-section-title"><MessageSquare/><div><h2>My submissions</h2><p>Follow the status of your feedback and read admin responses.</p></div></div>
      {feedback.length?feedback.map(item=><article className="bh-item" key={item.id}><div className="bh-item-top"><b>{item.title}</b><span className={"bh-status "+item.status}>{item.status.replace("_"," ")}</span></div><p>{item.description}</p><small>{item.category.replace("_"," ")} · {item.severity} · {new Date(item.created_at).toLocaleDateString()}</small>{item.admin_response&&<div className="bh-response"><b>Team response</b><p>{item.admin_response}</p></div>}</article>):<p className="bh-muted">Your submitted reports will appear here.</p>}
    </section>
    <section className="bh-section" id="tasks"><div className="bh-section-title"><ClipboardCheck/><div><h2>Testing missions</h2><p>Optional tasks from the team to help check important parts of the Space.</p></div></div>
      {tasks.length?tasks.map(task=><article className="bh-item" key={task.id}><b>{task.title}</b><p>{task.description}</p><small>{task.target_area}{task.due_at?" · Due "+new Date(task.due_at).toLocaleDateString():""}</small><button className="bh-secondary" onClick={()=>void completeTask(task)}>Mark completed</button></article>):<p className="bh-muted">No testing missions have been posted yet.</p>}
    </section>
    <section className="bh-section" id="issues"><div className="bh-section-title"><Lightbulb/><div><h2>Known issues</h2><p>Check here before submitting a duplicate bug report.</p></div></div>
      {issues.length?issues.map(x=><article className="bh-item" key={x.id}><div className="bh-item-top"><b>{x.title}</b><span className={"bh-status "+x.status}>{x.status.replace("_"," ")}</span></div><p>{x.description}</p><small>{x.severity}</small></article>):<p className="bh-muted">No known issues have been published.</p>}
    </section>
    <section className="bh-section" id="updates"><div className="bh-section-title"><Sparkles/><div><h2>Release notes</h2><p>What's changed in the latest beta updates.</p></div></div>
      {notes.length?notes.map(x=><article className="bh-item" key={x.id}><b>{x.version_label&&x.version_label+" · "}{x.title}</b><p>{x.body}</p><small>{x.published_at?new Date(x.published_at).toLocaleDateString():""}</small></article>):<p className="bh-muted">No release notes yet.</p>}
    </section>
    <footer className="bh-footer">Thank you for helping build LYKYOU Space. Your early-crew recognition stays with your account after beta ends.</footer>
  </div></main>;
}
