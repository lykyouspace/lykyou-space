import { useCallback, useEffect, useState } from "react";
import { Bell, Bookmark, CheckCheck, ExternalLink, Trash2, Shield, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useStaffRole } from "../lib/auth";
import { supabase } from "../lib/supabase";

type Notice = { id: string; notification_type: string; title: string; body: string; target_url: string | null; read_at: string | null; created_at: string };

export function NotificationsPage() {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const load = useCallback(async () => {
    if (!user || !supabase) { setItems([]); setLoading(false); return; }
    const { data, error: resultError } = await supabase.from("notifications")
      .select("id,notification_type,title,body,target_url,read_at,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (resultError) setError(resultError.message);
    else setItems((data ?? []) as Notice[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id: string) {
    if (!supabase) return;
    const { error: resultError } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user?.id);
    if (resultError) setError(resultError.message);
    else setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  }
  async function markAll() {
    if (!supabase || !user) return;
    setBusy(true);
    const { error: resultError } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    if (resultError) setError(resultError.message);
    else setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setBusy(false);
  }
  async function remove(id: string) {
    if (!supabase || !user) return;
    const { error: resultError } = await supabase.from("notifications").delete().eq("id", id).eq("user_id", user.id);
    if (resultError) setError(resultError.message);
    else setItems((current) => current.filter((item) => item.id !== id));
  }

  const unreadCount = items.filter((item) => !item.read_at).length;
  const categoryFor = (item: Notice) => {
    const type = item.notification_type.toLowerCase();
    if (type.includes("mention")) return "mentions";
    if (type.includes("like") || type.includes("reaction")) return "reactions";
    if (type.includes("event") || type.includes("reminder")) return "events";
    if (type.includes("update") || type.includes("announcement")) return "updates";
    return "system";
  };
  const visibleItems = activeTab === "all" ? items : items.filter((item) => categoryFor(item) === activeTab);
  if (!user) return <section className="member-tools"><Bell/><h2>Your notifications</h2><p>Sign in to see activity from your LYKYOU Space.</p><button className="button-primary" onClick={() => navigate("/login")}>Sign in</button></section>;
  return <section className="member-tools notifications-page-v2">
    <header className="member-tools-heading space-design-banner notifications-design-banner"><div><div className="eyebrow">STAY UPDATED · STAY CONNECTED</div><h2>Notifications</h2><p>Your mentions, reactions, community activity and reminders.</p></div><Bell size={28}/><span className="banner-orbit orbit-a">✦</span><span className="banner-orbit orbit-b">♡</span></header>
    {error && <p className="auth-message error">{error}</p>}
    
    <div className="notifications-overview">
      <div><strong>{items.length}</strong><span>Total activity</span></div>
      <div><strong>{unreadCount}</strong><span>Unread</span></div>
      <div><strong>{items.filter((item) => categoryFor(item) === "events").length}</strong><span>Reminders</span></div>
    </div>
    <div className="notifications-toolbar">
      <div className="notifications-tabs" role="tablist" aria-label="Notification categories">
        {[["all","All"],["mentions","Mentions"],["reactions","Reactions"],["updates","Updates"],["events","Event reminders"],["system","System"]].map(([value,label]) => <button type="button" key={value} className={activeTab === value ? "active" : ""} onClick={() => setActiveTab(value)}>{label}</button>)}
      </div>
      <button className="button-outline button-small" onClick={() => void markAll()} disabled={busy || unreadCount === 0}><CheckCheck size={15}/> Mark all read</button>
    </div>
    {!configured ? <p className="member-empty">Connect the database to enable notifications.</p> : loading ? <p className="member-empty">Loading notifications…</p> : visibleItems.length === 0 ? <div className="notifications-empty"><Bell size={24}/><h3>{items.length === 0 ? "You're all caught up." : "Nothing in this category yet."}</h3><p>{items.length === 0 ? "New activity, mentions and reminders will appear here." : "Choose another tab to see more of your activity."}</p></div> : <div className="member-tools-list">{visibleItems.map((item) => <article className={item.read_at ? "member-tool-row" : "member-tool-row unread"} key={item.id}><div className="member-tool-symbol"><Bell size={17}/></div><div className="member-tool-copy"><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString()}</small>{item.target_url && <Link to={item.target_url} onClick={() => void markRead(item.id)}>Open <ExternalLink size={12}/></Link>}</div><div className="member-tool-row-actions">{!item.read_at && <button onClick={() => void markRead(item.id)}>Mark read</button>}<button aria-label="Delete notification" onClick={() => void remove(item.id)}><Trash2 size={15}/></button></div></article>)}</div>}
  </section>;
}

export function BookmarksPage() {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!user || !supabase) { setItems([]); setLoading(false); return; }
    const { data: saved, error: savedError } = await supabase.from("bookmarks").select("post_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (savedError) { setError(savedError.message); setLoading(false); return; }
    const ids = (saved ?? []).map((row) => row.post_id);
    if (!ids.length) { setItems([]); setLoading(false); return; }
    const { data: posts, error: postsError } = await supabase.from("posts").select("id,author_id,body,created_at").in("id", ids).eq("status", "published");
    if (postsError) setError(postsError.message);
    const rows = posts ?? [];
    const authors = [...new Set(rows.map((row) => row.author_id))];
    const { data: profiles } = authors.length ? await supabase.from("profiles").select("id,username,display_name").in("id", authors) : { data: [] as any[] };
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    setItems(rows.map((row: any) => ({ ...row, author: profileMap.get(row.author_id)?.display_name ?? "LYKYOU", username: profileMap.get(row.author_id)?.username ?? "member" })));
    setLoading(false);
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);
  async function remove(postId: string) {
    if (!supabase || !user) return;
    const { error: resultError } = await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
    if (resultError) setError(resultError.message);
    else setItems((current) => current.filter((item) => item.id !== postId));
  }
  if (!user) return <section className="member-tools"><Bookmark/><h2>Saved posts</h2><p>Sign in to keep your favourite community posts close.</p><button className="button-primary" onClick={() => navigate("/login")}>Sign in</button></section>;
  return <section className="member-tools"><header className="member-tools-heading"><div><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h2>Saved posts</h2><p>Posts you bookmarked for later.</p></div><Bookmark size={26}/></header>
    {error && <p className="auth-message error">{error}</p>}
    {!configured ? <p className="member-empty">Connect the database to save posts.</p> : loading ? <p className="member-empty">Loading saved posts…</p> : items.length === 0 ? <p className="member-empty">No saved posts yet. Use the bookmark icon on a community post to save it here.</p> : <div className="member-tools-list">{items.map((item) => <article className="saved-post" key={item.id}><div><strong>{item.author} <small>@{item.username}</small></strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString()}</small></div><button className="button-outline button-small" onClick={() => void remove(item.id)}><Trash2 size={14}/> Remove</button></article>)}</div>}
  </section>;
}

export function SettingsPage() {
  const { user, signOut, configured } = useAuth();
  const { isOwner } = useStaffRole();
  const navigate = useNavigate();
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionStatus, setDeletionStatus] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user || !supabase) { setLoading(false); return; }
      const [{ data, error: resultError }, { data: deletion }] = await Promise.all([
        supabase.from("profiles").select("profile_visibility").eq("id", user.id).maybeSingle(),
        supabase.from("account_deletion_requests").select("status").eq("user_id", user.id).in("status", ["pending", "reviewing"]).maybeSingle(),
      ]);
      if (!active) return;
      if (resultError) setError(resultError.message);
      if (data?.profile_visibility) setVisibility(data.profile_visibility);
      if (deletion?.status) setDeletionStatus(deletion.status);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [user?.id]);
  async function save() {
    if (!user || !supabase) return;
    setBusy(true); setError(""); setMessage("");
    const { error: resultError } = await supabase.from("profiles").update({ profile_visibility: visibility }).eq("id", user.id);
    if (resultError) setError(resultError.message);
    else setMessage("Your profile privacy setting has been saved.");
    setBusy(false);
  }
  async function requestDeletion() {
    if (!user || !supabase) return;
    if (isOwner) { setError("The Main Admin account is protected. Transfer ownership before requesting deletion."); return; }
    const confirmed = window.confirm("Submit an account deletion request? Your account will remain active until an authorised admin reviews it.");
    if (!confirmed) return;
    setBusy(true); setError(""); setMessage("");
    const { error: requestError } = await supabase.from("account_deletion_requests").insert({ user_id: user.id, reason: deletionReason.trim(), status: "pending" });
    if (requestError) setError(requestError.message);
    else { setDeletionStatus("pending"); setDeletionReason(""); setMessage("Your deletion request has been sent for review. Your account is not deleted yet."); }
    setBusy(false);
  }
  if (!user) return <section className="member-tools"><Shield/><h2>Account settings</h2><p>Sign in to manage your profile privacy and account.</p><button className="button-primary" onClick={() => navigate("/login")}>Sign in</button></section>;
  return <section className="member-tools"><header className="member-tools-heading"><div><div className="eyebrow">ACCOUNT & PRIVACY</div><h2>Settings</h2><p>Control who can discover your profile.</p></div><Shield size={26}/></header>
    {error && <p className="auth-message error">{error}</p>}{message && <p className="auth-message success">{message}</p>}
    <div className="settings-panel"><h3>Profile visibility</h3><p>Choose who can find and view your public profile details. Private profile details remain visible only to you and authorised admins.</p><label><input type="radio" name="visibility" value="public" checked={visibility==="public"} onChange={(e)=>setVisibility(e.target.value)}/> Public — anyone can view your profile</label><label><input type="radio" name="visibility" value="members" checked={visibility==="members"} onChange={(e)=>setVisibility(e.target.value)}/> Members — signed-in LYKYOUs only</label><label><input type="radio" name="visibility" value="private" checked={visibility==="private"} onChange={(e)=>setVisibility(e.target.value)}/> Private — only you and authorised admins</label><button className="button-primary" onClick={()=>void save()} disabled={busy||loading||!configured}>{busy?"Saving…":"Save privacy setting"}</button></div>
    <div className="settings-panel"><h3>Account</h3><p>Signed in as <strong>{user.email}</strong>.</p><button className="button-outline" onClick={async()=>{await signOut();navigate("/");}}><LogOut size={15}/> Sign out</button></div>
    <div className="settings-panel settings-danger"><h3>Request account deletion</h3><p>This sends a private request to the platform admins. Your account remains active until the request is reviewed and the account is securely removed; deletion is not performed from your browser.</p>{isOwner ? <p className="deletion-pending">This is the protected Main Admin account. Transfer ownership before it can be deleted.</p> : deletionStatus ? <p className="deletion-pending">Your request is currently: <strong>{deletionStatus}</strong>.</p> : <><textarea value={deletionReason} onChange={(e)=>setDeletionReason(e.target.value)} rows={3} maxLength={1000} placeholder="Optional reason for your request"/><button className="button-outline" onClick={()=>void requestDeletion()} disabled={busy||!configured}>{busy?"Sending…":"Submit deletion request"}</button></>}</div>
  </section>;
}
