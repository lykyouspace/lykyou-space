import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, RefreshCw, Shield, ShieldCheck, UserPlus, Users, ClipboardList } from "lucide-react";
import { useAuth, useStaffRole } from "../lib/auth";
import { supabase } from "../lib/supabase";

type StaffRow = { user_id: string; role: string; active: boolean; username?: string; display_name?: string };

export default function AdminHQPage() {
  const navigate = useNavigate();
  const { user, configured } = useAuth();
  const { isStaff, isOwner, isAdmin, isModerator, roles } = useStaffRole();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [pendingProjects, setPendingProjects] = useState<any[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [deletionAudit, setDeletionAudit] = useState<any[]>([]);
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [eventOptions, setEventOptions] = useState<any[]>([]);
  const [organiserUsername, setOrganiserUsername] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("admin");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase || !user || !isStaff) {
      setStaff([]);
      setReports([]);
      setPendingProjects([]);
      setDeletionRequests([]);
      setDeletionAudit([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("staff_roles")
      .select("user_id,role,active")
      .eq("active", true)
      .order("role");
    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as StaffRow[];
    const ids = [...new Set(rows.map((row) => row.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id,username,display_name").in("id", ids)
      : { data: [] as { id: string; username: string; display_name: string }[] };
    const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    setStaff(rows.map((row) => ({
      ...row,
      username: byId.get(row.user_id)?.username ?? "member",
      display_name: byId.get(row.user_id)?.display_name ?? "LYKYOU",
    })));
    if (isModerator) {
      const [{ data: reportRows }, { data: projectRows }] = await Promise.all([
        supabase.from("reports").select("id,reporter_id,target_type,target_id,reason,details,status,created_at").in("status", ["open", "reviewing"]).order("created_at", { ascending: true }).limit(50),
        supabase.from("projects").select("id,title,summary,owner_id,created_at").eq("status", "pending").order("created_at", { ascending: true }).limit(50),
      ]);
      setReports(reportRows ?? []);
      setPendingProjects(projectRows ?? []);
    } else {
      setReports([]);
      setPendingProjects([]);
    }
    if (isAdmin) {
      const [{ data: deletionRows }, { data: auditRows }] = await Promise.all([
        supabase.from("account_deletion_requests").select("id,user_id,reason,status,created_at").in("status", ["pending", "reviewing"]).order("created_at", { ascending: true }).limit(50),
        supabase.from("account_deletion_audit").select("id,target_user_id,target_username,target_display_name,deleted_by_username,deleted_at,cleanup_warnings").order("deleted_at", { ascending: false }).limit(20),
      ]);
      setDeletionAudit(auditRows ?? []);
      const deletionUserIds = [...new Set((deletionRows ?? []).map((row: any) => row.user_id))];
      const { data: deletionProfiles } = deletionUserIds.length ? await supabase.from("profiles").select("id,username,display_name").in("id", deletionUserIds) : { data: [] as any[] };
      const deletionMap = new Map((deletionProfiles ?? []).map((profile: any) => [profile.id, profile]));
      setDeletionRequests((deletionRows ?? []).map((row: any) => ({ ...row, person: deletionMap.get(row.user_id) })));
    } else { setDeletionRequests([]); setDeletionAudit([]); }
    if (isOwner) {
      const [{ data: projectList }, { data: eventList }] = await Promise.all([
        supabase.from("projects").select("id,title").in("status", ["published","paused","completed"]).order("title").limit(100),
        supabase.from("events").select("id,title").eq("status","published").order("starts_at").limit(100),
      ]);
      setProjectOptions(projectList ?? []);
      setEventOptions(eventList ?? []);
      if (!selectedProject && projectList?.[0]) setSelectedProject(projectList[0].id);
      if (!selectedEvent && eventList?.[0]) setSelectedEvent(eventList[0].id);
    } else {
      setProjectOptions([]);
      setEventOptions([]);
    }
    setLoading(false);
  }, [user?.id, isStaff, isAdmin, isModerator, isOwner, selectedProject, selectedEvent]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function assignRole() {
    setMessage("");
    setError("");
    if (!supabase || !isOwner) return;
    const handle = username.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      setError("Enter the member's exact username.");
      return;
    }
    setBusy(true);
    try {
      const { data: profile, error: lookupError } = await supabase
        .from("profiles").select("id,display_name,username").eq("username", handle).maybeSingle();
      if (lookupError) throw lookupError;
      if (!profile) throw new Error("No member profile was found for that username.");
      const { error: rpcError } = await supabase.rpc("assign_staff_role", {
        p_user_id: profile.id,
        p_role: role,
        p_active: true,
      });
      if (rpcError) throw rpcError;
      setMessage(`@${handle} now has the ${role.replace("_", " ")} role.`);
      setUsername("");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The staff role could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeRole(row: StaffRow) {
    if (!supabase || !isOwner) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: rpcError } = await supabase.rpc("assign_staff_role", {
        p_user_id: row.user_id,
        p_role: row.role,
        p_active: false,
      });
      if (rpcError) throw rpcError;
      setMessage(`The ${row.role.replace("_", " ")} role was revoked from @${row.username}.`);
      setConfirmRevoke(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The staff role could not be revoked.");
    } finally {
      setBusy(false);
    }
  }



  async function assignOrganiser(scope: "project" | "event") {
    if (!supabase || !user || !isOwner) return;
    const handle = organiserUsername.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) { setError("Enter the member's exact username."); return; }
    const targetId = scope === "project" ? selectedProject : selectedEvent;
    if (!targetId) { setError(scope === "project" ? "Choose a project." : "Choose an event."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { data: profile, error: lookupError } = await supabase.from("profiles").select("id").eq("username",handle).maybeSingle();
      if (lookupError) throw lookupError;
      if (!profile) throw new Error("No member profile was found for that username.");
      const { data: roleRow, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id",profile.id).eq("role","project_organiser").eq("active",true).maybeSingle();
      if (roleError) throw roleError;
      if (!roleRow) throw new Error("Appoint this member as a Project organiser first in the staff role form.");
      const table = scope === "project" ? "project_staff" : "event_staff";
      const key = scope === "project" ? "project_id" : "event_id";
      const { error: assignError } = await supabase.from(table).upsert({ [key]: targetId, user_id: profile.id, assigned_by: user.id });
      if (assignError) throw assignError;
      setMessage(`@${handle} was assigned to this ${scope}.`);
      setOrganiserUsername("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The organiser assignment could not be saved.");
    } finally { setBusy(false); }
  }

  async function updateReport(reportId: string, status: string) {
    if (!supabase || !user || !isModerator) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.from("reports").update({
      status, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", reportId);
    if (updateError) setError(updateError.message);
    else { setMessage("Report status updated."); await refresh(); }
    setBusy(false);
  }

  async function updateDeletionRequest(requestId: string, status: "reviewing" | "declined") {
    if (!supabase || !isAdmin || !user) return;
    setBusy(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("account_deletion_requests").update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", requestId);
    if (updateError) setError(updateError.message);
    else { setMessage("Deletion request updated."); await refresh(); }
    setBusy(false);
  }

  async function processDeletion(request: any) {
    if (!supabase || !isAdmin || !isOwner) return;
    const handle = request.person?.username ? "@" + request.person.username : "this member";
    if (!window.confirm("Permanently delete " + handle + "'s account and personal content? This cannot be undone. The Main Admin account is protected.")) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: invokeError } = await supabase.functions.invoke("delete-account", {
      body: { target_user_id: request.user_id, request_id: request.id },
    });
    if (invokeError || data?.error) {
      setError(invokeError?.message || data?.error || "The account could not be deleted.");
    } else {
      const warnings = (data?.cleanup_warnings ?? []) as string[];
      setMessage("@" + (request.person?.username ?? "member") + "'s account was deleted securely." + (warnings.length ? " Some old media files need manual cleanup; see the audit record." : ""));
      await refresh();
    }
    setBusy(false);
  }

  async function removeReportedContent(report: any) {
    if (!supabase || !isModerator || !user) return;
    if (!window.confirm("Remove the reported content? This action cannot be undone.")) return;
    setBusy(true); setError("");
    let removeError: any = null;
    if (report.target_type === "post") {
      const result = await supabase.from("posts").delete().eq("id", report.target_id); removeError = result.error;
    } else if (report.target_type === "comment") {
      const result = await supabase.from("comments").delete().eq("id", report.target_id); removeError = result.error;
    } else if (report.target_type === "project") {
      const result = await supabase.from("projects").update({ status: "rejected" }).eq("id", report.target_id); removeError = result.error;
    } else if (report.target_type === "group") {
      const result = await supabase.from("groups").delete().eq("id", report.target_id); removeError = result.error;
    } else {
      removeError = new Error("Profile restrictions require a separate account review.");
    }
    if (removeError) setError(removeError.message);
    else {
      await supabase.from("reports").update({ status: "resolved", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", report.id);
      setMessage("Reported content removed and report resolved.");
      await refresh();
    }
    setBusy(false);
  }

  async function reviewProject(projectId: string, status: "published" | "rejected") {
    if (!supabase || !isModerator) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.from("projects").update({ status }).eq("id", projectId);
    if (updateError) setError(updateError.message);
    else { setMessage(status === "published" ? "Project approved and published." : "Project submission declined."); await refresh(); }
    setBusy(false);
  }
  if (!configured) return <section className="admin-hq"><Shield size={28}/><h2>Admin HQ is not connected</h2><p>Connect the Supabase project and apply the reviewed database migration before staff controls can be used.</p></section>;
  if (!user) return <section className="admin-hq"><KeyRound size={28}/><h2>Sign in required</h2><p>Admin HQ is available only to authorised staff accounts.</p></section>;
  if (!isStaff) return <section className="admin-hq"><Shield size={28}/><h2>Restricted area</h2><p>This account does not have an active staff role. Admin HQ is not visible to ordinary members.</p></section>;

  return (
    <section className="admin-hq">
      <header className="admin-hq-heading admin-design-banner">
        <div><div className="eyebrow">MANAGE · SUPPORT · KEEP LYKYOU SPACE AMAZING</div><h2>Admin HQ</h2><p>Staff access, moderation readiness and platform oversight.</p><span className="admin-banner-note">Same sky. Same dream. LYKYOU ♡</span></div>
        <div className="admin-hq-mark"><ShieldCheck size={28}/></div>
      </header>
      <div className="admin-content-studio">
        <div><span className="eyebrow">CONTENT & COMMUNITY TOOLS</span><h3>Manage your Space</h3><p>Upload member photos, update LYKN Universe pages, publish announcements and manage fan events from their dedicated editors.</p></div>
        <div className="admin-content-links">
          <button onClick={()=>navigate("/lykn-universe")}><Users size={16}/> Member photos & LYKN Universe <span>Open editor →</span></button>
          <button onClick={()=>navigate("/updates")}><RefreshCw size={16}/> LYKN Updates & schedules <span>Publish updates →</span></button>
          <button onClick={()=>navigate("/fan-project-wall")}><ShieldCheck size={16}/> Fan projects & approvals <span>Manage projects →</span></button>
          <button onClick={()=>navigate("/events-countdowns")}><KeyRound size={16}/> Events & countdowns <span>Manage events →</span></button>
          {isAdmin && <><button onClick={()=>navigate("/admin/beta")}><ClipboardList size={16}/> Beta applications <span>Review applicants →</span></button><button onClick={()=>navigate("/admin/beta-testing")}><ShieldCheck size={16}/> Beta Testing HQ <span>Feedback, tasks & tester access →</span></button></>}
        </div>
      </div>
      <div className="admin-hq-stats">
        <div><Users size={18}/><strong>{staff.length || "—"}</strong><span>Active staff roles</span></div>
        <div><KeyRound size={18}/><strong>{isOwner ? "Owner" : isAdmin ? "Admin" : "Staff"}</strong><span>Your access level</span></div>
        <div><Shield size={18}/><strong>{roles.length}</strong><span>Roles on your account</span></div>
      </div>
      {error && <div className="auth-message error" role="alert">{error}</div>}
      {message && <div className="auth-message success" role="status">{message}</div>}
      <div className="admin-hq-section">
        <div className="admin-section-heading"><div><h3>Staff directory</h3><p>Only active role assignments are shown.</p></div><button className="button-outline button-small" onClick={() => void refresh()}><RefreshCw size={14}/> Refresh</button></div>
        {loading ? <p className="admin-muted">Loading staff…</p> : staff.length === 0 ? <p className="admin-muted">No staff roles were returned.</p> : (
          <div className="staff-list">{staff.map((row) => <div className="staff-row" key={row.user_id + row.role}>
            <div className="staff-avatar">{(row.display_name ?? "L").slice(0,1).toUpperCase()}</div>
            <div className="staff-person"><strong>{row.display_name}</strong><span>@{row.username}</span></div>
            <span className="staff-role">{row.role.replace("_", " ")}</span>
            {isOwner && row.role !== "owner" && (confirmRevoke === row.user_id + row.role
              ? <span className="staff-confirm"><button onClick={() => void revokeRole(row)} disabled={busy}>Confirm</button><button onClick={() => setConfirmRevoke(null)}>Cancel</button></span>
              : <button className="staff-revoke" onClick={() => setConfirmRevoke(row.user_id + row.role)}>Revoke</button>)}
          </div>)}</div>
        )}
      </div>
      {isOwner && <div className="admin-hq-section">
        <div className="admin-section-heading"><div><h3>Appoint a staff member</h3><p>Search by the member's unique username. The database checks owner permission again before changing roles.</p></div><UserPlus size={20}/></div>
        <div className="staff-assign">
          <label>Member username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" /></label>
          <label>Role<select value={role} onChange={(e) => setRole(e.target.value)}><option value="admin">Co-admin</option><option value="moderator">Moderator</option><option value="project_organiser">Project organiser</option></select></label>
          <button className="button-primary" onClick={() => void assignRole()} disabled={busy || !username.trim()}><UserPlus size={15}/>{busy ? "Saving…" : "Appoint staff"}</button>
        </div>
      </div>}
      {isOwner && <div className="admin-hq-section">
        <div className="admin-section-heading"><div><h3>Assign project organisers</h3><p>Only members with an active Project organiser role can be assigned to specific work.</p></div><ShieldCheck size={19}/></div>
        <div className="staff-assign">
          <label>Member username<input value={organiserUsername} onChange={(e)=>setOrganiserUsername(e.target.value)} placeholder="@username"/></label>
          <label>Project<select value={selectedProject} onChange={(e)=>setSelectedProject(e.target.value)}><option value="">Choose project</option>{projectOptions.map((p:any)=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
          <button className="button-primary" onClick={()=>void assignOrganiser("project")} disabled={busy||!organiserUsername.trim()||!selectedProject}>Assign to project</button>
          <label>Event<select value={selectedEvent} onChange={(e)=>setSelectedEvent(e.target.value)}><option value="">Choose event</option>{eventOptions.map((e:any)=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
          <button className="button-outline" onClick={()=>void assignOrganiser("event")} disabled={busy||!organiserUsername.trim()||!selectedEvent}>Assign to event</button>
        </div>
      </div>}
      {isModerator && <div className="admin-hq-section">
        <div className="admin-section-heading"><div><h3>Moderation queue</h3><p>Private reports visible only to authorised moderators and admins.</p></div><span className="staff-role">{reports.length} open</span></div>
        {reports.length===0 ? <p className="admin-muted">No open reports. Nice and quiet.</p> : reports.map((report:any)=><article className="moderation-row" key={report.id}><div><strong>{report.reason.replace("_"," ")}</strong><span>{report.target_type} · {new Date(report.created_at).toLocaleString()}</span><p>{report.details || "No additional details provided."}</p></div><div className="moderation-actions"><button onClick={()=>void updateReport(report.id,"reviewing")} disabled={busy}>Reviewing</button><button onClick={()=>void updateReport(report.id,"resolved")} disabled={busy}>Resolve</button><button onClick={()=>void updateReport(report.id,"dismissed")} disabled={busy}>Dismiss</button>{["post","comment","project","group"].includes(report.target_type)&&<button onClick={()=>void removeReportedContent(report)} disabled={busy}>Remove content</button>}</div></article>)}
      </div>}
      {isModerator && <div className="admin-hq-section">
        <div className="admin-section-heading"><div><h3>Project approval queue</h3><p>Member project ideas are reviewed before publication.</p></div><span className="staff-role">{pendingProjects.length} pending</span></div>
        {pendingProjects.length===0 ? <p className="admin-muted">No project submissions waiting for review.</p> : pendingProjects.map((project:any)=><article className="moderation-row" key={project.id}><div><strong>{project.title}</strong><span>Submitted {new Date(project.created_at).toLocaleDateString()}</span><p>{project.summary}</p></div><div className="moderation-actions"><button onClick={()=>void reviewProject(project.id,"published")} disabled={busy}>Approve</button><button onClick={()=>void reviewProject(project.id,"rejected")} disabled={busy}>Decline</button></div></article>)}
      </div>}
      {isAdmin && <div className="admin-hq-section">
        <div className="admin-section-heading"><div><h3>Account deletion requests</h3><p>Permanent deletion is available to the Main Admin only. The Main Admin account is protected.</p></div><span className="staff-role">{deletionRequests.length} pending</span></div>
        {deletionRequests.length === 0 ? <p className="admin-muted">No account deletion requests.</p> : deletionRequests.map((request: any) => <article className="moderation-row" key={request.id}><div><strong>{request.person?.display_name ?? "LYKYOU"} · @{request.person?.username ?? "member"}</strong><span>Requested {new Date(request.created_at).toLocaleString()} · {request.status}</span><p>{request.reason || "No reason supplied."}</p></div><div className="moderation-actions"><button onClick={() => void updateDeletionRequest(request.id, "reviewing")} disabled={busy}>Review</button>{isOwner && <button onClick={() => void processDeletion(request)} disabled={busy}>Delete account</button>}<button onClick={() => void updateDeletionRequest(request.id, "declined")} disabled={busy}>Decline</button></div></article>)}
      </div>}
      {isOwner && <div className="admin-hq-section">
        <div className="admin-section-heading"><div><h3>Recent deletion audit</h3><p>Recent completed account removals. Personal account data is not retained here.</p></div></div>
        {deletionAudit.length === 0 ? <p className="admin-muted">No completed account deletions.</p> : deletionAudit.map((entry: any) => <article className="moderation-row" key={entry.id}><div><strong>{entry.target_display_name ?? "Deleted member"} · @{entry.target_username ?? "member"}</strong><span>Deleted {new Date(entry.deleted_at).toLocaleString()} by @{entry.deleted_by_username ?? "admin"}</span>{entry.cleanup_warnings?.length > 0 && <p>Media cleanup warning: {entry.cleanup_warnings.join("; ")}</p>}</div></article>)}
      </div>}
      <div className="admin-hq-note"><ShieldCheck size={17}/><p>Staff roles are enforced by Supabase Row Level Security. Hiding a button in the interface does not grant or remove permissions. Ownership transfer is intentionally kept out of this routine staff form.</p></div>
    </section>
  );
}
