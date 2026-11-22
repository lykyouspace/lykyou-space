import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, ChevronRight, FolderPlus, Users } from "lucide-react";
import { useAuth, useStaffRole } from "../lib/auth";
import { supabase } from "../lib/supabase";

type Group = { id: string; name: string; slug: string; description: string; group_type: string; visibility: string };

export default function GroupsPage() {
  const { user, configured } = useAuth();
  const { isModerator } = useStaffRole();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<Record<string,string>>({});
  const [pending, setPending] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState("general");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!configured || !supabase) { setGroups([]); setLoading(false); return; }
    const { data, error: loadError } = await supabase.from("groups")
      .select("id,name,slug,description,group_type,visibility").order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    setGroups((data ?? []) as Group[]);
    if (user && data?.length) {
      const { data: mine } = await supabase.from("group_members")
        .select("group_id,status").eq("user_id", user.id).in("group_id", data.map((g) => g.id));
      const map: Record<string,string> = {};
      (mine ?? []).forEach((row: any) => { map[row.group_id] = row.status; });
      setMemberships(map);
    } else setMemberships({});
    if (isModerator) {
      const { data: requests } = await supabase.from("group_members")
        .select("group_id,user_id,joined_at").eq("status", "pending").order("joined_at", { ascending: true }).limit(50);
      const ids = [...new Set((requests ?? []).map((row: any) => row.user_id))];
      const groupIds = [...new Set((requests ?? []).map((row: any) => row.group_id))];
      const [{ data: profiles }, { data: groupRows }] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id,username,display_name").in("id", ids) : Promise.resolve({ data: [] as any[] }),
        groupIds.length ? supabase.from("groups").select("id,name").in("id", groupIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id,p]));
      const groupMap = new Map((groupRows ?? []).map((g: any) => [g.id,g]));
      setPending((requests ?? []).map((r: any) => ({ ...r, person: profileMap.get(r.user_id), group: groupMap.get(r.group_id) })));
    } else setPending([]);
    setLoading(false);
  }, [configured, user?.id, isModerator]);

  useEffect(() => { void load(); }, [load]);

  async function join(group: Group) {
    if (!user) { setMessage("Sign in to request group membership."); return; }
    if (!supabase) return;
    setBusy(group.id); setError(""); setMessage("");
    const { error: joinError } = await supabase.from("group_members").insert({
      group_id: group.id, user_id: user.id, status: "pending", member_role: "member",
    });
    if (joinError) setError(joinError.code === "23505" ? "You already have a request or membership for this group." : joinError.message);
    else { setMessage(`Your request to join ${group.name} has been sent for review.`); await load(); }
    setBusy("");
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    setBusy("create"); setError(""); setMessage("");
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50);
    const { error: createError } = await supabase.from("groups").insert({
      name: name.trim(), slug, description: description.trim(), group_type: groupType,
      visibility: "public", created_by: user.id,
    });
    if (createError) setError(createError.message);
    else { setName(""); setDescription(""); setMessage("Group created."); await load(); }
    setBusy("");
  }

  async function approve(groupId: string, userId: string) {
    if (!supabase) return;
    const key = groupId + userId; setBusy(key);
    const { error: approveError } = await supabase.from("group_members")
      .update({ status: "active" }).eq("group_id", groupId).eq("user_id", userId);
    if (approveError) setError(approveError.message);
    else { setMessage("Membership approved."); await load(); }
    setBusy("");
  }

  const activeGroups = groups.filter((group) => memberships[group.id] === "active");
  const visibleGroups = activeCategory === "all" ? groups : groups.filter((group) => {
    const type = group.group_type.toLowerCase();
    return activeCategory === "bias" ? type.includes("bias") :
      activeCategory === "city" ? type.includes("location") :
      activeCategory === "projects" ? type.includes("project") :
      activeCategory === "campaigns" ? type.includes("campaign") : true;
  });
  const featuredGroup = visibleGroups[0];

  return <div className="groups-page groups-page-v2">
    <header className="groups-heading space-design-banner groups-design-banner">
      <div className="groups-banner-copy">
        <div className="eyebrow">FIND YOUR CORNER OF THE GALAXY</div>
        <h2>Find your people.</h2>
        <p>Small circles, big projects, shared bias energy. There is a place for every LYKYOU here.</p>
        <div className="groups-banner-caption">Different groups. Same galaxy. LYKYOU ♡</div>
      </div>
      <div className="groups-banner-art" aria-hidden="true"><span>✦</span><span>✧</span><img src="/lykyou-wolf-mascot.svg" alt=""/></div>
    </header>
    {error && <div className="auth-message error">{error}</div>}{message && <div className="auth-message success">{message}</div>}
    <div className="groups-overview">
      <div><strong>{groups.length}</strong><span>Open circles</span></div>
      <div><strong>{activeGroups.length}</strong><span>Your groups</span></div>
      <div><strong>{groups.filter((group) => group.group_type === "project" || group.group_type === "campaign").length}</strong><span>Build together</span></div>
      <p>Worldwide community · Find a circle that feels like yours</p>
    </div>
    {isModerator && <form className="group-create" onSubmit={createGroup}><div><div className="eyebrow">STAFF TOOL</div><h3>Create a group</h3><p>Start a new public space for members to connect.</p></div><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Group name" maxLength={60} required/><select value={groupType} onChange={(e)=>setGroupType(e.target.value)}><option value="general">General</option><option value="bias">Bias circle</option><option value="location">Location</option><option value="project">Project team</option><option value="campaign">Campaign</option></select><textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="What is this group for?" maxLength={1000} rows={2}/><button className="button-primary" type="submit" disabled={busy==="create"}><FolderPlus size={15}/>{busy==="create"?"Creating…":"Create group"}</button></form>}
    <div className="groups-content-grid">
      <div className="groups-main-content">
        <div className="groups-section-heading"><div><span className="eyebrow">EXPLORE THE COMMUNITY</span><h3>All groups</h3><p>Choose a space, meet your people and join in.</p></div></div>
        <div className="groups-category-tabs" role="tablist" aria-label="Filter groups">
          {[["all","All groups"],["bias","Bias circles"],["city","City & country"],["projects","Project teams"],["campaigns","Campaigns"]].map(([value,label])=><button key={value} type="button" className={activeCategory===value?"active":""} onClick={()=>setActiveCategory(value)}>{label}</button>)}
        </div>
        {loading ? <div className="member-empty">Loading groups…</div> : !configured ? <div className="member-empty">Groups will appear when the Supabase database is connected.</div> : visibleGroups.length === 0 ? <div className="groups-empty-state"><span>✦</span><h3>No groups in this category yet</h3><p>Try another category or check back as the community grows.</p></div> : <>
          {featuredGroup && <article className="groups-featured-card"><div className="groups-featured-art"><img src="/lykyou-wolf-mascot.svg" alt=""/><span>FEATURED CIRCLE</span></div><div className="groups-featured-copy"><span className="eyebrow">{featuredGroup.group_type.replace("_"," ").toUpperCase()}</span><h3>{featuredGroup.name}</h3><p>{featuredGroup.description || "A place for LYKYOUs to connect, share and make fandom memories."}</p><div className="groups-featured-actions">{memberships[featuredGroup.id]==="active"?<span className="group-status"><Check size={13}/> Joined</span>:memberships[featuredGroup.id]==="pending"?<span className="group-status pending">Request pending</span>:<button className="button-primary button-small" onClick={()=>void join(featuredGroup)} disabled={busy===featuredGroup.id}>{busy===featuredGroup.id?"Sending…":"Request to join"}</button>}</div></div></article>}
          <div className="groups-grid">{visibleGroups.map((group)=>{const status=memberships[group.id];return <article className="group-card" key={group.id}><div className="group-card-top"><span>{group.group_type.replace("_"," ")}</span><Users size={18}/></div><h3>{group.name}</h3><p>{group.description || "A space for LYKYOUs to connect and share."}</p><div className="group-card-bottom"><span>{group.visibility} group</span>{status==="active"?<span className="group-status"><Check size={13}/> Joined</span>:status==="pending"?<span className="group-status pending">Request pending</span>:<button className="button-outline button-small" onClick={()=>void join(group)} disabled={busy===group.id}>{busy===group.id?"Sending…":"Request to join"}</button>}</div></article>})}</div>
        </>}
        {isModerator && <section className="group-requests"><div className="member-panel-heading"><h3>Pending group requests</h3><span>{pending.length}</span></div>{pending.length===0?<p className="member-empty small">No pending group requests.</p>:pending.map((row)=> <div className="group-request-row" key={row.group_id+row.user_id}><div><strong>{row.person?.display_name ?? "LYKYOU"}</strong><span>@{row.person?.username ?? "member"} · {row.group?.name ?? "Group"}</span></div><button onClick={()=>void approve(row.group_id,row.user_id)} disabled={busy===row.group_id+row.user_id}>Approve</button></div>)}</section>}
      </div>
      <aside className="groups-side-content">
        <section className="groups-side-card"><span className="eyebrow">YOUR LITTLE CORNER</span><h3>My groups</h3>{activeGroups.length?activeGroups.slice(0,4).map(group=><div className="groups-side-row" key={group.id}><span className="groups-side-icon">✦</span><div><strong>{group.name}</strong><small>{group.group_type.replace("_"," ")}</small></div><Check size={14}/></div>):<p>You haven't joined a group yet. Find a circle and send a join request.</p>}</section>
        <section className="groups-side-card"><span className="eyebrow">A PLACE TO START</span><h3>Explore by interest</h3><button onClick={()=>setActiveCategory("bias")}>Bias circles <ChevronRight size={15}/></button><button onClick={()=>setActiveCategory("city")}>Local LYKYOUs <ChevronRight size={15}/></button><button onClick={()=>setActiveCategory("projects")}>Create something together <ChevronRight size={15}/></button></section>
        <section className="groups-wolf-card"><img src="/lykyou-wolf-mascot.svg" alt="LYKYOU mascot"/><strong>Better together.</strong><p>Your next fandom friend might be one group away.</p></section>
      </aside>
    </div>
  </div>;
}
