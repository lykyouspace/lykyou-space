import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Check, Save, UserRound, Camera, ImagePlus, MessageCircle, Send, Trophy, CalendarDays, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, useStaffRole } from "../lib/auth";
import { supabase } from "../lib/supabase";
import "./profile-achievements.css";

const MEMBERS = ["WILLIAM", "LEGO", "NUT", "HONG", "TUI"];

type PrivateForm = {
  city: string; state: string; country: string; timezone: string; fan_journey: string;
  interests: string; instagram: string; x: string; tiktok: string; youtube: string; global_board_opt_in: boolean;
};

const emptyPrivate: PrivateForm = {
  city: "", state: "", country: "", timezone: "", fan_journey: "",
  interests: "", instagram: "", x: "", tiktok: "", youtube: "", global_board_opt_in: false,
};

type ProfileForm = {
  username: string;
  display_name: string;
  bio: string;
  bias: string[];
  bias_wrecker: string[];
  favourite_song: string;
  favourite_era: string;
  profile_visibility: "public" | "members" | "private";
};

const emptyProfile: ProfileForm = {
  username: "",
  display_name: "",
  bio: "",
  bias: [],
  bias_wrecker: [],
  favourite_song: "",
  favourite_era: "",
  profile_visibility: "public",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, configured } = useAuth();
  const { isStaff } = useStaffRole();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [privateForm, setPrivateForm] = useState<PrivateForm>(emptyPrivate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileComments, setProfileComments] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [projectHistory, setProjectHistory] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user || !supabase) {
        setLoading(false);
        return;
      }
      const [{ data, error: loadError }, { data: privateData, error: privateError }] = await Promise.all([
        supabase.from("profiles")
          .select("username,display_name,bio,bias,bias_wrecker,favourite_song,favourite_era,profile_visibility,avatar_url,cover_url")
          .eq("id", user.id).maybeSingle(),
        supabase.from("profile_private")
          .select("city,state,country,timezone,fan_journey,interests,social_links,global_board_opt_in")
          .eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      if (loadError) setError(loadError.message);
      if (privateError) setError(privateError.message);
      if (privateData) {
        const links = privateData.social_links ?? {};
        setPrivateForm({
          city: privateData.city ?? "", state: privateData.state ?? "", country: privateData.country ?? "",
          timezone: privateData.timezone ?? "", fan_journey: privateData.fan_journey ?? "",
          interests: (privateData.interests ?? []).join(", "),
          instagram: links.instagram ?? "", x: links.x ?? "", tiktok: links.tiktok ?? "", youtube: links.youtube ?? "",
          global_board_opt_in: privateData.global_board_opt_in ?? false,
        });
      }
      if (data) {
        setAvatarUrl(data.avatar_url ?? "");
        setCoverUrl(data.cover_url ?? "");
        // If an earlier profile save cleared the cover URL, try to recover the
        // existing user's latest cover from their own storage folder.
        if (!data.cover_url) {
          const folder = "covers/" + user.id;
          const { data: coverFiles, error: coverListError } = await supabase.storage
            .from("space-media")
            .list(folder, { limit: 100, sortBy: { column: "updated_at", order: "desc" } });
          if (!coverListError) {
            const latestCover = (coverFiles ?? []).find((file: any) =>
              file.name.startsWith("cover-") && !file.name.endsWith("/")
            );
            if (latestCover) {
              const recoveredPath = folder + "/" + latestCover.name;
              const recoveredUrl = supabase.storage.from("space-media").getPublicUrl(recoveredPath).data.publicUrl;
              const { error: recoverySaveError } = await supabase.from("profiles")
                .update({ cover_url: recoveredUrl }).eq("id", user.id);
              if (!recoverySaveError) setCoverUrl(recoveredUrl);
            }
          }
        }
        setForm({
        username: data.username ?? "",
        display_name: data.display_name ?? "",
        bio: data.bio ?? "",
        bias: data.bias ?? [],
        bias_wrecker: data.bias_wrecker ?? [],
        favourite_song: data.favourite_song ?? "",
        favourite_era: data.favourite_era ?? "",
        profile_visibility: data.profile_visibility ?? "public",
      }); }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [user?.id]);

  async function loadProfileComments() {
    if (!user || !supabase) return;
    const { data, error: commentsLoadError } = await supabase.from("profile_comments")
      .select("id,author_id,body,created_at,parent_id")
      .eq("profile_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (commentsLoadError) { setCommentError(commentsLoadError.message); return; }
    const rows = data ?? [];
    const authorIds = [...new Set(rows.map((row: any) => row.author_id))];
    const { data: authors, error: authorsError } = authorIds.length
      ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds)
      : { data: [], error: null };
    if (authorsError) { setCommentError(authorsError.message); return; }
    const authorMap = new Map((authors ?? []).map((author: any) => [author.id, author]));
    setProfileComments(rows.map((row: any) => ({ ...row, author: authorMap.get(row.author_id) ?? null })));
    setCommentError("");
  }

  useEffect(() => { if (user?.id) void loadProfileComments(); }, [user?.id]);
  useEffect(() => {
    let active = true;
    async function loadHistory(){
      if(!user||!supabase){setGameHistory([]);return;}
      const [gamesResult,rsvpsResult,tasksResult]=await Promise.all([
        supabase.from("game_sessions").select("id,game_key,score,created_at,result").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30),
        supabase.from("event_rsvps").select("event_id,response,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30),
        supabase.from("project_tasks").select("id,project_id,title,status,created_at").eq("assigned_user_id",user.id).eq("status","done").order("created_at",{ascending:false}).limit(30),
      ]);
      if(!active)return;
      setGameHistory(gamesResult.data??[]);
      setProjectHistory(tasksResult.data??[]);
      const rsvps=rsvpsResult.data??[];
      if(rsvps.length){const {data:events}=await supabase.from("events").select("id,title,starts_at,event_type").in("id",rsvps.map((item:any)=>item.event_id));const eventMap=new Map((events??[]).map((item:any)=>[item.id,item]));setEventHistory(rsvps.map((item:any)=>({...item,event:eventMap.get(item.event_id)})).filter((item:any)=>!!item.event));}else setEventHistory([]);
    }
    void loadHistory();
    return()=>{active=false;};
  },[user?.id]);

  async function publishProfileComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !supabase || !commentText.trim()) return;
    setCommentBusy(true); setCommentError("");
    const { error: insertError } = await supabase.from("profile_comments").insert({
      profile_id: user.id, author_id: user.id, body: commentText.trim(),
    });
    if (insertError) setCommentError(insertError.message);
    else { setCommentText(""); await loadProfileComments(); }
    setCommentBusy(false);
  }

  async function uploadProfileImage(kind: "avatar" | "cover", file?: File) {
    if (!file || !user || !supabase) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Please choose a JPG, PNG or WebP image."); return; }
    if (file.size > 3 * 1024 * 1024) { setError("Please keep each image under 3 MB."); return; }
    setError(""); setMessage(""); setUploading(kind);
    let uploadedPath: string | null = null;
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = (kind === "avatar" ? "avatars/" : "covers/") + user.id + "/" + kind + "-" + Date.now() + "." + ext;
      uploadedPath = path;
      const { error: uploadError } = await supabase.storage.from("space-media").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const url = supabase.storage.from("space-media").getPublicUrl(path).data.publicUrl;
      const previousUrl = kind === "avatar" ? avatarUrl : coverUrl;
      const { error: saveError } = await supabase.from("profiles").update(kind === "avatar" ? { avatar_url: url } : { cover_url: url }).eq("id", user.id);
      if (saveError) throw saveError;
      if (kind === "avatar") setAvatarUrl(url); else setCoverUrl(url);
      if (previousUrl) {
        const marker = "/storage/v1/object/public/space-media/";
        const oldPath = previousUrl.includes(marker) ? decodeURIComponent(previousUrl.split(marker)[1].split("?")[0]) : "";
        const expectedFolder = (kind === "avatar" ? "avatars/" : "covers/") + user.id + "/";
        if (oldPath.startsWith(expectedFolder)) {
          const { error: cleanupError } = await supabase.storage.from("space-media").remove([oldPath]);
          if (cleanupError) setMessage("Your image was updated, but the previous file could not be cleaned up.");
          else setMessage(kind === "avatar" ? "Profile picture updated." : "Cover image updated.");
        } else setMessage(kind === "avatar" ? "Profile picture updated." : "Cover image updated.");
      } else setMessage(kind === "avatar" ? "Profile picture updated." : "Cover image updated.");
    } catch (caught) { if (uploadedPath) await supabase.storage.from("space-media").remove([uploadedPath]); setError(caught instanceof Error ? caught.message : "Image upload failed."); }
    finally { setUploading(null); }
  }

  function toggleMember(field: "bias" | "bias_wrecker", member: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(member)
        ? current[field].filter((value) => value !== member)
        : [...current[field], member],
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!user || !supabase) return;
    const username = form.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setError("Username must be 3–24 characters using lowercase letters, numbers or underscores.");
      return;
    }
    setSaving(true);
    try {
      const [{ error: saveError }, { error: privateSaveError }] = await Promise.all([
        supabase.from("profiles").upsert({
          id: user.id,
          username,
          display_name: form.display_name.trim(),
          bio: form.bio.trim(),
          bias: form.bias,
          bias_wrecker: form.bias_wrecker,
          favourite_song: form.favourite_song.trim() || null,
          favourite_era: form.favourite_era.trim() || null,
          profile_visibility: form.profile_visibility,
          // Keep uploaded media references when saving text/profile details.
          avatar_url: avatarUrl || null,
          cover_url: coverUrl || null,
        }),
        supabase.from("profile_private").upsert({
          user_id: user.id,
          city: privateForm.city.trim() || null,
          state: privateForm.state.trim() || null,
          country: privateForm.country.trim() || null,
          global_board_opt_in: privateForm.global_board_opt_in,
          timezone: privateForm.timezone.trim() || null,
          fan_journey: privateForm.fan_journey.trim(),
          interests: privateForm.interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30),
          social_links: {
            instagram: privateForm.instagram.trim() || null,
            x: privateForm.x.trim() || null,
            tiktok: privateForm.tiktok.trim() || null,
            youtube: privateForm.youtube.trim() || null,
          },
        }),
      ]);
      if (saveError) throw saveError;
      if (privateSaveError) throw privateSaveError;
      setMessage("Your profile has been saved.");
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return (
    <section className="profile-editor">
      <div className="profile-editor-icon"><UserRound size={25}/></div>
      <h2>Sign in to set up your profile</h2>
      <p>Your profile is your little corner of LYKYOU Space. Sign in or create an account to continue.</p>
      <button className="button-primary" onClick={() => navigate("/login")}>Sign in <ArrowRight size={15}/></button>
    </section>
  );

  if (!configured || loading) return <section className="profile-editor"><p>{!configured ? "Profile data will be available when Supabase is connected." : "Loading your profile…"}</p></section>;

  if (!editing) return (
    <section className="member-profile-view">
      <div className="member-profile-cover" style={coverUrl ? { backgroundImage: "linear-gradient(90deg,rgba(10,8,28,.28),rgba(10,8,28,.12)),url(" + coverUrl + ")", backgroundSize:"cover", backgroundPosition:"center" } : undefined}><span>✦ YOUR LYKYOU SPACE ✦</span></div>
      <div className="member-profile-main">
        <div className="member-profile-avatar">{avatarUrl ? <img src={avatarUrl} alt="Profile" /> : (form.display_name || user.user_metadata?.display_name || "L").slice(0,1).toUpperCase()}</div>
        <div className="member-profile-title"><div><h2>{form.display_name || user.user_metadata?.display_name || "LYKYOU"}</h2><span>@{form.username || "username-not-set"}</span></div><div className="member-profile-actions">{isStaff && <button className="button-outline" onClick={() => navigate("/admin")}>Admin HQ</button>}<button className="button-primary" onClick={() => setEditing(true)}>Edit profile</button><button className="button-outline" onClick={async()=>{if(supabase){await supabase.auth.signOut();navigate("/login");}}}>Log out</button></div></div>
        <div className="member-profile-media-actions">
          <label className="button-outline profile-upload-button"><Camera size={14}/>{uploading === "avatar" ? "Uploading…" : "Change picture"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={(e)=>{void uploadProfileImage("avatar",e.target.files?.[0]);e.currentTarget.value="";}}/></label>
          <label className="button-outline profile-upload-button"><ImagePlus size={14}/>{uploading === "cover" ? "Uploading…" : "Change cover"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={(e)=>{void uploadProfileImage("cover",e.target.files?.[0]);e.currentTarget.value="";}}/></label>
        </div>
        {error && <div className="auth-message error" role="alert">{error}</div>}
        <p className="member-profile-bio">{form.bio || "This LYKYOU is just getting settled into their space."}</p>
        <div className="member-profile-facts">
          <div><small>MY BIAS</small><strong>{form.bias.length ? form.bias.join(" · ") : "Not set yet"}</strong></div>
          <div><small>BIAS WRECKER</small><strong>{form.bias_wrecker.length ? form.bias_wrecker.join(" · ") : "Not set yet"}</strong></div>
          <div><small>FAVOURITE SONG</small><strong>{form.favourite_song || "Not added yet"}</strong></div>
          <div><small>FAVOURITE ERA</small><strong>{form.favourite_era || "Not added yet"}</strong></div>
        </div>
        <section className="profile-achievement-history" aria-labelledby="my-profile-achievement-title">
          <div className="profile-achievement-heading"><div><span className="eyebrow">YOUR FANDOM JOURNEY</span><h3 id="my-profile-achievement-title">Achievement history</h3><p>Games, challenges and little wins you've recorded in Space.</p></div><Trophy size={24}/></div>
          <div className="profile-achievement-badges">
            {gameHistory.length>0&&<span>✦ First Play</span>}
            {gameHistory.some((item:any)=>item.game_key==="quiz_arena")&&<span>✦ Quiz Star</span>}
            {gameHistory.some((item:any)=>item.game_key==="fandom_bingo")&&<span>✦ Bingo Master</span>}
            {gameHistory.some((item:any)=>item.game_key==="daily_challenge")&&<span>✦ Daily Spark</span>}
            {gameHistory.some((item:any)=>item.game_key==="lykn_match")&&<span>✦ Matchmaker</span>}
          </div>
{gameHistory.length===0&&eventHistory.length===0&&projectHistory.length===0?<div className="profile-comment-empty">Your games, event RSVPs and completed project tasks will appear here.</div>:<><div className="profile-achievement-list">{gameHistory.map((item:any)=><article key={"game-"+item.id}><span>✦</span><div><strong>{({quiz_arena:"LYKN Quiz Arena",word_games:"Word Games",emoji_decoder:"Emoji Decoder",this_or_that:"This or That",lykn_match:"LYKN Match",daily_challenge:"Daily Challenge",fandom_bingo:"Fandom Bingo",memory_match:"Memory Match"} as Record<string,string>)[item.game_key]||item.game_key}</strong><small>{item.result?.challenge||item.result?.message||"Completed a Space activity"} · {new Date(item.created_at).toLocaleDateString()}</small></div><b>{item.score} pts</b></article>)}</div>{eventHistory.length>0&&<div className="profile-achievement-subgroup"><h4><CalendarDays size={14}/> Event participation</h4>{eventHistory.map((item:any)=><article key={"event-"+item.event_id}><span>✦</span><div><strong>{item.event.title}</strong><small>{item.response==="going"?"Going":item.response==="interested"?"Interested":"RSVP"} · {new Date(item.event.starts_at).toLocaleDateString()}</small></div></article>)}</div>}{projectHistory.length>0&&<div className="profile-achievement-subgroup"><h4><ListChecks size={14}/> Completed project tasks</h4>{projectHistory.map((item:any)=><article key={"task-"+item.id}><span>✦</span><div><strong>{item.title}</strong><small>Completed contribution · {new Date(item.created_at).toLocaleDateString()}</small></div></article>)}</div>}</>}
        </section>
        <section className="profile-guestbook" aria-labelledby="my-profile-guestbook-title">
          <div className="profile-guestbook-heading"><div><span className="eyebrow">MESSAGES FROM YOUR PEOPLE</span><h3 id="my-profile-guestbook-title">Profile comments <span>{profileComments.length}</span></h3><p>A little space for LYKYOUs to leave you a message.</p></div><MessageCircle size={24}/></div>
          <form className="profile-comment-compose" onSubmit={publishProfileComment}>
            <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Leave a message on your profile…" maxLength={1000} rows={3} required />
            <div><small>{commentText.length}/1000</small><button className="button-primary" type="submit" disabled={commentBusy || !commentText.trim()}><Send size={14}/>{commentBusy ? "Posting…" : "Post comment"}</button></div>
          </form>
          {commentError && <p className="auth-message error" role="alert">{commentError}</p>}
          {profileComments.length === 0 ? <div className="profile-comment-empty">No comments yet. Share your profile and invite your fandom friends to say hello.</div> : <div className="profile-comment-list">
            {profileComments.filter((comment: any) => !comment.parent_id).map((comment: any) => <article className="profile-comment" key={comment.id}>
              <div className="profile-comment-main"><div className="profile-comment-avatar">{comment.author?.avatar_url ? <img src={comment.author.avatar_url} alt=""/> : (comment.author?.display_name ?? "L").slice(0,1).toUpperCase()}</div>
                <div className="profile-comment-content"><div className="profile-comment-meta"><strong>{comment.author?.display_name ?? "LYKYOU"}</strong><span>@{comment.author?.username ?? "lykyou"}</span><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString()}</time></div><p>{comment.body}</p></div>
              </div>
            </article>)}
          </div>}
        </section>
        <p className="member-profile-privacy">Your profile visibility is set to <strong>{form.profile_visibility}</strong>. Optional personal details remain private.</p>
        {message && <div className="auth-message success" role="status">{message}</div>}
      </div>
    </section>
  );

  return (
    <section className="profile-editor">
      <div className="profile-editor-heading">
        <div><div className="eyebrow">YOUR MEMBER SPACE</div><h2>My profile</h2><p>Choose what you want the community to know about you.</p></div>
        <div className="profile-editor-icon"><UserRound size={25}/></div>
      </div>
      {error && <div className="auth-message error" role="alert">{error}</div>}
      {message && <div className="auth-message success" role="status">{message}</div>}
      <div className="profile-media-tools">
        <div className="profile-media-preview"><div className="profile-media-avatar">{avatarUrl ? <img src={avatarUrl} alt="Current profile" /> : (form.display_name || "L").slice(0,1).toUpperCase()}</div><div><strong>Profile picture</strong><span>JPG, PNG or WebP · up to 3 MB</span><label className="button-secondary profile-upload-button"><Camera size={15}/>{uploading === "avatar" ? "Uploading…" : "Upload picture"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={(e)=>{void uploadProfileImage("avatar",e.target.files?.[0]);e.currentTarget.value="";}} /></label></div></div>
        <div className="profile-media-cover" style={coverUrl ? {backgroundImage:"url(" + coverUrl + ")",backgroundSize:"cover",backgroundPosition:"center"} : undefined}><div><strong>Cover image</strong><span>JPG, PNG or WebP · up to 3 MB</span><label className="button-secondary profile-upload-button"><ImagePlus size={15}/>{uploading === "cover" ? "Uploading…" : "Upload cover"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={(e)=>{void uploadProfileImage("cover",e.target.files?.[0]);e.currentTarget.value="";}} /></label></div></div>
      </div>
      <div className="profile-editor-actions">{isStaff && <button type="button" className="button-outline" onClick={()=>navigate("/admin")}>Open Admin HQ</button>}<button type="button" className="button-outline" onClick={async()=>{if(supabase){await supabase.auth.signOut();navigate("/login");}}}>Log out</button></div>
      <form onSubmit={save} className="profile-form">
        <label>Display name<input value={form.display_name} onChange={(e) => setForm({...form, display_name:e.target.value})} maxLength={40} required /></label>
        <label>Unique username<input value={form.username} onChange={(e) => setForm({...form, username:e.target.value.toLowerCase()})} minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" required /></label>
        <label>Bio<textarea value={form.bio} onChange={(e) => setForm({...form, bio:e.target.value})} maxLength={280} rows={3} placeholder="A little about your fandom journey…" /></label>
        <div className="profile-field">
          <strong>My bias</strong><span>Select one, several, all five or none.</span>
          <div className="bias-options">{MEMBERS.map((member) => <button type="button" key={member} className={form.bias.includes(member) ? "chosen" : ""} onClick={() => toggleMember("bias", member)}>{form.bias.includes(member) && <Check size={13}/>} {member}</button>)}</div>
        </div>
        <div className="profile-field">
          <strong>Bias wrecker</strong><span>Multiple choices are welcome.</span>
          <div className="bias-options">{MEMBERS.map((member) => <button type="button" key={member} className={form.bias_wrecker.includes(member) ? "chosen" : ""} onClick={() => toggleMember("bias_wrecker", member)}>{form.bias_wrecker.includes(member) && <Check size={13}/>} {member}</button>)}</div>
        </div>
        <div className="profile-two-col">
          <label>Favourite LYKN song<input value={form.favourite_song} onChange={(e) => setForm({...form, favourite_song:e.target.value})} maxLength={100} /></label>
          <label>Favourite era<input value={form.favourite_era} onChange={(e) => setForm({...form, favourite_era:e.target.value})} maxLength={100} /></label>
        </div>
        <label>Profile visibility<select value={form.profile_visibility} onChange={(e) => setForm({...form, profile_visibility:e.target.value as ProfileForm["profile_visibility"]})}><option value="public">Public — anyone can view</option><option value="members">Members only</option><option value="private">Private — only you and authorised staff</option></select></label>
        <div className="profile-private-section">
          <div><strong>Optional details</strong><span>These details are stored separately and are visible only to you and authorised platform admins, except your country can be included in anonymous aggregate counts if you opt in below.</span></div>
          <div className="profile-two-col">
            <label>City<input value={privateForm.city} onChange={(e)=>setPrivateForm({...privateForm,city:e.target.value})} maxLength={80}/></label>
            <label>State / region<input value={privateForm.state} onChange={(e)=>setPrivateForm({...privateForm,state:e.target.value})} maxLength={80}/></label>
            <label>Country<input value={privateForm.country} onChange={(e)=>setPrivateForm({...privateForm,country:e.target.value})} maxLength={80}/></label>
            <label>Timezone<input value={privateForm.timezone} onChange={(e)=>setPrivateForm({...privateForm,timezone:e.target.value})} maxLength={80} placeholder="e.g. Asia/Kolkata"/></label>
          </div>
          <label className="profile-global-board-optin"><input type="checkbox" checked={privateForm.global_board_opt_in} onChange={(e)=>setPrivateForm({...privateForm,global_board_opt_in:e.target.checked})}/> <span><strong>Include my country in the Global LYKYOU Board</strong><small>Optional. Only an aggregated country count is shown publicly (and only after at least 3 members opt in). Your name, city and profile are not shown on the country board.</small></span></label>
          <label>My fandom journey<textarea value={privateForm.fan_journey} onChange={(e)=>setPrivateForm({...privateForm,fan_journey:e.target.value})} maxLength={2000} rows={3}/></label>
          <label>Interests (comma separated)<input value={privateForm.interests} onChange={(e)=>setPrivateForm({...privateForm,interests:e.target.value})} placeholder="music, dance, edits, photography"/></label>
          <div className="profile-two-col">
            <label>Instagram URL<input value={privateForm.instagram} onChange={(e)=>setPrivateForm({...privateForm,instagram:e.target.value})} placeholder="https://…"/></label>
            <label>X URL<input value={privateForm.x} onChange={(e)=>setPrivateForm({...privateForm,x:e.target.value})} placeholder="https://…"/></label>
            <label>TikTok URL<input value={privateForm.tiktok} onChange={(e)=>setPrivateForm({...privateForm,tiktok:e.target.value})} placeholder="https://…"/></label>
            <label>YouTube URL<input value={privateForm.youtube} onChange={(e)=>setPrivateForm({...privateForm,youtube:e.target.value})} placeholder="https://…"/></label>
          </div>
        </div>
        <div className="profile-save-row"><span>Optional details remain private by default. Public profile visibility applies only to the public profile fields above.</span><button className="button-primary" type="submit" disabled={saving}><Save size={15}/>{saving ? "Saving…" : "Save profile"}</button></div>
      </form>
    </section>
  );
}
