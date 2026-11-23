import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowRight, Bell, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleHelp, Flame, Gamepad2, Heart, Home, Menu, MessageCircle,
  MoreHorizontal, Plus, Search, Settings, Shield, Sparkles, Star, Trophy,
  Users, X, Zap, Bookmark, Music2, Megaphone, FolderHeart, Globe2, Send,
  Clock3, PartyPopper, Image, type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./space-pages.css";
import { useAuth, useStaffRole } from "./lib/auth";
import AdminHQPage from "./pages/AdminHQPage";
import { BookmarksPage, NotificationsPage, SettingsPage } from "./pages/MemberToolsPage";
import MembersPage from "./pages/MembersPage";
import GroupsPage from "./pages/GroupsPage";
import ProfilePage from "./pages/ProfilePage";
import { supabase } from "./lib/supabase";

type NavItem = { label: string; path: string; icon: LucideIcon; description?: string };
const mainNav: NavItem[] = [
  { label: "Home", path: "/", icon: Home, description: "Your fandom home base" },
  { label: "Community", path: "/community", icon: Users, description: "Find your people" },
  { label: "Discover", path: "/discover", icon: Search, description: "Find members and groups" },
  { label: "Fun Zone", path: "/fun-zone", icon: Gamepad2, description: "Play, collect and compete" },
  { label: "Bias Corner", path: "/bias-corner", icon: Heart, description: "Celebrate your bias and OT5" },
  { label: "Fan Project Wall", path: "/fan-project-wall", icon: FolderHeart, description: "Join fan projects" },
  { label: "Events & Meetups", path: "/events-countdowns", icon: CalendarDays, description: "Find fandom events" },
  { label: "Fandom Hub", path: "/fandom-hub", icon: Heart, description: "Projects, campaigns and fandom activities" },
  { label: "LYKN", path: "/lykn-universe", icon: Globe2, description: "Meet the group and members" },
  { label: "LYKN Archive", path: "/lykn-archive", icon: Music2, description: "Songs, videos, discography and milestones" },
  { label: "LYKN Updates", path: "/updates", icon: Megaphone, description: "Fanclub updates and schedules" },
];
const members = [
  { name: "WILLIAM", role: "Vocal · Performer", tone: "lavender", initials: "W" },
  { name: "LEGO", role: "Vocal · Performer", tone: "mint", initials: "L" },
  { name: "NUT", role: "Vocal · Performer", tone: "pink", initials: "N" },
  { name: "HONG", role: "Vocal · Performer", tone: "blue", initials: "H" },
  { name: "TUI", role: "Vocal · Performer", tone: "orange", initials: "T" },
];
const samplePosts = [
  { id: "sample-1", name: "Mira", handle: "@miraverse", time: "18 min ago", initials: "M", tone: "pink", text: "That last chorus in the live stage has been living in my head all day. The harmonies?? I need everyone to appreciate them with me. 💜", tags: ["LYKN", "Live Stage"], likes: 128, comments: 24 },
  { id: "sample-2", name: "Aarav", handle: "@nutmegcloud", time: "42 min ago", initials: "A", tone: "mint", text: "Question for the LYKYOUs: which LYKN song would you introduce to someone who has never heard them before?", tags: ["Discussion", "Music"], likes: 86, comments: 39 },
  { id: "sample-3", name: "Jules", handle: "@orbitingot5", time: "1 hr ago", initials: "J", tone: "lavender", text: "Working on a little fan project for the next milestone. Looking for people who enjoy writing, editing or making playlists. More details soon! ✨", tags: ["Fan Project"], likes: 54, comments: 12 },
];
const games = [
  { title: "LYKN Quiz Arena", detail: "How well do you know the boys?", icon: CircleHelp, tag: "Knowledge", tone: "lavender", art: "/images/game-quiz-arena.svg" },
  { title: "Who's Your LYKN Match?", detail: "Find your fandom energy twin", icon: Heart, tag: "Just for fun", tone: "pink", art: "/images/game-lykn-match.svg" },
  { title: "This or That", detail: "Pick a side. No wrong answers.", icon: Zap, tag: "Quick play", tone: "mint", art: "/images/game-this-or-that.svg" },
  { title: "Daily Challenge", detail: "A fresh little mission every day", icon: Flame, tag: "Daily", tone: "orange", art: "/images/game-daily-challenge.svg" },
  { title: "Fandom Bingo", detail: "Tick off your LYKYOU moments", icon: Trophy, tag: "Collect", tone: "blue", art: "/images/game-fandom-bingo.svg" },
  { title: "Emoji Decoder", detail: "Can you guess the song or moment?", icon: Sparkles, tag: "Puzzle", tone: "lavender", art: "/images/game-emoji-decoder.svg" },
  { title: "Memory Match", detail: "Find every matching fandom pair.", icon: Star, tag: "Memory", tone: "blue", art: "/images/game-memory-match.svg" },
  { title: "Word Games", detail: "Unscramble LYKN words and names.", icon: Music2, tag: "Puzzle", tone: "mint", art: "/images/game-word-games.svg" },
];
const hubItems = [
  { title: "Fan Project Wall", desc: "Discover projects, join a team and track progress together.", icon: FolderHeart, count: "Open projects", tone: "pink" },
  { title: "Events & Meetups", desc: "Find online and offline fan gatherings around the world.", icon: CalendarDays, count: "Community calendar", tone: "lavender" },
  { title: "Campaigns", desc: "Streaming, voting, birthday and comeback missions in one place.", icon: Megaphone, count: "Join a campaign", tone: "mint" },
  { title: "Space Countdown", desc: "Keep the next birthdays, releases and fan events in sight.", icon: Clock3, count: "Upcoming moments", tone: "orange" },
  { title: "Community Activities", desc: "Challenges and shared missions for the whole fandom.", icon: PartyPopper, count: "Take part", tone: "blue" },
  { title: "Memories & Contributions", desc: "A moderated collection of fan art, messages and memories.", icon: Star, count: "Community gallery", tone: "pink" },
];
const updateItems = [
  { category: "SCHEDULES & APPEARANCES", title: "LYKN schedule board", desc: "A combined calendar with individual member filters and source links.", date: "Schedule hub", tone: "lavender" },
  { category: "MUSIC & RELEASES", title: "Music and release updates", desc: "Comebacks, new releases, music videos and streaming guides.", date: "Updates hub", tone: "mint" },
  { category: "NEWS & ANNOUNCEMENTS", title: "Fanclub announcements", desc: "Important notices and campaigns from LYKN India Fanclub.", date: "Fanclub desk", tone: "pink" },
];
function Avatar({ initials, tone = "lavender", size = "md", src }: { initials: string; tone?: string; size?: "sm" | "md" | "lg"; src?: string }) {
  return <span className={`avatar avatar-${tone} avatar-${size}`}>{src ? <img src={src} alt="" /> : initials}</span>;
}
function SectionHeading({ eyebrow, title, note, action }: { eyebrow?: string; title: string; note?: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</div>;
}
function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="panel-title"><h3>{children}</h3>{action}</div>;
}
function SpacePages() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, configured } = useAuth();
  const { isStaff } = useStaffRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [liked, setLiked] = useState<string[]>([]);
  const [bookmarked, setBookmarked] = useState<string[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [postType, setPostType] = useState<"text"|"question">("text");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [activeFilter, setActiveFilter] = useState("For you");
  const [notice, setNotice] = useState("");
  const current = mainNav.find((item) => item.path === location.pathname) ?? { ...mainNav[0], label: location.pathname === "/profile" ? "My profile" : location.pathname === "/admin" ? "Admin HQ" : location.pathname.startsWith("/members/") ? "Member profile" : location.pathname === "/members" ? "Members" : location.pathname === "/groups" ? "Groups" : location.pathname === "/notifications" ? "Notifications" : location.pathname === "/bookmarks" ? "Saved posts" : location.pathname === "/settings" ? "Settings" : location.pathname === "/bias-corner" ? "Bias Corner" : location.pathname === "/fan-project-wall" ? "Fan Project Wall" : location.pathname === "/events-countdowns" ? "Events & Countdowns" : "Your space" };
  const [posts, setPosts] = useState<any[]>(configured ? [] : samplePosts);
  const [feedLoaded, setFeedLoaded] = useState(!configured);
  const [feedIsLive, setFeedIsLive] = useState(false);
  const [homeCountdown,setHomeCountdown] = useState<any>(null);
  const [currentProfile,setCurrentProfile] = useState<any>(null);
  const go = (path: string) => { navigate(path); setMobileOpen(false); setMoreOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  useEffect(() => { setMobileOpen(false); setMoreOpen(false); }, [location.pathname]);

  const refreshFeed = useCallback(async () => {
    if (!configured || !supabase) {
      setPosts(samplePosts);
      setFeedIsLive(false);
      setLiked([]);
      setBookmarked([]);
      setFeedLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("posts")
      .select("id,author_id,body,visibility,created_at,post_type,media_url")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) {
      setNotice("The live feed database is not ready yet. Preview posts are shown instead.");
      setPosts(samplePosts);
      setFeedIsLive(false);
      setFeedLoaded(true);
      return;
    }
    const rows = data ?? [];
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const postIds = rows.map((row) => row.id);
    const [{ data: profiles }, { data: likes }, { data: comments }, { data: friendLinks }] = await Promise.all([
      authorIds.length ? supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds) : Promise.resolve({ data: [] }),
      postIds.length ? supabase.from("post_likes").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] }),
      postIds.length ? supabase.from("comments").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] }),
      user ? supabase.from("friendships").select("user_low,user_high").or(`user_low.eq.${user.id},user_high.eq.${user.id}`) : Promise.resolve({ data: [] }),
    ]);
    setFriendIds((friendLinks ?? []).map((link: any) => link.user_low === user?.id ? link.user_high : link.user_low));
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    const likeCounts = new Map<string, number>();
    const commentCounts = new Map<string, number>();
    (likes ?? []).forEach((like: any) => likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1));
    (comments ?? []).forEach((comment: any) => commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1));
    setFeedIsLive(true);
    setPosts(rows.map((row: any, index: number) => {
      const profile: any = profileMap.get(row.author_id);
      const body = row.body ?? "";
      const elapsed = Math.max(0, Date.now() - new Date(row.created_at).getTime());
      const minutes = Math.floor(elapsed / 60000);
      const time = minutes < 1 ? "just now" : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
      return {
        id: row.id,
        authorId: row.author_id,
        post_type: row.post_type,
        name: profile?.display_name ?? "LYKYOU",
        handle: profile?.username ? `@${profile.username}` : "@lykyou",
        time,
        initials: (profile?.display_name ?? "L").slice(0, 1).toUpperCase(),
        avatarUrl: profile?.avatar_url ?? undefined,
        mediaUrl: row.media_url ?? undefined,
        tone: ["lavender", "mint", "pink", "blue", "orange"][index % 5],
        text: body,
        tags: (body.match(/#[a-z0-9_]+/gi) ?? []).map((tag: string) => tag.slice(1)),
        likes: likeCounts.get(row.id) ?? 0,
        comments: commentCounts.get(row.id) ?? 0,
      };
    }));
    if (user && postIds.length) {
      const [{ data: mineLikes }, { data: mineBookmarks }] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      ]);
      setLiked((mineLikes ?? []).map((row: any) => row.post_id));
      setBookmarked((mineBookmarks ?? []).map((row: any) => row.post_id));
    } else {
      setLiked([]);
      setBookmarked([]);
    }
    setFeedLoaded(true);
  }, [configured, user?.id]);

  useEffect(() => { void refreshFeed(); }, [refreshFeed]);
  useEffect(()=>{
    let active=true;
    async function loadCurrentProfile(){
      if(!user||!supabase){setCurrentProfile(null);return;}
      const {data}=await supabase.from("profiles").select("display_name,username,avatar_url").eq("id",user.id).maybeSingle();
      if(active)setCurrentProfile(data??null);
    }
    void loadCurrentProfile();return()=>{active=false;};
  },[user?.id,location.pathname]);
  useEffect(()=>{
    let active=true;
    async function loadHomeCountdown(){
      if(!configured||!supabase){setHomeCountdown(null);return;}
      const {data}=await supabase.from("space_countdowns").select("title,target_at,countdown_type,member_name,timezone").eq("status","published").gte("target_at",new Date().toISOString()).order("target_at",{ascending:true}).limit(1).maybeSingle();
      if(active)setHomeCountdown(data??null);
    }
    void loadHomeCountdown();return()=>{active=false;};
  },[configured,location.pathname]);

  const filteredPosts = useMemo(() => posts.filter((post) => {
    const matchesSearch = `${post.name} ${post.text} ${(post.tags ?? []).join(" ")}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "Questions" ? post.post_type === "question" : activeFilter === "Fan projects" ? (post.tags ?? []).some((tag: string) => /project/i.test(tag)) : activeFilter === "Friends" ? post.authorId === user?.id || friendIds.includes(post.authorId) : true;
    return matchesSearch && matchesFilter;
  }), [posts, search, activeFilter, friendIds, user?.id]);

  const submitPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() && !postImage) return;
    if (!configured || !supabase) {
      setNotice("This post is a local preview only. Connect Supabase before collecting real member posts.");
      setDraft("");
      return;
    }
    if (!user) {
      setNotice("Sign in to publish a post.");
      go("/login");
      return;
    }
    let mediaUrl: string | null = null;
    let uploadedMediaPath: string | null = null;
    if (postImage) {
      if (!["image/jpeg","image/png","image/webp"].includes(postImage.type) || postImage.size > 3 * 1024 * 1024) { setNotice("Choose a JPG, PNG or WebP image under 3 MB."); return; }
      const ext = postImage.type === "image/png" ? "png" : postImage.type === "image/webp" ? "webp" : "jpg";
      const path = "community/" + user.id + "/" + Date.now() + "." + ext;
      uploadedMediaPath = path;
      const { error: uploadError } = await supabase.storage.from("space-media").upload(path, postImage, { contentType: postImage.type, upsert: false });
      if (uploadError) { setNotice(uploadError.message); return; }
      mediaUrl = supabase.storage.from("space-media").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("posts").insert({
      author_id: user.id, body: draft.trim(), media_url: mediaUrl, post_type: postImage ? "photo" : postType, visibility: "public", status: "published",
    });
    if (error) {
      if(uploadedMediaPath)await supabase.storage.from("space-media").remove([uploadedMediaPath]);
      setNotice(error.message);
      return;
    }
    setDraft(""); setPostImage(null); setPostType("text");
    setNotice("Your post has been published.");
    await refreshFeed();
  };

  const toggleLike = async (id: string) => {
    if (id.startsWith("sample-") || !configured || !supabase) {
      setLiked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
      return;
    }
    if (!user) { setNotice("Sign in to like posts."); go("/login"); return; }
    const existing = await supabase.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle();
    const result = existing.data
      ? await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id)
      : await supabase.from("post_likes").insert({ post_id: id, user_id: user.id });
    if (result.error) { setNotice(result.error.message); return; }
    await refreshFeed();
  };

  const editPost = async (id: string, currentBody: string) => {
    if (!user || !supabase) return;
    const nextBody = window.prompt("Edit your post", currentBody);
    if (nextBody === null || !nextBody.trim()) return;
    const { error } = await supabase.from("posts").update({ body: nextBody.trim() }).eq("id", id).eq("author_id", user.id);
    if (error) setNotice(error.message); else { setNotice("Your post was updated."); await refreshFeed(); }
  };
  const deletePost = async (id: string) => {
    if (!user || !supabase) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    const { data:post } = await supabase.from("posts").select("media_url").eq("id",id).eq("author_id",user.id).maybeSingle();
    const { error } = await supabase.from("posts").delete().eq("id", id).eq("author_id", user.id);
    if (error) setNotice(error.message); else {
      if(post?.media_url){
        const marker="/storage/v1/object/public/space-media/";
        const path=post.media_url.includes(marker)?decodeURIComponent(post.media_url.split(marker)[1].split("?")[0]):"";
        if(path.startsWith("community/"+user.id+"/"))await supabase.storage.from("space-media").remove([path]);
      }
      setNotice("Your post was deleted."); await refreshFeed();
    }
  };

  const toggleBookmark = async (id: string) => {
    if (id.startsWith("sample-") || !configured || !supabase) {
      setBookmarked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
      return;
    }
    if (!user) { setNotice("Sign in to save posts."); go("/login"); return; }
    const existing = await supabase.from("bookmarks").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle();
    const result = existing.data
      ? await supabase.from("bookmarks").delete().eq("post_id", id).eq("user_id", user.id)
      : await supabase.from("bookmarks").insert({ post_id: id, user_id: user.id });
    if (result.error) { setNotice(result.error.message); return; }
    await refreshFeed();
  };
  return <div className={location.pathname === "/" ? "space-pages app-shell home-app-shell" : "space-pages app-shell"}>
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand-lockup" onClick={() => go("/")} role="button" tabIndex={0} aria-label="LYKYOU Space home">
        <img className="brand-space-logo" src="/lykyou-space-logo.png.png" alt="LYKYOU Space logo"/>
        <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={19}/></button>
      </div>
      <div className="sidebar-label">YOUR SPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {mainNav.map((item) => <NavLink key={item.path} to={item.path} end={item.path === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <item.icon size={19}/><span>{item.label}</span>{item.path === "/updates" && <span className="nav-dot"/>}
        </NavLink>)}
      </nav>
      <div className="sidebar-divider"/>
      <div className="sidebar-label">YOUR PEOPLE</div>
      {[{name:"WILLIAM",src:"William.webp.jpeg"},{name:"LEGO",src:"Lego.webp.jpeg"},{name:"NUT",src:"NUT.webp.jpeg"},{name:"HONG",src:"Hong.webp.jpeg"},{name:"TUI",src:"TUI.webp.jpg"}].map((member)=><button key={member.name} className="nav-link nav-button people-nav-link" onClick={()=>go("/lykn-universe?member="+member.name)}><img className="people-nav-photo" src={"/images/lykn-members/"+member.src} alt="" /><span>{member.name}</span><small>Fan hub</small></button>)}
      <div className="sidebar-divider"/>
      <div className="sidebar-label">YOUR CORNER</div>
      <button className="nav-link nav-button" onClick={() => go("/members")}><Heart size={18}/><span>My Friends</span></button>
      <button className="nav-link nav-button" onClick={() => go("/groups")}><Users size={18}/><span>My Groups</span></button>
      <button className="nav-link nav-button" onClick={() => go(user ? "/bookmarks" : "/login")}><Bookmark size={18}/><span>Bookmarks</span></button>
      <button className="nav-link nav-button" onClick={() => go(user ? "/notifications" : "/login")}><Bell size={18}/><span>Notifications</span></button>
      <button className="nav-link nav-button" onClick={() => go(user ? "/profile" : "/login")}><Users size={18}/><span>My Profile</span></button>
      <button className="nav-link nav-button" onClick={() => go(user ? "/settings" : "/login")}><Settings size={18}/><span>Settings</span></button>
      {isStaff && <><div className="sidebar-divider"/><div className="sidebar-label">STAFF</div><button className="nav-link nav-button" onClick={() => go("/admin")}><Shield size={18}/><span>Admin HQ</span></button></>}
      <div className="sidebar-spacer"/>
      <div className="sidebar-promo"><img className="promo-wolf" src="/images/lykyou-wolf.webp" alt="LYKYOU Space WOLF mascot"/><div className="promo-orbit">✦</div><strong>Your people.<br/>Your space.</strong><p>A place where every LYKYOU belongs.</p><button onClick={() => go("/fandom-hub")}>Explore the hub <ArrowRight size={14}/></button></div>
      <div className="sidebar-bottom"><span className="online-dot"/> Independent fan community <span className="unofficial">UNOFFICIAL</span></div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>}
    <div className={location.pathname === "/" ? "main-column home-main-column" : "main-column"}>
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen(value => !value)}><Menu size={21}/></button>
        <div className="breadcrumb"><span>LYKYOU SPACE</span><ChevronRight size={14}/><strong>{current.label}</strong></div>
        <div className="topbar-actions">
          <label className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your universe..." aria-label="Search posts and sections"/><kbd>⌘ K</kbd></label>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => go(user ? "/notifications" : "/login")}><Bell size={19}/><span/></button>
          <button className="profile-chip" onClick={() => go(user ? "/profile" : "/login")}><Avatar initials={(currentProfile?.display_name ?? user?.user_metadata?.display_name ?? "Y").slice(0,1).toUpperCase()} tone="mint" size="sm" src={currentProfile?.avatar_url ?? undefined}/><span>{currentProfile?.display_name ?? user?.user_metadata?.display_name ?? "Guest"}</span><ChevronDown size={14}/></button>
        </div>
      </header>
      {notice && <div className="notice-bar" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}
      <main className="page-content">
        {location.pathname === "/" && <HomePage go={go} posts={filteredPosts} liked={liked} toggleLike={toggleLike} bookmarked={bookmarked} toggleBookmark={toggleBookmark} draft={draft} setDraft={setDraft} submitPost={submitPost} postType={postType} setPostType={setPostType} postImage={postImage} setPostImage={setPostImage} />}
        {location.pathname === "/discover" && <MembersPage/>}
        {location.pathname === "/community" && <CommunityPage posts={filteredPosts} userId={user?.id} editPost={editPost} deletePost={deletePost} feedLoaded={feedLoaded} feedIsLive={feedIsLive} refreshFeed={refreshFeed} liked={liked} toggleLike={toggleLike} bookmarked={bookmarked} toggleBookmark={toggleBookmark} activeFilter={activeFilter} setActiveFilter={setActiveFilter} setNotice={setNotice} draft={draft} setDraft={setDraft} submitPost={submitPost} postType={postType} setPostType={setPostType} postImage={postImage} setPostImage={setPostImage}/> }
        {location.pathname === "/fun-zone" && <FunZonePage/> }
        {location.pathname === "/fandom-hub" && <FandomHubPage setNotice={setNotice}/> }
        {location.pathname === "/fan-project-wall" && <FandomHubPage setNotice={setNotice} focus="projects"/>}
        {location.pathname === "/events-countdowns" && <FandomHubPage setNotice={setNotice} focus="events"/>}
        {location.pathname === "/bias-corner" && <BiasCornerPage/>}
        {location.pathname === "/lykn-universe" && <UniversePage setNotice={setNotice}/> }
        {location.pathname === "/lykn-archive" && <UniversePage setNotice={setNotice} archive/> }
        {location.pathname === "/updates" && <UpdatesPage setNotice={setNotice}/> }
        {location.pathname === "/profile" && <ProfilePage/>}
        {location.pathname === "/admin" && <AdminHQPage/>}
        {location.pathname === "/members" && <MembersPage/>}
        {location.pathname.startsWith("/members/") && <PublicMemberProfilePage username={decodeURIComponent(location.pathname.slice("/members/".length))}/>}
        {location.pathname === "/groups" && <GroupsPage/>}
        {location.pathname === "/notifications" && <NotificationsPage/>}
        {location.pathname === "/bookmarks" && <BookmarksPage/>}
        {location.pathname === "/settings" && <SettingsPage/>}
        {!mainNav.some((item) => item.path === location.pathname) && !["/profile", "/admin", "/members", "/groups", "/notifications", "/bookmarks", "/settings", "/bias-corner", "/fan-project-wall", "/events-countdowns", "/discover"].includes(location.pathname) && !location.pathname.startsWith("/members/") && <PlaceholderPage title={current.label} go={go}/>}
      </main>
      <footer className="site-footer"><span>LYKYOU SPACE <b>✦</b> YOUR PEOPLE. YOUR SPACE. YOUR LYKN UNIVERSE.</span><span>Made by LYKN India Fanclub · Independent fan community · Not affiliated with LYKN or GMMTV</span></footer>
    </div>
    <aside className="right-rail">
      <div className="rail-top"><span className="live-indicator"/> THE GALAXY RIGHT NOW</div>
      <section className="rail-card welcome-card"><div className="welcome-stars">✦　·　✧</div><div className="eyebrow">WELCOME TO YOUR SPACE</div><h3>Find your<br/><em>people.</em></h3><p>One fandom. A thousand ways to belong.</p><button onClick={() => go("/community")}>Meet the LYKYOUs <ArrowRight size={15}/></button></section>
      <section className="rail-section"><PanelTitle action={<button className="text-link" onClick={() => go("/events-countdowns")}>See all</button>}>Coming up <CalendarDays size={15}/></PanelTitle><div className="mini-event"><div className="date-tile"><b>{homeCountdown?new Date(homeCountdown.target_at).toLocaleDateString("en-IN",{day:"2-digit",timeZone:"Asia/Kolkata"}):"--"}</b><span>{homeCountdown?new Date(homeCountdown.target_at).toLocaleDateString("en-IN",{month:"short",timeZone:"Asia/Kolkata"}):"DATE"}</span></div><div><strong>{homeCountdown?.title??"Next fandom moment"}</strong><p>{homeCountdown?new Date(homeCountdown.target_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"})+" IST":"Countdowns will appear here"}</p></div></div><div className="rail-hint">Dates are added from verified sources and fanclub events.</div></section>
      <section className="rail-section"><PanelTitle action={<button className="text-link" onClick={() => go("/community")}>Explore</button>}>Find your orbit <Users size={15}/></PanelTitle><div className="orbit-row"><Avatar initials="W" tone="lavender"/><Avatar initials="L" tone="mint"/><Avatar initials="N" tone="pink"/><Avatar initials="H" tone="blue"/><Avatar initials="T" tone="orange"/><span>OT5 energy</span></div><p className="rail-hint">Meet fans who love the same music, moments and members.</p></section>
      <section className="rail-quote"><Sparkles size={16}/><p>“A place where every LYKYOU belongs.”</p><span>THE LYKYOU SPACE PROMISE</span></section>
      <div className="rail-disclaimer"><Shield size={14}/> Fan-run · Independent · Unofficial</div>
    </aside>
    <MobileBar go={go} current={location.pathname} moreOpen={moreOpen} setMoreOpen={setMoreOpen}/>
    {moreOpen && <div className="more-drawer"><div className="drawer-head"><strong>More in your universe</strong><button className="icon-button" onClick={() => setMoreOpen(false)}><X size={18}/></button></div><button onClick={() => go("/bias-corner")}><Heart size={18}/> Bias Corner <ArrowRight size={15}/></button><button onClick={() => go("/fan-project-wall")}><FolderHeart size={18}/> Fan Project Wall <ArrowRight size={15}/></button><button onClick={() => go("/events-countdowns")}><CalendarDays size={18}/> Events & Meetups <ArrowRight size={15}/></button><button onClick={() => go("/lykn-universe")}><Globe2 size={18}/> Meet LYKN <ArrowRight size={15}/></button><button onClick={() => go("/updates")}><Megaphone size={18}/> LYKN Updates <ArrowRight size={15}/></button><button onClick={() => go("/groups")}><Users size={18}/> My Groups <ArrowRight size={15}/></button><button onClick={() => go(user ? "/members" : "/login")}><Heart size={18}/> My Friends <ArrowRight size={15}/></button><button onClick={() => go(user ? "/profile" : "/login")}><Users size={18}/> My Profile <ArrowRight size={15}/></button><button onClick={() => go(user ? "/bookmarks" : "/login")}><Bookmark size={18}/> Bookmarks <ArrowRight size={15}/></button><button onClick={() => go(user ? "/notifications" : "/login")}><Bell size={18}/> Notifications <ArrowRight size={15}/></button><button onClick={() => go(user ? "/settings" : "/login")}><Settings size={18}/> Settings <ArrowRight size={15}/></button>{isStaff&&<button onClick={()=>go("/admin")}><Shield size={18}/> Admin HQ <ArrowRight size={15}/></button>}{user ? <button onClick={async () => { await signOut(); setNotice("You have signed out."); go("/"); }}><Users size={18}/> Sign out</button> : <button onClick={() => go("/login")}><Users size={18}/> Sign in / Join</button>}<p>All main areas remain available here on mobile.</p></div>}
  </div>;
}
function MobileBar({ go, current, moreOpen, setMoreOpen }: { go: (path: string) => void; current: string; moreOpen: boolean; setMoreOpen: (v: boolean) => void }) {
  const visible = mainNav.slice(0, 5);
  return <nav className="mobile-bar" aria-label="Mobile navigation">{visible.map((item) => <button key={item.path} className={current === item.path ? "selected" : ""} onClick={() => go(item.path)}><item.icon size={19}/><span>{item.label}</span></button>)}<button className={moreOpen ? "selected" : ""} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={20}/><span>More</span></button></nav>;
}
function HomePage({ go, posts, liked, toggleLike, bookmarked, toggleBookmark, draft, setDraft, submitPost, postType, setPostType, postImage, setPostImage }: any) {
  return <div className="home-page">
    <section className="hero-banner"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-star">✦</span> YOUR PEOPLE. YOUR SPACE. YOUR LYKN UNIVERSE.</div><h1>Welcome to<br/><span>your universe.</span></h1><p>A place where every LYKYOU belongs. Catch up, make memories and find your people in the LYKN universe.</p><div className="hero-actions"><button className="button-primary" onClick={() => go("/community")}>Explore the community <ArrowRight size={16}/></button><button className="button-quiet" onClick={() => go("/lykn-universe")}>Meet LYKN <Music2 size={16}/></button></div><div className="hero-proof"><span><Users size={15}/> One global fandom</span><span><Sparkles size={15}/> Made by LYKYOUs</span></div></div><img className="hero-group-photo" src="/images/homepage-hero.webp" alt="LYKN — LYKYOU Space homepage hero" /><div className="hero-art" aria-hidden="true"><div className="planet planet-one"/><div className="planet planet-two"/><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-core hero-wolf-core"><img className="hero-wolf" src="/images/lykyou-wolf.webp" alt="LYKYOU Space WOLF mascot" /></div><div className="floating-star star-a">✦</div><div className="floating-star star-b">✧</div><div className="floating-star star-c">✦</div><div className="orbit-label label-one">OT5 ALWAYS</div><div className="orbit-label label-two">LYKYOU ♡</div></div><div className="hero-bottom-note">A LITTLE SPACE IN A VERY BIG UNIVERSE <span>✦</span></div></section>
    <div className="welcome-strip"><div className="strip-icon"><Sparkles size={18}/></div><div><strong>Hey, LYKYOU. You belong here.</strong><span>Discover fan projects, join conversations and celebrate every LYKN moment together.</span></div><button onClick={() => go("/fandom-hub")}>Find your next thing <ArrowRight size={15}/></button></div>
    <section className="home-discovery" aria-label="Explore LYKYOU Space">
      <div className="discovery-heading"><div><span className="eyebrow">YOUR NEXT FANDOM MOMENT</span><h2>Pick your next little adventure.</h2><p>There's more than one way to make this space yours.</p></div><span className="discovery-spark">✦　✧　✦</span></div>
      <div className="discovery-grid">
        <button className="discovery-tile discovery-universe" onClick={() => go("/lykn-universe")}><span className="discovery-icon"><Globe2 size={22}/></span><span className="discovery-copy"><small>MEET THE FIVE</small><strong>Meet LYKN</strong><em>Members, music and moments.</em></span><ArrowRight className="discovery-arrow" size={18}/></button>
        <button className="discovery-tile discovery-events" onClick={() => go("/events-countdowns")}><span className="discovery-icon"><CalendarDays size={22}/></span><span className="discovery-copy"><small>WHAT'S COMING UP</small><strong>Events & Countdowns</strong><em>Keep every special date in sight.</em></span><ArrowRight className="discovery-arrow" size={18}/></button>
        <button className="discovery-tile discovery-bias" onClick={() => go("/bias-corner")}><span className="discovery-icon"><Heart size={22}/></span><span className="discovery-copy"><small>BIAS? OT5? BOTH.</small><strong>Bias Corner</strong><em>Celebrate your favourite member.</em></span><ArrowRight className="discovery-arrow" size={18}/></button>
      </div>
    </section>
    <div className="home-columns"><div className="feed-column"><SectionHeading eyebrow="THE COMMUNITY" title="Happening in your galaxy" note="A little peek at what LYKYOUs are talking about." action={<button className="text-link" onClick={() => go("/community")}>View community <ArrowRight size={14}/></button>}/><Composer draft={draft} setDraft={setDraft} submitPost={submitPost} postType={postType} setPostType={setPostType} postImage={postImage} setPostImage={setPostImage}/><div className="post-list">{posts.slice(0,2).map((post: any) => <PostCard key={post.id} post={post} liked={liked.includes(post.id)} bookmarked={bookmarked.includes(post.id)} toggleLike={toggleLike} toggleBookmark={toggleBookmark}/>)}</div></div></div>
  </div>;
}
function Composer({ draft, setDraft, submitPost, postType, setPostType, postImage, setPostImage }: any) { return <form className="composer" onSubmit={submitPost}><Avatar initials="Y" tone="mint"/><div className="composer-main"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What's on your LYKN-loving mind?" rows={2}/>{postImage&&<div className="composer-file-name">Attached: {postImage.name} <button type="button" onClick={()=>setPostImage(null)}>Remove</button></div>}<div className="composer-actions"><select className="composer-type-select" value={postType} onChange={e=>setPostType(e.target.value)} aria-label="Post type"><option value="text">Share a post</option><option value="question">Ask the community</option></select><label className="composer-attach"><Image size={15}/> Add photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPostImage(e.target.files?.[0]||null)}/></label><span><Sparkles size={14}/> Share a fandom moment</span><button className="button-primary button-small" type="submit" disabled={!draft.trim()&&!postImage}><Send size={14}/> Publish</button></div></div></form>; }
function PostCard({ post, liked, bookmarked, toggleLike, toggleBookmark, onComments, onReport, isMine, onEdit, onDelete }: any) { return <article className="post-card"><div className="post-head"><Avatar initials={post.initials} tone={post.tone} src={post.avatarUrl}/><div className="post-author"><strong>{post.name}</strong><span>{post.handle} · {post.time}</span></div>{isMine && <div className="post-owner-actions"><button onClick={()=>onEdit(post.id,post.text)}>Edit</button><button onClick={()=>onDelete(post.id)}>Delete</button></div>}<button className="icon-button post-more" aria-label="Report post" onClick={() => onReport(post.id)}><MoreHorizontal size={19}/></button></div><p className="post-copy">{post.text}</p>{post.mediaUrl&&<img className="post-media" src={post.mediaUrl} alt="Post attachment" loading="lazy"/>}<div className="post-tags">{post.tags.map((tag: string) => <span key={tag}>#{tag.replace(/ /g, "")}</span>)}</div><div className="post-actions"><button className={liked ? "is-liked" : ""} onClick={() => toggleLike(post.id)}><Heart size={17} fill={liked ? "currentColor" : "none"}/>{post.likes + (liked ? 1 : 0)}</button><button onClick={() => onComments(post.id)}><MessageCircle size={17}/>{post.comments} replies</button><button className={bookmarked ? "is-saved" : ""} onClick={() => toggleBookmark(post.id)}><Bookmark size={17} fill={bookmarked ? "currentColor" : "none"}/><span className="sr-only">Save post</span></button></div></article>; }
function CommunityPage({ posts, userId, editPost, deletePost, liked, toggleLike, bookmarked, toggleBookmark, activeFilter, setActiveFilter, setNotice, draft, setDraft, submitPost, feedLoaded, feedIsLive, refreshFeed, postType, setPostType, postImage, setPostImage }: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const filters = ["For you", "Friends", "Questions", "Fan projects"];
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  useEffect(() => {
    const postId = new URLSearchParams(location.search).get("post");
    if (postId) setCommentPostId(postId);
  }, [location.search]);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const focusComposer = () => { const field = document.querySelector(".composer textarea"); if (field instanceof HTMLTextAreaElement) field.focus(); };

  return (
    <>
      <section className="community-hero-banner"><img className="community-hero-image" src="/community-banner.webp.png" alt="" aria-hidden="true"/><div className="community-hero-copy"><span className="eyebrow">SHARE · CONNECT · SUPPORT · GROW</span><h2>LYKYOU <em>Community</em></h2><p>Different countries. Same love. LYKN.</p></div><div className="community-hero-stars">✦　✧　✦</div></section>
      <SectionHeading
        eyebrow="YOUR PEOPLE, YOUR CONVERSATIONS"
        title="The Community"
        note="A shared space for every LYKYOU, wherever you are."
        action={<button className="button-primary" onClick={focusComposer}><Plus size={16} /> Create a post</button>}
      />
      <div className="feed-source-note">{feedIsLive ? "Connected community feed" : "Preview content only · sample posts are not real member activity"}</div>
      <div className="community-layout">
        <div className="feed-column">
          <div className="filter-tabs">
            {filters.map((filter) => (
              <button key={filter} className={activeFilter === filter ? "active" : ""} onClick={() => setActiveFilter(filter)}>
                {filter}
              </button>
            ))}
          </div>
          <Composer draft={draft} setDraft={setDraft} submitPost={submitPost} postType={postType} setPostType={setPostType} postImage={postImage} setPostImage={setPostImage} />
          {!feedLoaded && <div className="feed-loading">Loading the community feed…</div>}
          {posts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              liked={liked.includes(post.id)}
              bookmarked={bookmarked.includes(post.id)}
              toggleLike={toggleLike}
              toggleBookmark={toggleBookmark}
              onComments={setCommentPostId}
              onReport={setReportPostId}
              isMine={post.authorId === userId}
              onEdit={editPost}
              onDelete={deletePost}
            />
          ))}
          {posts.length === 0 && (
            <EmptyState
              title="No matching conversations"
              text="Try another search or filter. The community feed will fill with member posts when connected."
            />
          )}
        </div>
        <div className="community-aside">
          <section className="side-panel">
            <PanelTitle>Find your circle</PanelTitle>
            {["WILLIAM", "LEGO", "NUT", "HONG", "TUI"].map((member) => (
              <button className="circle-link" key={member} onClick={() => navigate("/lykn-universe?member="+member)}>
                <span>✦</span>{member} fan hub<ChevronRight size={15} />
              </button>
            ))}
            <button className="circle-link" onClick={() => navigate("/groups")}><span>✦</span>OT5 community groups<ChevronRight size={15}/></button>
          </section>
          <section className="side-panel">
            <PanelTitle>Community promise</PanelTitle>
            <p className="aside-copy">Be kind, credit creators, respect privacy and keep this a welcoming space for every LYKYOU.</p>
            <span className="unofficial">INDEPENDENT · UNOFFICIAL</span>
          </section>
        </div>
      </div>
      {commentPostId && <CommentThread postId={commentPostId} setNotice={setNotice} onClose={() => setCommentPostId(null)} onChanged={refreshFeed}/>}
      {reportPostId && <ReportForm postId={reportPostId} setNotice={setNotice} onClose={() => setReportPostId(null)}/>}
    </>
  );
}
function ReportForm({ postId, setNotice, onClose }: { postId: string; setNotice: (message: string) => void; onClose: () => void }) {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const [reason,setReason] = useState("harassment");
  const [details,setDetails] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  async function submit(event:FormEvent){
    event.preventDefault();
    if(!configured||!supabase||postId.startsWith("sample-")){setMessage("Reports are not saved for sample preview posts.");return;}
    if(!user){navigate("/login");return;}
    setBusy(true);
    const {error}=await supabase.from("reports").insert({reporter_id:user.id,target_type:"post",target_id:postId,reason,details:details.trim()});
    if(error)setMessage(error.message);
    else {setNotice("Thank you. Your report has been sent to the moderation team.");onClose();}
    setBusy(false);
  }
  return <div className="comment-overlay" role="dialog" aria-modal="true" aria-label="Report post"><section className="report-panel"><header><div><div className="eyebrow">COMMUNITY SAFETY</div><h3>Report this post</h3></div><button className="icon-button" onClick={onClose}><X size={19}/></button></header><p>Reports are private and reviewed by authorised moderators.</p>{message&&<div className="auth-message error">{message}</div>}<form onSubmit={submit}><label>Reason<select value={reason} onChange={(e)=>setReason(e.target.value)}><option value="harassment">Harassment or bullying</option><option value="hate">Hate or discriminatory content</option><option value="spam">Spam or misleading content</option><option value="privacy">Privacy violation</option><option value="copyright">Copyright or impersonation</option><option value="other">Something else</option></select></label><label>Additional details<textarea value={details} onChange={(e)=>setDetails(e.target.value)} maxLength={1500} rows={4} placeholder="Add context for the moderation team (optional)."/></label><div><button className="button-outline" type="button" onClick={onClose}>Cancel</button><button className="button-primary" type="submit" disabled={busy}>{busy?"Sending…":"Submit report"}</button></div></form></section></div>;
}

function CommentThread({ postId, setNotice, onClose, onChanged }: { postId: string; setNotice: (message: string) => void; onClose: () => void; onChanged: () => Promise<void> }) {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadComments = useCallback(async () => {
    if (!configured || !supabase || postId.startsWith("sample-")) {
      setComments([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("comments")
      .select("id,post_id,author_id,parent_comment_id,body,created_at")
      .eq("post_id", postId).order("created_at", { ascending: true });
    if (error) {
      setNotice("Comments could not be loaded: " + error.message);
      setLoading(false);
      return;
    }
    const rows = data ?? [];
    const ids = [...new Set(rows.map((row) => row.author_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id,username,display_name").in("id", ids)
      : { data: [] as any[] };
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    setComments(rows.map((row: any) => ({
      ...row,
      author: profileMap.get(row.author_id)?.display_name ?? "LYKYOU",
      handle: profileMap.get(row.author_id)?.username ?? "lykyou",
      initials: (profileMap.get(row.author_id)?.display_name ?? "L").slice(0,1).toUpperCase(),
    })));
    setLoading(false);
  }, [configured, postId]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    if (!configured || !supabase || postId.startsWith("sample-")) {
      setNotice("Comment threads are not saved in preview mode.");
      return;
    }
    if (!user) {
      setNotice("Sign in to join the conversation.");
      navigate("/login");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("comments").insert({
      post_id: postId, author_id: user.id, body: draft.trim(), parent_comment_id: replyTo,
    });
    if (error) setNotice(error.message);
    else {
      setDraft("");
      setReplyTo(null);
      await loadComments();
      await onChanged();
    }
    setBusy(false);
  }

  const renderComment = (comment: any, nested = false) => (
    <div className={nested ? "comment-item comment-nested" : "comment-item"} key={comment.id}>
      <Avatar initials={comment.initials} tone="lavender" size="sm"/>
      <div className="comment-content">
        <div className="comment-meta"><strong>{comment.author}</strong><span>@{comment.handle}</span></div>
        <p>{comment.body}</p>
        {!nested && user && <button className="comment-reply" onClick={() => { setReplyTo(comment.id); setDraft(""); }}>Reply</button>}
        {comments.filter((child) => child.parent_comment_id === comment.id).map((child) => renderComment(child, true))}
      </div>
    </div>
  );

  return (
    <div className="comment-overlay" role="dialog" aria-modal="true" aria-label="Post comments">
      <section className="comment-panel">
        <header><div><div className="eyebrow">COMMUNITY CONVERSATION</div><h3>Comments & replies</h3></div><button className="icon-button" onClick={onClose} aria-label="Close comments"><X size={19}/></button></header>
        {!configured || postId.startsWith("sample-")
          ? <div className="comment-empty">Comments are available on connected member posts. This sample post is only for preview.</div>
          : loading ? <div className="comment-empty">Loading comments…</div>
          : comments.filter((comment) => !comment.parent_comment_id).length === 0
            ? <div className="comment-empty">No comments yet. Start the conversation.</div>
            : <div className="comment-list">{comments.filter((comment) => !comment.parent_comment_id).map((comment) => renderComment(comment))}</div>}
        {configured && !postId.startsWith("sample-") && <form className="comment-form" onSubmit={submit}>
          {replyTo && <div className="replying-to">Replying to a comment <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></div>}
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={2000} placeholder={user ? "Write a thoughtful reply…" : "Sign in to comment"} disabled={!user}/>
          <button className="button-primary" type="submit" disabled={!user || busy || !draft.trim()}>{busy ? "Posting…" : "Post comment"} <Send size={14}/></button>
        </form>}
      </section>
    </div>
  );
}

function FunZonePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState("All games");
  const [activeGame, setActiveGame] = useState<string|null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [gameMessage, setGameMessage] = useState("");
  const [gameResult, setGameResult] = useState<any|null>(null);
  const [wordGuess, setWordGuess] = useState("");
  const [stardust,setStardust] = useState(0);
  useEffect(()=>{ if(activeGame || gameResult) requestAnimationFrame(()=>document.querySelector(".this-or-that-game, .game-result-panel")?.scrollIntoView({behavior:"smooth",block:"start"})); },[activeGame,gameResult]);
  const [badges,setBadges] = useState<string[]>([]);
  const [bingo, setBingo] = useState<string[]>([]);
  const [memoryDeck,setMemoryDeck] = useState<string[]>(["W","L","N","H","T","OT5","W","L","N","H","T","OT5"]);
  const [memoryOpen,setMemoryOpen] = useState<number[]>([]);
  const [memoryMatched,setMemoryMatched] = useState<string[]>([]);
  const thisOrThat = [
    { prompt: "Your ideal fandom evening?", a: "Rewatch live stages", b: "Build a LYKN playlist" },
    { prompt: "Pick your kind of fan project", a: "A creative edit", b: "A community event" },
    { prompt: "What would you save first?", a: "A favourite performance", b: "A meaningful fan memory" },
    { prompt: "Choose a group activity", a: "A quick quiz", b: "A big group challenge" },
    { prompt: "Your fandom mood today?", a: "Soft and sentimental", b: "Loud and celebratory" },
  ];
  const matchPrompts = [
    {prompt:"Pick a fandom superpower",a:"Remember every tiny detail",b:"Bring everyone together"},
    {prompt:"Choose a stage mood",a:"Powerful and bold",b:"Bright and playful"},
    {prompt:"Your fan-project role",a:"Creative director",b:"Team motivator"},
    {prompt:"Choose a playlist vibe",a:"Emotional vocals",b:"High-energy performance"},
    {prompt:"Your community energy",a:"Quietly observant",b:"Loudly supportive"},
  ];
  const quiz = [
    {prompt:"On what date did LYKN make their official debut?",options:["5 May 2023","12 December 2022","15 March 2023","5 May 2024"],answer:"5 May 2023",why:"LYKN debuted on 5 May 2023 with MAY I?"},
    {prompt:"Which song was LYKN's debut single?",options:["UMM UMM","MAY I?","NO WORRIES","TRUST ME"],answer:"MAY I?",why:"MAY I? (เลิกกับเขาเดี๋ยวเหงาเป็นเพื่อน) was their debut release."},
    {prompt:"Which competition formed the final five-member lineup?",options:["Project Alpha","Star Academy","Riser Camp","Alpha Stage"],answer:"Project Alpha",why:"The group was formed through Project Alpha, which ran from December 2022 to March 2023."},
    {prompt:"Which member finished Project Alpha in first place and earned the title King of Alpha?",options:["Nut","Hong","Tui","William"],answer:"William",why:"William ranked first overall and was named King of Alpha."},
    {prompt:"Which member placed second in Project Alpha?",options:["Lego","Tui","Hong","Nut"],answer:"Lego",why:"Lego finished second overall."},
    {prompt:"Which member is credited with being a songwriter, composer, arranger and co-producer across the group's albums?",options:["Nut","Tui","Hong","Lego"],answer:"Tui",why:"Tui contributes to songwriting, composition, arrangement and co-production."},
    {prompt:"What is the name of LYKN's fandom?",options:["LYKYOU","LYKNation","LYKStars","MARS"],answer:"LYKYOU",why:"The official fandom name is LYKYOU."},
    {prompt:"Which fictional boy band did the members portray in ThamePo: Heart That Skips a Beat?",options:["MARS","NOVA","ORBIT","ALPHA"],answer:"MARS",why:"In ThamePo, the members portray the fictional boy band MARS."},
    {prompt:"Which member is LYKN's youngest member (maknae)?",options:["Hong","Nut","Lego","William"],answer:"Lego",why:"Lego is the maknae of LYKN."},
    {prompt:"Which member's representative emoji is the guitar?",options:["William","Nut","Hong","Tui"],answer:"William",why:"William's representative emoji is 🎸."},
    {prompt:"Which album was released in October 2025?",options:["Reflexion","Dusk & Dawn","May I?","First Sight"],answer:"Dusk & Dawn",why:"Dusk & Dawn is LYKN's debut album, released in October 2025."},
    {prompt:"Which member's solo single is titled “Bloom” (ปล่อยใจ)?",options:["Nut","Tui","William","Hong"],answer:"Tui",why:"Tui released the solo single Bloom (ปล่อยใจ) in 2026."}
  ];
  const emojiQuiz = [
    {prompt:"💜 + 🎧",options:["A fan playlist","A concert ticket","A dance class"],answer:"A fan playlist"},
    {prompt:"⭐ + 👤",options:["A new account","Your bias","A stage light"],answer:"Your bias"},
    {prompt:"📅 + 🎉",options:["A fan event","A music genre","A profile bio"],answer:"A fan event"},
    {prompt:"🎤 + 🎶",options:["A live performance","A photo edit","A group chat"],answer:"A live performance"},
    {prompt:"✋ + ✋ + ✋ + ✋ + ✋",options:["Five-day streak","OT5","Five playlists"],answer:"OT5"},
  ];
  const wordQuestions = [{prompt:"Rearrange the letters to reveal the group name.",scramble:"NKYL",answer:"LYKN"},{prompt:"Rearrange the letters to reveal the fandom name.",scramble:"UOYKLY",answer:"LYKYOU"},{prompt:"Unscramble the music-fan abbreviation.",scramble:"TSO",answer:"OST"}];
  const bingoTiles = ["Made a LYKN playlist","Watched a stage twice","Shared a fan edit","Joined a fan project","Found a bias twin","Learned a new lyric","Voted in a poll","Saved a favourite moment","Cheered for OT5"];
  const dailyTasks = ["Share a favourite LYKN performance and say why it matters to you.","Find a LYKYOU with a different bias and start a friendly conversation.","Make a five-song playlist for a friend who is new to LYKN.","Celebrate all five members with one positive message.","Share a fandom memory that still makes you smile."];
  const dayNumber = Math.floor(Date.now()/86400000);
  const dailyTask = dailyTasks[dayNumber % dailyTasks.length];
  async function loadRewards(){
    if(!user||!supabase){setStardust(0);setBadges([]);return;}
    // Game sessions are the source of truth in this project; reward tables are not installed.
    const {data:sessions,error}=await supabase.from("game_sessions").select("game_key").eq("user_id",user.id);
    if(error){setGameMessage("Your result is saved, but Stardust could not be refreshed. ("+error.message+")");return;}
    const completed=sessions??[];
    setStardust(completed.length*10);
    const earned=new Set<string>();
    if(completed.length>0)earned.add("first_play");
    if(completed.some((item:any)=>item.game_key==="quiz_arena"))earned.add("quiz_star");
    if(completed.some((item:any)=>item.game_key==="fandom_bingo"))earned.add("bingo_master");
    if(completed.some((item:any)=>item.game_key==="daily_challenge"))earned.add("daily_spark");
    if(completed.some((item:any)=>item.game_key==="lykn_match"))earned.add("matchmaker");
    setBadges([...earned]);
  }
  useEffect(()=>{void loadRewards();},[user?.id]);
  const badgeNames:Record<string,string>={first_play:"First Play",quiz_star:"Quiz Star",bingo_master:"Bingo Master",daily_spark:"Daily Spark",matchmaker:"Matchmaker"};
  const gameTitle = games.find(g=>g.title===activeGame)?.title ?? "";
  function startGame(title:string) {
    setActiveGame(title);setStep(0);setAnswers([]);setBingo([]);setMemoryOpen([]);setMemoryMatched([]);setMemoryDeck(["W","L","N","H","T","OT5","W","L","N","H","T","OT5"].sort(()=>Math.random()-.5));setGameMessage("");setGameResult(null);setWordGuess("");
  }
  const allowedGameKeys = new Set(["this_or_that","lykn_match","quiz_arena","emoji_decoder","word_games","daily_challenge","fandom_bingo","memory_match"]);
  async function finishGame(key:string, score:number, result:any, message:string) {
    setActiveGame(null);setGameMessage("");setGameResult({key,score,result,message});
    if(user&&supabase) {
      if(!allowedGameKeys.has(key)) { setGameMessage("Your result is shown, but this game is not configured for progress saving yet."); return; }
      const {error}=await supabase.from("game_sessions").insert({user_id:user.id,game_key:key,score,result});
      if(error) setGameMessage("Progress could not be saved. Your result is still here. ("+error.message+")");
      else await loadRewards();
    } else setGameMessage("Sign in to save your progress.");
  }
  function answer(choice:string) {
    const next=[...answers,choice];setAnswers(next);
    if(activeGame==="This or That" && next.length>=thisOrThat.length) void finishGame("this_or_that",next.length,{answers:next},"This or That complete. Your fandom preferences are recorded.");
    else if(activeGame==="Who's Your LYKN Match?" && next.length>=matchPrompts.length) {
      const score=next.reduce((sum,v)=>sum+(v==="A"?1:2),0);
      const matched=["WILLIAM","LEGO","NUT","HONG","TUI"][score%5];
      void finishGame("lykn_match",next.length,{answers:next,match:matched},"Your just-for-fun LYKN match is "+matched+"! This is a playful result, not a personality profile.");
    } else if(activeGame==="LYKN Quiz Arena" && next.length>=quiz.length) {
      const score=next.reduce((sum,v,i)=>sum+(v===quiz[i].answer?1:0),0);
      void finishGame("quiz_arena",score,{answers:next,score,total:quiz.length},"Quiz complete: "+score+" / "+quiz.length+" correct.");
    } else if(activeGame==="Emoji Decoder" && next.length>=emojiQuiz.length) {
      const score=next.reduce((sum,v,i)=>sum+(v===emojiQuiz[i].answer?1:0),0);
      void finishGame("emoji_decoder",score,{answers:next,score,total:emojiQuiz.length},"Emoji Decoder complete: "+score+" / "+emojiQuiz.length+" correct.");
    } else if(activeGame==="Word Games" && next.length>=wordQuestions.length) {
      const score=next.reduce((sum,v,i)=>sum+(v===wordQuestions[i].answer?1:0),0);
      void finishGame("word_games",score,{answers:next,score,total:wordQuestions.length},"Word Games complete: "+score+" / "+wordQuestions.length+" correct.");
    } else setStep(next.length);
  }
  async function completeDaily() {
    await finishGame("daily_challenge",1,{challenge:dailyTask,day:dayNumber},"Daily challenge completed. Thanks for adding something positive to the fandom.");
  }
  async function completeBingo() {
    if(bingo.length<5)return;
    await finishGame("fandom_bingo",bingo.length,{completed:bingo},"Fandom Bingo completed. You checked off "+bingo.length+" squares.");
  }
  const question = activeGame==="This or That"?thisOrThat[step]:activeGame==="Who's Your LYKN Match?"?matchPrompts[step]:activeGame==="LYKN Quiz Arena"?quiz[step]:activeGame==="Emoji Decoder"?emojiQuiz[step]:activeGame==="Word Games"?wordQuestions[step]:null;
  return <>
    <SectionHeading eyebrow="PLAY A LITTLE. STAY A WHILE." title="The Fun Zone" note="Tiny challenges, big fandom energy. Pick something and jump in."/>
    <div className="fun-hero"><div><div className="eyebrow">YOUR DAILY DOSE OF ✦</div><h2>Ready, set,<br/><em>LYKYOU!</em></h2><p>Play for fun, collect Stardust and celebrate what makes this fandom yours.</p><div className="fun-stats"><span><Trophy size={16}/> Badges to collect</span><span><Sparkles size={16}/> Daily challenges</span></div></div><div className="fun-orb"><Gamepad2 size={66}/><span>LET'S PLAY</span></div></div>
    {gameResult && <section className="game-result-panel"><div className="game-result-art">{gameResult.key==="lykn_match" ? <div className="game-member-result-photo"><img src={"/images/lykn-members/"+(({WILLIAM:"William.webp.jpeg",LEGO:"Lego.webp.jpeg",NUT:"NUT.webp.jpeg",HONG:"Hong.webp.jpeg",TUI:"TUI.webp.jpg"} as Record<string,string>)[String(gameResult.result.match).toUpperCase()] || "")} alt={gameResult.result.match} onError={(e)=>{e.currentTarget.style.display="none";}}/><span>{String(gameResult.result.match).slice(0,1)}</span></div> : <img src={games.find(g=>g.title===({quiz_arena:"LYKN Quiz Arena",word_games:"Word Games",emoji_decoder:"Emoji Decoder",this_or_that:"This or That",daily_challenge:"Daily Challenge",fandom_bingo:"Fandom Bingo",memory_match:"Memory Match"} as any)[gameResult.key])?.art || "/images/game-quiz-arena.svg"} alt="" />}</div><div className="game-result-copy"><div className="eyebrow">✦ GAME COMPLETE · YOUR RESULT</div><h2>{gameResult.key==="lykn_match" ? "Your LYKN match is..." : gameResult.key==="quiz_arena" ? "Quiz Arena results" : gameResult.key==="word_games" ? "Word Games complete" : gameResult.key==="emoji_decoder" ? "Decoder results" : "You did it!"}</h2>{gameResult.key==="lykn_match" ? <><strong className="game-result-member-name">{gameResult.result.match}</strong><p>This is your just-for-fun fandom match, not a personality profile.</p></> : <><strong className="game-result-score">{gameResult.score}{gameResult.result.total ? " / "+gameResult.result.total : gameResult.key==="fandom_bingo" ? " / 9" : ""}</strong><p>{gameResult.message}</p></>}{gameMessage && <p className="game-save-note">{gameMessage}</p>}<button className="button-primary" onClick={()=>{setGameResult(null);setGameMessage("");}}>Back to games <ArrowRight size={15}/></button></div></section>}
    {activeGame && question && <section className="this-or-that-game"><div className="eyebrow">{gameTitle.toUpperCase()} · QUESTION {step+1} OF {(activeGame==="This or That"?thisOrThat:activeGame==="Who's Your LYKN Match?"?matchPrompts:activeGame==="LYKN Quiz Arena"?quiz:activeGame==="Emoji Decoder"?emojiQuiz:wordQuestions).length}</div><h3>{question.prompt}</h3><div className="this-or-that-options">{activeGame==="Word Games" ? <div className="word-game-entry"><div className="word-scramble-letters">{(question as any).scramble.split("").map((letter:string,index:number)=><span key={index}>{letter}</span>)}</div><input aria-label="Your unscrambled word" value={wordGuess} onChange={e=>setWordGuess(e.target.value)} placeholder="Type your answer" autoComplete="off"/><button className="button-primary" disabled={!wordGuess.trim()} onClick={()=>{const guess=wordGuess.trim().toUpperCase();setWordGuess("");answer(guess);}}>Check word <ArrowRight size={15}/></button></div> : (question as any).a ? <><button onClick={()=>answer("A")}>{(question as any).a}</button><span>OR</span><button onClick={()=>answer("B")}>{(question as any).b}</button></> : (question as any).options.map((option:string)=><button key={option} onClick={()=>answer(option)}>{option}</button>)}</div><div className="game-progress"><span style={{width:((step+1)/((activeGame==="This or That"?thisOrThat:activeGame==="Who's Your LYKN Match?"?matchPrompts:activeGame==="LYKN Quiz Arena"?quiz:activeGame==="Emoji Decoder"?emojiQuiz:wordQuestions).length)*100)+"%"}}/></div><button className="text-link" onClick={()=>setActiveGame(null)}>Exit game</button></section>}
    {activeGame==="Memory Match" && <section className="this-or-that-game"><div className="eyebrow">MEMORY MATCH · FIND SIX PAIRS</div><h3>Match the LYKN constellation</h3><p>{memoryMatched.length} / 6 pairs found</p><div className="memory-match-grid">{memoryDeck.map((tile,index)=><button key={index} className={memoryMatched.includes(tile)?"matched":memoryOpen.includes(index)?"revealed":""} disabled={memoryMatched.includes(tile)} onClick={()=>{if(memoryOpen.includes(index))return;if(memoryOpen.length===2){setMemoryOpen([index]);return;}const next=[...memoryOpen,index];setMemoryOpen(next);if(next.length===2&&memoryDeck[next[0]]===memoryDeck[next[1]]){const matched=[...memoryMatched,memoryDeck[index]];setMemoryMatched(matched);if(matched.length===6)void finishGame("memory_match",6,{pairs:matched},"Memory Match complete! You found all six pairs.");}}}>{memoryMatched.includes(tile)||memoryOpen.includes(index)?tile:"✦"}</button>)}</div><button className="text-link" onClick={()=>setActiveGame(null)}>Exit game</button></section>}
    {activeGame==="Daily Challenge" && <section className="this-or-that-game"><div className="eyebrow">DAILY CHALLENGE · {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div><h3>Your mission today</h3><p>{dailyTask}</p><button className="button-primary" onClick={()=>void completeDaily()}>Mark challenge complete <Check size={14}/></button><button className="text-link" onClick={()=>setActiveGame(null)}>Not now</button></section>}
    {activeGame==="Fandom Bingo" && <section className="this-or-that-game"><div className="eyebrow">FANDOM BINGO · CHECK FIVE OR MORE</div><h3>Your LYKYOU bingo card</h3><div className="bingo-grid">{bingoTiles.map(tile=><button className={bingo.includes(tile)?"checked":""} key={tile} onClick={()=>setBingo(v=>v.includes(tile)?v.filter(x=>x!==tile):[...v,tile])}>{bingo.includes(tile)?"✓ ":""}{tile}</button>)}</div><p>{bingo.length} / 9 squares checked</p><button className="button-primary" disabled={bingo.length<5} onClick={()=>void completeBingo()}>Complete bingo</button><button className="text-link" onClick={()=>setActiveGame(null)}>Close card</button></section>}
    {!activeGame && gameMessage && <button className="button-primary" onClick={()=>setGameMessage("")}>Back to games</button>}
    <div className="filter-tabs game-filters">{["All games","Quick play","Quizzes","Daily"].map((f) => <button className={selected === f ? "active" : ""} key={f} onClick={() => setSelected(f)}>{f}</button>)}</div>
    <div className="game-grid">{games.filter((g) => selected === "All games" || (selected === "Quick play" ? g.tag === "Quick play" || g.tag === "Just for fun" : selected === "Quizzes" ? g.tag === "Knowledge" || g.tag === "Puzzle" : g.tag === "Daily")).map((game) => <article className={`game-card game-card-${game.tone}`} key={game.title}><div className="game-art"><img src={game.art} alt={game.title+" artwork"} loading="lazy"/><div className="game-art-shade"/><div className={`game-icon tone-${game.tone}`}><game.icon size={25}/></div><span className="game-art-spark">✦</span></div><span className="game-tag">{game.tag}</span><h3>{game.title}</h3><p>{game.detail}</p><button className="button-outline" onClick={() => startGame(game.title)}>Play now <ArrowRight size={14}/></button></article>)}</div>
    <section className="stardust-panel"><div className="stardust-symbol">✧</div><div><div className="eyebrow">YOUR LITTLE WINS ADD UP</div><h3>Stardust & achievements</h3><p>Complete challenges and quizzes to record your progress. Badges can be awarded as the community grows.</p></div><div className="stardust-count"><strong>✦ {stardust}</strong><span>Stardust</span></div><div className="stardust-badges">{badges.length?badges.map(key=><span key={key}>✦ {badgeNames[key]||key}</span>):<small>{user?"Play games to earn your first badge.":"Sign in to save your progress."}</small>}</div></section>
    <SectionHeading eyebrow="BIAS CORNER" title="Your bias. Your universe." note="Celebrate your favourites, your OT5 heart and every bias-wrecker moment."/>
    <div className="bias-grid">{["My Bias","My Bias Wrecker","OT5 Corner","Bias Match"].map((x,i)=><button className="bias-card" key={x} onClick={()=>navigate("/bias-corner")}><span>{["♡","✧","✦","∞"][i]}</span><strong>{x}</strong><small>{["Set your favourites","Update your bias wrecker","All five, always","Find your bias twin"][i]}</small><ArrowRight size={15}/></button>)}</div>
  </>;
}
function FandomHubPage({ setNotice, focus = "all" }: { setNotice: (message: string) => void; focus?: "all" | "projects" | "events" }) {
  const navigate = useNavigate();
  const { user, configured } = useAuth();
  const { isModerator, isAdmin } = useStaffRole();
  const [projects, setProjects] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [countdowns, setCountdowns] = useState<any[]>([]);
  const [countdownTitle, setCountdownTitle] = useState("");
  const [countdownDescription, setCountdownDescription] = useState("");
  const [countdownType, setCountdownType] = useState("fan_event");
  const [countdownMember, setCountdownMember] = useState("LYKN");
  const [countdownDate, setCountdownDate] = useState("");
  const [countdownSource, setCountdownSource] = useState("");
  const [editingCountdownId, setEditingCountdownId] = useState<string|null>(null);
  const [myCampaignIds, setMyCampaignIds] = useState<string[]>([]);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignCategory, setCampaignCategory] = useState("other");
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");
  const [rsvps, setRsvps] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("online");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [calendarMonth,setCalendarMonth] = useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));

  const calendarCells = useMemo(()=>{
    const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);
    const offset=(first.getDay()+6)%7;
    const count=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate();
    return Array.from({length:Math.ceil((offset+count)/7)*7},(_,index)=>{
      const day=index-offset+1;
      return day>0&&day<=count?new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day):null;
    });
  },[calendarMonth]);
  const eventsForDay=(day:Date)=>events.filter(event=>{
    const key=new Date(event.starts_at).toLocaleDateString("en-CA",{timeZone:event.timezone||"Asia/Kolkata"});
    const target=day.getFullYear()+"-"+String(day.getMonth()+1).padStart(2,"0")+"-"+String(day.getDate()).padStart(2,"0");
    return key===target;
  });

  // Route changes should always open at the top; do not auto-scroll into a section.

  const nextCountdown = [...countdowns.map((item) => ({ title: item.title, starts_at: item.target_at, kind: item.countdown_type.replace("_"," "), member_name:item.member_name })), ...events.map((item) => ({ title: item.title, starts_at: item.starts_at, kind: "Community event" })), ...campaigns.filter((item) => item.starts_at).map((item) => ({ title: item.title, starts_at: item.starts_at, kind: "Fan campaign" }))].filter((item) => new Date(item.starts_at).getTime() >= Date.now()).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
  const loadHub = useCallback(async () => {
    if (!configured || !supabase) { setProjects([]); setEvents([]); setCountdowns([]); setLoading(false); return; }
    const [projectResult, eventResult, campaignResult, countdownResult] = await Promise.all([
      supabase.from("projects").select("id,title,summary,owner_id,created_at").eq("status","published").order("created_at",{ascending:false}).limit(20),
      supabase.from("events").select("id,title,description,starts_at,timezone,event_type,location_text,event_url").eq("status","published").gte("starts_at",new Date().toISOString()).order("starts_at",{ascending:true}).limit(20),
      supabase.from("campaigns").select("id,title,description,category,starts_at,ends_at").eq("status","published").order("starts_at",{ascending:true}).limit(30),
      supabase.from("space_countdowns").select("id,title,description,countdown_type,member_name,target_at,timezone,source_url").eq("status","published").gte("target_at",new Date().toISOString()).order("target_at",{ascending:true}).limit(30),
    ]);
    if (projectResult.error) setNotice("Projects could not be loaded: "+projectResult.error.message);
    if (eventResult.error) setNotice("Events could not be loaded: "+eventResult.error.message);
    const projectRows = projectResult.data ?? [];
    setProjects(projectRows);
    if (projectRows.length) {
      const { data: taskRows, error: taskError } = await supabase.from("project_tasks")
        .select("id,project_id,title,details,status,assigned_user_id")
        .in("project_id", projectRows.map((project) => project.id)).order("created_at", { ascending: true });
      if (taskError) setNotice("Project tasks are not available until the latest database migration is applied: " + taskError.message);
      setProjectTasks(taskRows ?? []);
    } else setProjectTasks([]);
    setEvents(eventResult.data ?? []);
    if (campaignResult.error) setNotice("Campaigns are unavailable until the latest database migration is applied: " + campaignResult.error.message);
    setCampaigns(campaignResult.data ?? []);
    if(countdownResult.error)setNotice("Countdowns could not be loaded: "+countdownResult.error.message);
    setCountdowns(countdownResult.data ?? []);
    if (user && campaignResult.data?.length) {
      const { data: joined } = await supabase.from("campaign_members").select("campaign_id").eq("user_id", user.id).in("campaign_id", campaignResult.data.map((campaign) => campaign.id));
      setMyCampaignIds((joined ?? []).map((row: any) => row.campaign_id));
    } else setMyCampaignIds([]);
    if (user && eventResult.data?.length) {
      const { data } = await supabase.from("event_rsvps").select("event_id,response").eq("user_id",user.id).in("event_id",eventResult.data.map((event)=>event.id));
      const map: Record<string,string> = {};
      (data ?? []).forEach((row:any)=>{map[row.event_id]=row.response;});
      setRsvps(map);
    } else setRsvps({});
    setLoading(false);
  },[configured,user?.id]);

  useEffect(()=>{void loadHub();},[loadHub]);

  async function addProjectTask(projectId: string) {
    if (!supabase || !user) { setNotice("Sign in to manage project tasks."); return; }
    setBusy("task-create");
    const { error } = await supabase.rpc("create_project_task", { p_project_id: projectId, p_title: taskTitle.trim(), p_details: taskDetails.trim() });
    if (error) setNotice(error.message);
    else { setTaskTitle(""); setTaskDetails(""); setTaskProjectId(""); setMessage("Project task added."); await loadHub(); }
    setBusy("");
  }

  async function volunteerTask(task: any) {
    if (!user) { setNotice("Sign in to volunteer for a project task."); return; }
    if (!supabase) return;
    setBusy(task.id);
    const rpc = task.assigned_user_id === user.id ? "leave_project_task" : "volunteer_for_project_task";
    const { error } = await supabase.rpc(rpc, { p_task_id: task.id });
    if (error) setNotice(error.message);
    else { setMessage(task.assigned_user_id === user.id ? "You left this task." : "You joined the project team."); await loadHub(); }
    setBusy("");
  }

  async function submitProject(event: FormEvent) {
    event.preventDefault();
    if (!user) { setNotice("Sign in to submit a fan project idea."); return; }
    if (!supabase) return;
    setBusy("project"); setMessage("");
    const {error} = await supabase.from("projects").insert({
      title:projectTitle.trim(),summary:projectSummary.trim(),owner_id:user.id,status:"pending",
    });
    if(error) setNotice(error.message);
    else {setProjectTitle("");setProjectSummary("");setMessage("Your project idea has been sent to the review queue.");}
    setBusy("");
  }

  async function createCampaign(event: FormEvent) {
    event.preventDefault();
    if (!user || !supabase || !isModerator) return;
    setBusy("campaign"); setMessage("");
    const { error } = await supabase.from("campaigns").insert({
      title: campaignTitle.trim(), description: campaignDescription.trim(), category: campaignCategory,
      starts_at: campaignStart ? new Date(campaignStart).toISOString() : null,
      ends_at: campaignEnd ? new Date(campaignEnd).toISOString() : null,
      status: "published", created_by: user.id,
    });
    if (error) setNotice(error.message);
    else { setCampaignTitle(""); setCampaignDescription(""); setCampaignStart(""); setCampaignEnd(""); setMessage("Campaign published."); await loadHub(); }
    setBusy("");
  }

  async function toggleCampaign(campaignId: string) {
    if (!user) { setNotice("Sign in to join a campaign."); return; }
    if (!supabase) return;
    setBusy(campaignId);
    const joined = myCampaignIds.includes(campaignId);
    const result = joined
      ? await supabase.from("campaign_members").delete().eq("campaign_id", campaignId).eq("user_id", user.id)
      : await supabase.from("campaign_members").insert({ campaign_id: campaignId, user_id: user.id });
    if (result.error) setNotice(result.error.message);
    else setMyCampaignIds((current) => joined ? current.filter((id) => id !== campaignId) : [...current, campaignId]);
    setBusy("");
  }

  async function submitCountdown(event:FormEvent) {
    event.preventDefault();
    if(!supabase||!user||!isAdmin||!countdownDate)return;
    if(countdownSource.trim()){try{new URL(countdownSource.trim())}catch{setNotice("Enter a valid source URL.");return;}}
    setBusy("countdown");setMessage("");
    const payload={title:countdownTitle.trim(),description:countdownDescription.trim(),countdown_type:countdownType,
      member_name:countdownMember,target_at:new Date(countdownDate+"+05:30").toISOString(),timezone:"Asia/Kolkata",
      source_url:countdownSource.trim()||null,status:"published",created_by:user.id};
    const {error}=editingCountdownId
      ? await supabase.from("space_countdowns").update(payload).eq("id",editingCountdownId)
      : await supabase.from("space_countdowns").insert(payload);
    if(error)setNotice(error.message);
    else{setCountdownTitle("");setCountdownDescription("");setCountdownDate("");setCountdownSource("");setEditingCountdownId(null);setMessage(editingCountdownId?"Countdown updated.":"Countdown published.");await loadHub();}
    setBusy("");
  }

  function editCountdown(item:any){
    setEditingCountdownId(item.id);setCountdownTitle(item.title);setCountdownDescription(item.description||"");
    setCountdownType(item.countdown_type);setCountdownMember(item.member_name||"LYKN");
    const date=new Date(item.target_at);const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);const part=(type:string)=>parts.find(p=>p.type===type)?.value||"00";
    setCountdownDate(part("year")+"-"+part("month")+"-"+part("day")+"T"+part("hour")+":"+part("minute"));setCountdownSource(item.source_url||"");
    document.querySelector(".countdown-create-form")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function cancelCountdown(id:string){
    if(!supabase||!isAdmin||!window.confirm("Cancel this countdown? It will no longer appear publicly."))return;
    const {error}=await supabase.from("space_countdowns").update({status:"cancelled"}).eq("id",id);
    if(error)setNotice(error.message);else{setMessage("Countdown cancelled.");await loadHub();}
  }

  async function submitEvent(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !eventDate) return;
    setBusy("event"); setMessage("");
    const {error} = await supabase.from("events").insert({
      title:eventTitle.trim(),description:eventDescription.trim(),starts_at:new Date(eventDate).toISOString(),
      timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      event_type:eventType,status:"published",created_by:user.id,
    });
    if(error) setNotice(error.message);
    else {setEventTitle("");setEventDescription("");setEventDate("");setMessage("Event published to the community calendar.");await loadHub();}
    setBusy("");
  }

  async function toggleRsvp(eventId:string) {
    if(!user){setNotice("Sign in to RSVP to community events.");return;}
    if(!supabase)return;
    setBusy(eventId);
    const next=rsvps[eventId]==="going"?"not_going":"going";
    const {error}=await supabase.from("event_rsvps").upsert({event_id:eventId,user_id:user.id,response:next});
    if(error)setNotice(error.message);
    else {setRsvps((current)=>({...current,[eventId]:next}));setMessage(next==="going"?"You're on the list.":"Your RSVP was updated.");}
    setBusy("");
  }

  const dateLabel=(value:string,zone:string)=>new Intl.DateTimeFormat(undefined,{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit",timeZone:zone||undefined}).format(new Date(value));

  return <><SectionHeading eyebrow="DO SOMETHING TOGETHER" title={focus === "projects" ? "Fan Project Wall" : focus === "events" ? "Events & Countdowns" : "Fandom Hub"} note={focus === "projects" ? "Discover fan initiatives, join a team and follow each project from idea to celebration." : focus === "events" ? "Keep birthdays, releases, meetups and community moments in one place." : "From little ideas to big fan projects — this is where the fandom makes things happen."}/>{focus==="projects"&&<div className="hub-feature project-wall-hero"><div><div className="eyebrow">IDEAS · TEAMS · PROJECTS · TOGETHER FOR LYKN</div><h2>Small fans.<br/><em>Big projects.</em></h2><p>Find a project, meet your team and turn a shared idea into something meaningful.</p></div></div>}{focus==="events"&&<div className="events-page-hero"><div><div className="eyebrow">MARK YOUR DATES · DON'T MISS A MOMENT</div><h2>Events &<br/><em>Countdowns.</em></h2><p>Birthdays, meetups, concerts and shared fandom moments, gathered in one calendar.</p></div></div>}{focus === "all" && <div className="hub-feature"><div className="hub-feature-icon"><FolderHeart size={31}/></div><div><div className="eyebrow">THE COMMUNITY MAKES THE MAGIC</div><h2>Many hands.<br/><em>One fandom.</em></h2><p>Find a project, volunteer for a task, join a campaign or help create the next shared memory.</p></div><div className="hub-feature-orbit">✦</div></div>}{(focus === "all" || focus === "events") && nextCountdown && <div className="space-countdown" id="space-countdown"><div><span className="eyebrow">SPACE COUNTDOWN · {nextCountdown.kind}</span><strong>{nextCountdown.title}</strong><small>{new Date(nextCountdown.starts_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"})} IST</small></div><b>{Math.max(0,Math.ceil((new Date(nextCountdown.starts_at).getTime()-Date.now())/86400000))===0?"TODAY":Math.max(0,Math.ceil((new Date(nextCountdown.starts_at).getTime()-Date.now())/86400000))+" DAYS"}</b></div>}{focus === "all" && <div className="hub-grid">{hubItems.map((item) => <article className="hub-card" key={item.title}><div className={`hub-icon tone-${item.tone}`}><item.icon size={23}/></div><h3>{item.title}</h3><p>{item.desc}</p><button className="text-link" onClick={() => item.title==="Campaigns" ? document.getElementById("campaigns")?.scrollIntoView({behavior:"smooth"}) : item.title==="Space Countdown" ? navigate("/events-countdowns") : item.title==="Fan Project Wall" ? navigate("/fan-project-wall") : item.title==="Events & Meetups" ? navigate("/events-countdowns") : item.title==="Community Activities" ? navigate("/fun-zone") : navigate("/lykn-universe")}>{item.count} <ArrowRight size={14}/></button></article>)}</div>}
    {message && <div className="auth-message success">{message}</div>}
    {focus==="events"&&<section className="events-calendar-panel"><div className="events-calendar-heading"><div><span className="eyebrow">PLAN YOUR NEXT MOMENT</span><h2>Event calendar</h2><p>Published meetups and fandom events, shown in India Standard Time.</p></div><div className="calendar-month-controls"><button className="button-outline" onClick={()=>setCalendarMonth(v=>new Date(v.getFullYear(),v.getMonth()-1,1))} aria-label="Previous month">‹</button><strong>{calendarMonth.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</strong><button className="button-outline" onClick={()=>setCalendarMonth(v=>new Date(v.getFullYear(),v.getMonth()+1,1))} aria-label="Next month">›</button></div></div><div className="events-calendar-grid">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=><div className="calendar-weekday" key={day}>{day}</div>)}{calendarCells.map((day,index)=><div className={"calendar-day"+(!day?" is-blank":"")} key={index}>{day&&<><span className={day.toDateString()===new Date().toDateString()?"today":""}>{day.getDate()}</span>{eventsForDay(day).map(event=><small key={event.id}>{event.title}</small>)}</>}</div>)}</div><div className="calendar-legend"><span/> Published events and meetups will appear on their dates once added by organisers.</div></section>}
    <div className="hub-live-columns">
      {(focus === "all" || focus === "projects") && <section className="hub-live-section" id="fan-project-wall"><SectionHeading eyebrow="FAN PROJECT WALL" title="Projects in motion" note="Published projects from the community."/>
        {loading?<p className="hub-empty">Loading projects…</p>:projects.length===0?<p className="hub-empty">No published projects yet. Be the first to suggest one.</p>:projects.map((project)=><article className="hub-live-card project-wall-card" key={project.id}><div className="hub-live-icon"><FolderHeart size={18}/></div><div className="project-wall-copy"><strong>{project.title}</strong><p>{project.summary}</p>{projectTasks.filter((task)=>task.project_id===project.id).map((task)=><div className="project-task-row" key={task.id}><div><b>{task.title}</b><small>{task.details || (task.assigned_user_id ? "This task has a volunteer." : "Open volunteer spot")}</small></div><button className="button-outline button-small" disabled={busy===task.id || task.status==="done" || (!!task.assigned_user_id && task.assigned_user_id!==user?.id)} onClick={()=>void volunteerTask(task)}>{busy===task.id?"Saving…":task.status==="done"?"Completed":task.assigned_user_id===user?.id?"Leave task":task.assigned_user_id?"Taken":"Volunteer"}</button></div>)}</div>{user && (isModerator || project.owner_id===user.id) && <div className="project-task-create">{taskProjectId===project.id ? <><input value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} placeholder="Task title" maxLength={120}/><input value={taskDetails} onChange={(e)=>setTaskDetails(e.target.value)} placeholder="Task details (optional)" maxLength={1500}/><button className="button-primary button-small" disabled={busy==="task-create"||taskTitle.trim().length<2} onClick={()=>void addProjectTask(project.id)}>{busy==="task-create"?"Adding…":"Add task"}</button><button className="button-outline button-small" onClick={()=>setTaskProjectId("")}>Cancel</button></> : <button className="button-outline button-small" onClick={()=>{setTaskProjectId(project.id);setTaskTitle("");setTaskDetails("");}}>Add volunteer task</button>}</div>}<span>Open</span></article>)}
        <form className="hub-submit-form" onSubmit={submitProject}><strong>Have a project idea?</strong><input value={projectTitle} onChange={(e)=>setProjectTitle(e.target.value)} placeholder="Project title" maxLength={120} required/><textarea value={projectSummary} onChange={(e)=>setProjectSummary(e.target.value)} placeholder="What would you like to organise?" maxLength={3000} rows={3}/><button className="button-primary" type="submit" disabled={busy==="project"}>{busy==="project"?"Submitting…":"Submit for review"} <ArrowRight size={14}/></button><small>Member submissions enter an approval queue before appearing publicly.</small></form>
      </section>}
      {(focus === "all" || focus === "events") && <section className="hub-live-section" id="community-events"><SectionHeading eyebrow="EVENTS & MEETUPS" title="Coming together" note="Upcoming online and offline fandom moments."/>
        {loading?<p className="hub-empty">Loading events…</p>:events.length===0?<p className="hub-empty">No upcoming events have been published yet.</p>:events.map((event)=><article className="hub-event-card" key={event.id}><div className="hub-event-date"><CalendarDays size={17}/><span>{dateLabel(event.starts_at,event.timezone)}</span></div><strong>{event.title}</strong><p>{event.description}</p><div className="hub-event-footer"><span>{event.event_type}{event.location_text? ` · ${event.location_text}`:""}</span><button className="button-outline button-small" onClick={()=>void toggleRsvp(event.id)} disabled={busy===event.id}>{rsvps[event.id]==="going"?"Going ✓":"RSVP"}</button></div></article>)}
        {isModerator&&<form className="hub-submit-form" onSubmit={submitEvent}><strong>Publish a community event</strong><input value={eventTitle} onChange={(e)=>setEventTitle(e.target.value)} placeholder="Event title" maxLength={120} required/><textarea value={eventDescription} onChange={(e)=>setEventDescription(e.target.value)} placeholder="Event details" maxLength={4000} rows={2}/><input type="datetime-local" value={eventDate} onChange={(e)=>setEventDate(e.target.value)} required/><select value={eventType} onChange={(e)=>setEventType(e.target.value)}><option value="online">Online</option><option value="offline">In person</option><option value="hybrid">Hybrid</option></select><button className="button-primary" type="submit" disabled={busy==="event"}>{busy==="event"?"Publishing…":"Publish event"} <ArrowRight size={14}/></button></form>}
        {countdowns.length>0&&<div className="countdown-list">{countdowns.map(item=><article className="countdown-item" key={item.id}><div><span className="eyebrow">{item.countdown_type.replace("_"," ")} · {item.member_name}</span><strong>{item.title}</strong><p>{item.description}</p><small>{new Date(item.target_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:item.timezone||"Asia/Kolkata"})} IST</small>{item.source_url&&<a className="schedule-source-credit" href={item.source_url} target="_blank" rel="noreferrer">Watch / open official source ↗</a>}</div><b>{Math.max(0,Math.ceil((new Date(item.target_at).getTime()-Date.now())/86400000))===0?"TODAY":Math.max(0,Math.ceil((new Date(item.target_at).getTime()-Date.now())/86400000))+" DAYS"}</b>{isAdmin&&<div className="countdown-admin-actions"><button type="button" onClick={()=>editCountdown(item)}>Edit</button><button type="button" onClick={()=>void cancelCountdown(item.id)}>Cancel</button></div>}</article>)}</div>}
        {isAdmin&&<form className="hub-submit-form countdown-create-form" onSubmit={submitCountdown}><strong>{editingCountdownId?"Update Space Countdown":"Create a Space Countdown"}</strong><input value={countdownTitle} onChange={e=>setCountdownTitle(e.target.value)} placeholder="Birthday, release, concert or fan event" maxLength={180} required/><textarea value={countdownDescription} onChange={e=>setCountdownDescription(e.target.value)} placeholder="Details (optional)" maxLength={2000} rows={2}/><div className="countdown-form-grid"><select value={countdownType} onChange={e=>setCountdownType(e.target.value)}><option value="birthday">Birthday</option><option value="release">Music release</option><option value="comeback">Comeback</option><option value="concert">Concert</option><option value="fan_event">Fan event</option><option value="other">Other</option></select><select value={countdownMember} onChange={e=>setCountdownMember(e.target.value)}><option value="LYKN">LYKN (group)</option>{members.map(m=><option key={m.name} value={m.name}>{m.name}</option>)}</select></div><input type="datetime-local" value={countdownDate} onChange={e=>setCountdownDate(e.target.value)} required/><input type="url" value={countdownSource} onChange={e=>setCountdownSource(e.target.value)} placeholder="Source URL (optional)"/><button className="button-primary" type="submit" disabled={busy==="countdown"}>{busy==="countdown"?"Saving…":editingCountdownId?"Save changes":"Publish countdown"}</button>{editingCountdownId&&<button type="button" className="button-outline" onClick={()=>{setEditingCountdownId(null);setCountdownTitle("");setCountdownDescription("");setCountdownDate("");setCountdownSource("");}}>Cancel edit</button>}<small>Dates are shown in India Standard Time. Verify dates against official sources before publishing.</small></form>}
      </section>}
    </div>
    {(focus === "all" || focus === "events") && <section className="hub-campaigns" id="campaigns"><SectionHeading eyebrow="STREAMING · VOTING · BIRTHDAYS · COMEBACKS" title="Campaigns" note="Join coordinated fan activities and keep track of shared goals."/>
      {campaigns.length===0?<p className="hub-empty">No active campaigns have been published yet.</p>:<div className="campaign-grid">{campaigns.map((campaign)=><article className="campaign-card" key={campaign.id}><span className="eyebrow">{campaign.category}</span><h3>{campaign.title}</h3><p>{campaign.description}</p><small>{campaign.starts_at?new Date(campaign.starts_at).toLocaleDateString():"Starts when announced"}{campaign.ends_at?" · Ends "+new Date(campaign.ends_at).toLocaleDateString():""}</small><button className="button-outline button-small" onClick={()=>void toggleCampaign(campaign.id)} disabled={busy===campaign.id}>{busy===campaign.id?"Saving…":myCampaignIds.includes(campaign.id)?"Joined · Leave":"Join campaign"}</button></article>)}</div>}
      {isModerator&&<form className="hub-submit-form campaign-create-form" onSubmit={createCampaign}><strong>Publish a campaign</strong><input value={campaignTitle} onChange={(e)=>setCampaignTitle(e.target.value)} placeholder="Campaign name" maxLength={140} required/><textarea value={campaignDescription} onChange={(e)=>setCampaignDescription(e.target.value)} placeholder="Campaign details and how fans can participate" maxLength={3000} rows={3}/><select value={campaignCategory} onChange={(e)=>setCampaignCategory(e.target.value)}><option value="streaming">Streaming</option><option value="voting">Voting</option><option value="birthday">Birthday</option><option value="comeback">Comeback</option><option value="other">Other</option></select><label>Starts <input type="datetime-local" value={campaignStart} onChange={(e)=>setCampaignStart(e.target.value)}/></label><label>Ends <input type="datetime-local" value={campaignEnd} onChange={(e)=>setCampaignEnd(e.target.value)}/></label><button className="button-primary" type="submit" disabled={busy==="campaign"}>{busy==="campaign"?"Publishing…":"Publish campaign"}</button></form>}
    </section>}
    {focus === "all" && <section className="organiser-note"><Users size={19}/><div><strong>Have an idea for the fandom?</strong><span>Community suggestions and member contributions go through a review queue before appearing publicly.</span></div></section>}
  </>;
}
function PublicMemberProfilePage({username}:{username:string}) {
  const navigate=useNavigate();
  const {user}=useAuth();
  const [profile,setProfile]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [friendStatus,setFriendStatus]=useState("");
  const {isStaff}=useStaffRole();
  const [profileComments,setProfileComments]=useState<any[]>([]);
  const [commentText,setCommentText]=useState("");
  const [replyTo,setReplyTo]=useState<string|null>(null);
  const [replyText,setReplyText]=useState("");
  const [commentBusy,setCommentBusy]=useState(false);
  const [commentError,setCommentError]=useState("");
  const [commentNotice,setCommentNotice]=useState("");
  const [reportingId,setReportingId]=useState<string|null>(null);
  const [reportDetails,setReportDetails]=useState("");
  async function loadProfileComments(profileId:string){
    if(!supabase)return;
    const {data,error:commentsError}=await supabase.from("profile_comments").select("id,profile_id,author_id,parent_id,body,created_at").eq("profile_id",profileId).order("created_at",{ascending:true});
    if(commentsError){setCommentError(commentsError.message);return;}
    const rows=data??[];
    const authorIds=[...new Set(rows.map((row:any)=>row.author_id))];
    const {data:authors}=authorIds.length?await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",authorIds):{data:[] as any[]};
    const authorMap=new Map((authors??[]).map((author:any)=>[author.id,author]));
    setProfileComments(rows.map((row:any)=>({...row,author:authorMap.get(row.author_id)??null})));
    setCommentError("");
  }
  useEffect(()=>{
    let active=true;
    async function load(){
      if(!supabase||!username){setLoading(false);return;}
      const {data,error:loadError}=await supabase.from("profiles").select("id,username,display_name,bio,bias,bias_wrecker,favourite_song,favourite_era,avatar_url,cover_url,profile_visibility").eq("username",username.toLowerCase()).maybeSingle();
      if(!active)return;
      if(loadError)setError(loadError.message);
      setProfile(data);
      setLoading(false);
    }
    void load();return()=>{active=false;};
  },[username]);
  useEffect(()=>{
    if(profile?.id)void loadProfileComments(profile.id);
  },[profile?.id]);
  async function publishProfileComment(parentId:string|null=null){
    if(!user){navigate("/login");return;}
    if(!supabase||!profile)return;
    const body=(parentId?replyText:commentText).trim();
    if(!body)return;
    setCommentBusy(true);setCommentError("");setCommentNotice("");
    const {error:insertError}=await supabase.from("profile_comments").insert({profile_id:profile.id,author_id:user.id,parent_id:parentId,body});
    if(insertError)setCommentError(insertError.message);
    else{setCommentText("");setReplyText("");setReplyTo(null);await loadProfileComments(profile.id);}
    setCommentBusy(false);
  }
  async function deleteProfileComment(commentId:string){
    if(!supabase||!profile)return;
    setCommentBusy(true);setCommentError("");setCommentNotice("");
    const {error:deleteError}=await supabase.from("profile_comments").delete().eq("id",commentId);
    if(deleteError)setCommentError(deleteError.message);
    else{setCommentNotice("Comment deleted.");await loadProfileComments(profile.id);}
    setCommentBusy(false);
  }
  async function reportProfileComment(commentId:string){
    if(!user){navigate("/login");return;}
    if(!supabase)return;
    setCommentBusy(true);setCommentError("");setCommentNotice("");
    const {error:reportError}=await supabase.from("profile_comment_reports").insert({comment_id:commentId,reporter_id:user.id,details:reportDetails.trim()});
    if(reportError)setCommentError(reportError.code==="23505"?"You have already reported this comment.":reportError.message);
    else{setCommentNotice("Thanks. Your report has been sent to the moderation queue.");setReportingId(null);setReportDetails("");}
    setCommentBusy(false);
  }
  async function addFriend(){
    if(!user){navigate("/login");return;}
    if(!supabase||!profile)return;
    const {error:requestError}=await supabase.rpc("send_friend_request",{p_recipient_id:profile.id});
    if(requestError)setFriendStatus(requestError.message);else setFriendStatus("Friend request sent.");
  }
  if(loading)return <div className="universe-empty">Loading member profile…</div>;
  if(error||!profile)return <section className="member-profile-public-empty"><h2>Profile unavailable</h2><p>{error||"This profile may be private or no longer available."}</p><button className="button-outline" onClick={()=>navigate("/members")}>Back to members</button></section>;
  const isSelf=user?.id===profile.id;
  return <section className="member-profile-public">
    <div className="member-profile-cover" style={profile.cover_url?{backgroundImage:"linear-gradient(90deg,rgba(10,8,28,.25),rgba(10,8,28,.12)),url("+profile.cover_url+")",backgroundSize:"cover",backgroundPosition:"center"}:undefined}><span>✦ LYKYOU SPACE MEMBER ✦</span></div>
    <div className="member-profile-main"><div className="member-profile-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt={profile.display_name}/>:profile.display_name.slice(0,1).toUpperCase()}</div>
      <div className="member-profile-title"><div><h2>{profile.display_name}</h2><span>@{profile.username}</span></div><div className="member-profile-actions">{isSelf?<button className="button-primary" onClick={()=>navigate("/profile")}>Edit my profile</button>:user&&<button className="button-primary" onClick={()=>void addFriend()}>Add friend <Users size={14}/></button>}</div></div>
      {friendStatus&&<p className="auth-message success">{friendStatus}</p>}
      <p className="member-profile-bio">{profile.bio||"A LYKYOU in the galaxy."}</p>
      <div className="member-profile-facts"><div><small>MY BIAS</small><strong>{profile.bias?.length?profile.bias.join(" · "):"Not set yet"}</strong></div><div><small>BIAS WRECKER</small><strong>{profile.bias_wrecker?.length?profile.bias_wrecker.join(" · "):"Not set yet"}</strong></div><div><small>FAVOURITE SONG</small><strong>{profile.favourite_song||"Not added yet"}</strong></div><div><small>FAVOURITE ERA</small><strong>{profile.favourite_era||"Not added yet"}</strong></div></div>
      <section className="profile-guestbook" aria-labelledby="profile-guestbook-title">
        <div className="profile-guestbook-heading"><div><span className="eyebrow">A LITTLE NOTE FOR THIS LYKYOU</span><h3 id="profile-guestbook-title">Guestbook <span>{profileComments.length}</span></h3><p>Leave a kind message, say hello or reply to another fan.</p></div><MessageCircle size={24}/></div>
        {user?<form className="profile-comment-compose" onSubmit={e=>{e.preventDefault();void publishProfileComment();}}><textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Write a message for this LYKYOU…" maxLength={1000} rows={3} required/><div><small>{commentText.length}/1000</small><button className="button-primary" type="submit" disabled={commentBusy||!commentText.trim()}><Send size={14}/>{commentBusy?"Posting…":"Leave a comment"}</button></div></form>:<div className="profile-comment-signin">Sign in to leave a comment. <button className="text-link" onClick={()=>navigate("/login")}>Sign in <ArrowRight size={13}/></button></div>}
        {commentError&&<p className="auth-message error" role="alert">{commentError}</p>}
        {commentNotice&&<p className="auth-message success" role="status">{commentNotice}</p>}
        {profileComments.length===0?<div className="profile-comment-empty">No messages yet. Be the first to sign this guestbook.</div>:<div className="profile-comment-list">{profileComments.filter((comment:any)=>!comment.parent_id).map((comment:any)=><article className="profile-comment" key={comment.id}>
          <div className="profile-comment-main"><div className="profile-comment-avatar">{comment.author?.avatar_url?<img src={comment.author.avatar_url} alt=""/>:(comment.author?.display_name??"L").slice(0,1).toUpperCase()}</div><div className="profile-comment-content"><div className="profile-comment-meta"><strong>{comment.author?.display_name??"LYKYOU"}</strong><span>@{comment.author?.username??"lykyou"}</span><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString()}</time></div><p>{comment.body}</p><div className="profile-comment-actions">{user&&<button type="button" onClick={()=>{setReplyTo(replyTo===comment.id?null:comment.id);setReplyText("");}}>Reply</button>}{(user?.id===comment.author_id||user?.id===profile.id||isStaff)&&<button type="button" onClick={()=>void deleteProfileComment(comment.id)} disabled={commentBusy}>Delete</button>}{user&&user.id!==comment.author_id&&<button type="button" onClick={()=>{setReportingId(reportingId===comment.id?null:comment.id);setReportDetails("");}}>Report</button>}</div>
          {reportingId===comment.id&&<form className="profile-comment-report" onSubmit={e=>{e.preventDefault();void reportProfileComment(comment.id);}}><textarea value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Optional details for the moderators" maxLength={500} rows={2}/><button className="button-outline" type="submit" disabled={commentBusy}>Send report</button></form>}
          {replyTo===comment.id&&user&&<form className="profile-comment-reply-form" onSubmit={e=>{e.preventDefault();void publishProfileComment(comment.id);}}><textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Write a reply…" maxLength={1000} rows={2} required/><button className="button-primary" type="submit" disabled={commentBusy||!replyText.trim()}>{commentBusy?"Posting…":"Reply"}</button></form>}
          </div></div>
          {profileComments.filter((reply:any)=>reply.parent_id===comment.id).map((reply:any)=><div className="profile-comment-reply" key={reply.id}><div className="profile-comment-avatar">{reply.author?.avatar_url?<img src={reply.author.avatar_url} alt=""/>:(reply.author?.display_name??"L").slice(0,1).toUpperCase()}</div><div className="profile-comment-content"><div className="profile-comment-meta"><strong>{reply.author?.display_name??"LYKYOU"}</strong><span>@{reply.author?.username??"lykyou"}</span><time dateTime={reply.created_at}>{new Date(reply.created_at).toLocaleString()}</time></div><p>{reply.body}</p><div className="profile-comment-actions">{(user?.id===reply.author_id||user?.id===profile.id||isStaff)&&<button type="button" onClick={()=>void deleteProfileComment(reply.id)} disabled={commentBusy}>Delete</button>}{user&&user.id!==reply.author_id&&<button type="button" onClick={()=>{setReportingId(reportingId===reply.id?null:reply.id);setReportDetails("");}}>Report</button>}</div>{reportingId===reply.id&&<form className="profile-comment-report" onSubmit={e=>{e.preventDefault();void reportProfileComment(reply.id);}}><textarea value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Optional details for the moderators" maxLength={500} rows={2}/><button className="button-outline" type="submit" disabled={commentBusy}>Send report</button></form>}</div></div>)}
        </article>)}</div>}
      </section>
      <button className="text-link" onClick={()=>navigate("/members")}>Back to Meet the LYKYOUs <ArrowRight size={13}/></button>
    </div>
  </section>;
}
function BiasCornerPage() {
  const navigate = useNavigate();
  const { user, configured } = useAuth();
  const [own,setOwn] = useState<any>(null);
  const [matches,setMatches] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [posts,setPosts] = useState<any[]>([]);
  const [postLoading,setPostLoading] = useState(true);
  const [draft,setDraft] = useState("");
  const [photo,setPhoto] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [liked,setLiked] = useState<string[]>([]);
  const [commentPostId,setCommentPostId] = useState<string|null>(null);
  const [activeSpace,setActiveSpace] = useState("OT5");
  const spaces = [
    {id:"WILLIAM",label:"WILLIAM",note:"William appreciation, photos, edits and favourite moments",tone:"orange"},
    {id:"LEGO",label:"LEGO",note:"Lego appreciation, photos, edits and favourite moments",tone:"blue"},
    {id:"NUT",label:"NUT",note:"Nut appreciation, photos, edits and favourite moments",tone:"mint"},
    {id:"HONG",label:"HONG",note:"Hong appreciation, photos, edits and favourite moments",tone:"lavender"},
    {id:"TUI",label:"TUI",note:"Tui appreciation, photos, edits and favourite moments",tone:"pink"},
    {id:"OT5",label:"OT5",note:"One shared space for all five members — group love belongs here",tone:"ot5"}
  ];
  const names = ["WILLIAM","LEGO","NUT","HONG","TUI"];
  const loadPosts = useCallback(async()=>{
    if(!configured||!supabase){setPosts([]);setPostLoading(false);return;}
    setPostLoading(true);
    const {data,error:postError}=await supabase.from("posts").select("id,author_id,body,created_at,post_type,media_url").eq("status","published").ilike("body","%#BiasCorner%").order("created_at",{ascending:false}).limit(100);
    if(postError){setError(postError.message);setPostLoading(false);return;}
    const allRows=data??[];
    const rows=allRows.filter((row:any)=>{
      const body=row.body??"";
      if(activeSpace==="OT5") return body.includes("#BiasOT5") || !/#Bias(?:WILLIAM|LEGO|NUT|HONG|TUI)\b/i.test(body);
      return body.includes("#Bias"+activeSpace);
    });
    const ids=[...new Set(rows.map((x:any)=>x.author_id))];
    const [{data:profiles},{data:likes},{data:comments},{data:mine}]=await Promise.all([
      ids.length?supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids):Promise.resolve({data:[]}),
      rows.length?supabase.from("post_likes").select("post_id").in("post_id",rows.map((x:any)=>x.id)):Promise.resolve({data:[]}),
      rows.length?supabase.from("comments").select("post_id").in("post_id",rows.map((x:any)=>x.id)):Promise.resolve({data:[]}),
      user&&rows.length?supabase.from("post_likes").select("post_id").eq("user_id",user.id).in("post_id",rows.map((x:any)=>x.id)):Promise.resolve({data:[]})
    ]);
    const profileMap=new Map((profiles??[]).map((x:any)=>[x.id,x]));
    const count=(arr:any[])=>arr.reduce((m:any,x:any)=>(m[x.post_id]=(m[x.post_id]||0)+1,m),{});
    const likeCounts=count(likes??[]),commentCounts=count(comments??[]);
    setLiked((mine??[]).map((x:any)=>x.post_id));
    setPosts(rows.map((row:any,i:number)=>{
      const profile:any=profileMap.get(row.author_id);
      const mins=Math.max(0,Math.floor((Date.now()-new Date(row.created_at).getTime())/60000));
      return {id:row.id,authorId:row.author_id,name:profile?.display_name??"LYKYOU",handle:profile?.username?"@"+profile.username:"@lykyou",initials:(profile?.display_name??"L").slice(0,1).toUpperCase(),avatarUrl:profile?.avatar_url??undefined,mediaUrl:row.media_url??undefined,text:row.body.replace(/\s*#BiasCorner\b/gi,"").replace(/\s*#Bias(?:WILLIAM|LEGO|NUT|HONG|TUI|OT5)\b/gi,"").trim(),tags:["Bias Corner"],likes:likeCounts[row.id]||0,comments:commentCounts[row.id]||0,time:mins<1?"just now":mins<60?mins+"m ago":mins<1440?Math.floor(mins/60)+"h ago":Math.floor(mins/1440)+"d ago",tone:["lavender","mint","pink","blue","orange"][i%5]};
    }));
    setPostLoading(false);
  },[configured,user?.id,activeSpace]);
  useEffect(()=>{let active=true;async function load(){
    if(!supabase||!user||!configured){setLoading(false);return;}
    const {data:profile,error:profileError}=await supabase.from("profiles").select("username,display_name,bias,bias_wrecker,avatar_url").eq("id",user.id).maybeSingle();
    if(profileError)setError(profileError.message);
    if(active)setOwn(profile);
    const bias=profile?.bias??[];
    if(bias.length){const {data,error:matchError}=await supabase.from("profiles").select("id,username,display_name,bias,avatar_url").overlaps("bias",bias).neq("id",user.id).limit(12);if(matchError)setError(matchError.message);if(active)setMatches(data??[]);}
    if(active)setLoading(false);
  }void load();return()=>{active=false;};},[user?.id,configured]);
  useEffect(()=>{void loadPosts();},[loadPosts]);
  async function publish(event:FormEvent){
    event.preventDefault();
    if(!user){navigate("/login");return;}
    if(!supabase||!configured){setError("Posting will be available when the community connection is ready.");return;}
    if(!draft.trim()&&!photo)return;
    setBusy(true);let uploaded:string|null=null;let mediaUrl:string|null=null;
    try{
      if(photo){
        if(!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size>3*1024*1024)throw new Error("Choose a JPG, PNG or WebP image under 3 MB.");
        const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";
        uploaded="community/"+user.id+"/"+Date.now()+"."+ext;
        const {error:uploadError}=await supabase.storage.from("space-media").upload(uploaded,photo,{contentType:photo.type,upsert:false});
        if(uploadError)throw uploadError;
        mediaUrl=supabase.storage.from("space-media").getPublicUrl(uploaded).data.publicUrl;
      }
      const body=(draft.trim()?draft.trim()+" ":"")+"#BiasCorner #Bias"+activeSpace;
      const {error:insertError}=await supabase.from("posts").insert({author_id:user.id,body,media_url:mediaUrl,post_type:photo?"photo":"text",visibility:"public",status:"published"});
      if(insertError)throw insertError;
      setDraft("");setPhoto(null);setError("");await loadPosts();
    }catch(e){if(uploaded)await supabase.storage.from("space-media").remove([uploaded]);setError(e instanceof Error?e.message:"Your post could not be published.");}
    finally{setBusy(false);}
  }
  async function togglePostLike(id:string){
    if(!user){navigate("/login");return;}
    if(!supabase)return;
    const exists=liked.includes(id);
    const result=exists?await supabase.from("post_likes").delete().eq("post_id",id).eq("user_id",user.id):await supabase.from("post_likes").insert({post_id:id,user_id:user.id});
    if(result.error)setError(result.error.message);else await loadPosts();
  }
  async function removePost(id:string){
    if(!user||!supabase||!window.confirm("Delete your Bias Corner post?"))return;
    const {data}=await supabase.from("posts").select("media_url").eq("id",id).eq("author_id",user.id).maybeSingle();
    const {error:deleteError}=await supabase.from("posts").delete().eq("id",id).eq("author_id",user.id);
    if(deleteError){setError(deleteError.message);return;}
    if(data?.media_url){const marker="/storage/v1/object/public/space-media/";const path=data.media_url.includes(marker)?decodeURIComponent(data.media_url.split(marker)[1].split("?")[0]):"";if(path.startsWith("community/"))await supabase.storage.from("space-media").remove([path]);}
    await loadPosts();
  }
  return <>
    <section className={"bias-corner-hero bias-hero-"+activeSpace.toLowerCase()}><img className="bias-corner-banner-image" src="/bias-corner-banner.webp.png" alt="" aria-hidden="true"/><div className="bias-corner-hero-copy"><div className="eyebrow">YOUR FAVOURITES · YOUR PEOPLE</div><h2>Bias Corner</h2><p>Six dedicated spaces for member appreciation, fan photos, edits, memories and OT5 love.</p><button className="button-primary" onClick={()=>document.querySelector(".bias-post-composer textarea")?.scrollIntoView({behavior:"smooth",block:"center"})}>Share in {activeSpace==="OT5"?"OT5":activeSpace+"'s"} space <ArrowRight size={15}/></button></div><div className="bias-corner-hero-art"><div className="bias-corner-orbit"><span>✦　♡　✧</span><strong>{activeSpace}</strong><span>✧　♡　✦</span></div></div></section>
    <section className="bias-community-feed">
      <SectionHeading eyebrow="SIX SPACES · ONE FANDOM" title="Choose your corner" note="Each member has a separate fan space. OT5 is the shared home for all five."/>
      <div className="bias-space-tabs" role="tablist" aria-label="Bias Corner spaces">{spaces.map(space=><button type="button" role="tab" aria-selected={activeSpace===space.id} className={"bias-space-tab tone-"+space.tone+(activeSpace===space.id?" active":"")} key={space.id} onClick={()=>setActiveSpace(space.id)}><span>{space.label}</span><small>{space.id==="OT5"?"All five":"Member space"}</small></button>)}</div>
      <div className="bias-space-intro"><div><span className="eyebrow">{activeSpace==="OT5"?"THE GROUP SPACE":"MEMBER FAN SPACE"}</span><h3>{activeSpace==="OT5"?"OT5 Corner":activeSpace+" Corner"}</h3><p>{spaces.find(space=>space.id===activeSpace)?.note}</p></div><span className="bias-space-symbol">{activeSpace==="OT5"?"✦♡✦":"♡"}</span></div>
      <SectionHeading eyebrow="COMMUNITY FEED" title={activeSpace==="OT5"?"All five. Always.":activeSpace+" appreciation"} note={"Posts shared specifically in the "+(activeSpace==="OT5"?"OT5":"#"+activeSpace)+" space appear here."}/>
      <form className="composer bias-post-composer" onSubmit={publish}><Avatar initials={(own?.display_name??"Y").slice(0,1).toUpperCase()} tone="lavender" src={own?.avatar_url}/><div className="composer-main"><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={3} maxLength={3000} placeholder={user?"Share something in "+(activeSpace==="OT5"?"the OT5 space":activeSpace+"'s space")+" — photos, fan art, edits or appreciation…":"Sign in to share with the Bias Corner community"} disabled={!user}/>{photo&&<div className="composer-file-name">Attached: {photo.name} <button type="button" onClick={()=>setPhoto(null)}>Remove</button></div>}<div className="composer-actions"><label className="composer-attach"><Image size={15}/> Add photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label><span><Heart size={14}/> Keep it kind and credit creators</span><button className="button-primary button-small" type="submit" disabled={!user||busy||(!draft.trim()&&!photo)}>{busy?"Publishing…":"Publish to "+activeSpace} <Send size={14}/></button></div></div></form>
      {error&&<div className="auth-message error">{error}</div>}
      {postLoading?<div className="universe-empty">Loading Bias Corner posts…</div>:posts.length===0?<EmptyState title="Be the first to post" text={"Start "+(activeSpace==="OT5"?"the OT5 space":activeSpace+"'s space")+" with an appreciation post, favourite photo or fan creation."}/>:<div className="post-list">{posts.map(post=><PostCard key={post.id} post={post} liked={liked.includes(post.id)} bookmarked={false} toggleLike={togglePostLike} toggleBookmark={()=>{}} onComments={setCommentPostId} onReport={()=>setError("Use the main Community page to report a post.")} isMine={post.authorId===user?.id} onEdit={()=>setError("Edit this post from your profile activity.")} onDelete={removePost}/>)}</div>}
    </section>
    <div className="bias-corner-grid">
      <article className="bias-corner-card"><span className="eyebrow">MY BIAS</span><h3>{loading?"Loading…":own?.bias?.length?own.bias.join(" · "):"Not chosen yet"}</h3><p>Your top favourites, exactly how you want to celebrate them.</p><button className="text-link" onClick={()=>navigate("/profile")}>Choose my bias <ArrowRight size={13}/></button></article>
      <article className="bias-corner-card"><span className="eyebrow">BIAS WRECKER</span><h3>{loading?"Loading…":own?.bias_wrecker?.length?own.bias_wrecker.join(" · "):"Still deciding?"}</h3><p>There is always room for another favourite.</p><button className="text-link" onClick={()=>navigate("/profile")}>Update bias wrecker <ArrowRight size={13}/></button></article>
      <article className="bias-corner-card bias-ot5"><span className="eyebrow">OT5 CORNER</span><h3>All five. Always.</h3><div className="bias-member-pills">{names.map((name,i)=><span className={"tone-"+["lavender","mint","pink","blue","orange"][i]} key={name}>{name}</span>)}</div><button className="text-link" onClick={()=>navigate("/lykn-universe")}>Explore member hubs <ArrowRight size={13}/></button></article>
    </div>
    <SectionHeading eyebrow="FIND YOUR BIAS TWIN" title="Fans in your orbit" note="Members who have selected one or more of the same bias choices."/>
    {!user?<div className="universe-empty">Sign in and set your bias to discover fans with shared favourites. <button className="text-link" onClick={()=>navigate("/login")}>Sign in <ArrowRight size={13}/></button></div>:loading?<div className="universe-empty">Finding your bias twins…</div>:error?<div className="universe-empty">Bias matching will appear when your profile is ready.</div>:!own?.bias?.length?<div className="universe-empty">Choose at least one bias in your profile to see matching LYKYOUs.</div>:matches.length===0?<div className="universe-empty">No matches yet. As more LYKYOUs join and set their bias, they will appear here.</div>:<div className="bias-match-grid">{matches.map(person=><article className="bias-match-card" key={person.id}><div className="member-result-avatar">{person.avatar_url?<img src={person.avatar_url} alt=""/>:person.display_name.slice(0,1)}</div><div><strong>{person.display_name}</strong><span>@{person.username}</span><small>{(person.bias??[]).filter((n:string)=>own.bias.includes(n)).join(" · ")}</small></div></article>)}</div>}
    {commentPostId&&<CommentThread postId={commentPostId} setNotice={setError} onClose={()=>setCommentPostId(null)} onChanged={loadPosts}/>}
    <div className="bias-corner-footer"><span>✦</span><div><strong>Your bias is your choice. OT5 is always welcome.</strong><p>All five members are celebrated equally here. No rankings, no pressure.</p></div></div>
  </>;
}
const verifiedMusicVideos = [
  {title:"เลิกกับเขาเดี๋ยวเหงาเป็นเพื่อน (MAY I?)",year:"2023",id:"eH7nqC19Sqg"},
  {title:"UMM UMM",year:"2023",id:"3B6uubvCtTA"},
  {title:"แอบรักไม่ทำให้ใครตาย (NO WORRIES)",year:"2023",id:"ZlStESuBMhE"},
  {title:"HUI LAY HUI (with SIZZY)",year:"2023",id:"s3ehIJh88ec"},
  {title:"ฉ่ำ (CHARM) (with Joong & Pond)",year:"2024",id:"EZ7AO_G0MkE"},
  {title:"ความรักไม่ได้น่ากลัวขนาดนั้น (TRUST ME)",year:"2024",id:"9np-lAtCRpQ"},
  {title:"โฮ่ง! (SUGOI)",year:"2024",id:"nFp4zjAARFs"},
  {title:"หยอกไม่หลอก (TRICK OR TREAT) (feat. Chrrissa)",year:"2024",id:"b0V35uxCnmY"},
  {title:"LYKYOU",year:"2024",id:"kWm-prKFnok"},
  {title:"I Know You Want Me (ThamePo OST)",year:"2025",id:"JXrq3aOUZP8"},
  {title:"จีบได้มั้ย (Would You Mind?) (ThamePo OST)",year:"2025",id:"PlOx16l8TUY"},
  {title:"หูดับ (Who Says) (ThamePo OST)",year:"2025",id:"rpCVucZL0Gk"},
  {title:"Fly High (ThamePo OST)",year:"2025",id:"C2msd9CqxYs"},
  {title:"ทัก (FIRST SIGHT)",year:"2025",id:"N2Rh3gNWFRI"},
  {title:"น้ำหยดลงหิน (DRIP)",year:"2025",id:"WzVzM96aILI"},
  {title:"หน้าเบลอหลังชัด (Foreground)",year:"2025",id:"QxQVJatEBT8"},
  {title:"ชอบก็บอก (Feel Like Me)",year:"2025",id:"dtt4SM-vhm0"},
  {title:"โลเล โยเย โมเม (No Way)",year:"2026",id:"FhEc_UZ-I6I"},
  {title:"ถ้าเกิด (If Only)",year:"2026",id:"hBJDV9A9_8A"},
  {title:"ล็อกมง (You Shine I Choose) (feat. Bow Maylada)",year:"2026",id:"rOnHI01ZP7k"},
  {title:"หน้าไหว้หลังหลอก (Oh My Gosh)",year:"2026",id:"J98lNjsgUvA"},
  {title:"ครั้งแรกพอทน (Not Again) (feat. Joke iScream)",year:"2026",id:"FS9htOhi24c"},
  {title:"คงต้องเป็นคนนี้ (Always Been)",year:"2026",id:"OGNDN-K8RY4"},
];
const verifiedSoloSongs = [
  {title:"จำได้ว่าลืม (Flashback)",artist:"WILLIAM",year:"2026",id:"Kq5ZmWrtnW8"},
  {title:"ไม่รวยไม่คุย (Rich)",artist:"LEGO",year:"2026",id:"2dy89J7ROmQ"},
  {title:"เทสดี (Tasty)",artist:"NUT",year:"2026",id:"fg5DGDB-frw"},
  {title:"ถูกสเปก (Let's Go)",artist:"HONG",year:"2026",id:"CvTuWXb-8hk"},
  {title:"ปล่อยใจ (Bloom)",artist:"TUI",year:"2026",id:"cqW6CfRZOlc"},
];
const verifiedOsts = [
  {title:"All I Need",detail:"ThamePo: Heart That Skips a Beat OST · LYKN",year:"2024",id:"DBwgzhx1qW4"},
  {title:"I Know You Want Me",detail:"ThamePo: Heart That Skips a Beat OST · LYKN",year:"2025",id:"JXrq3aOUZP8"},
  {title:"จีบได้มั้ย (Would You Mind?)",detail:"ThamePo: Heart That Skips a Beat OST · LYKN",year:"2025",id:"PlOx16l8TUY"},
  {title:"หูดับ (Who Says)",detail:"ThamePo: Heart That Skips a Beat OST · LYKN",year:"2025",id:"rpCVucZL0Gk"},
  {title:"Fly High",detail:"ThamePo: Heart That Skips a Beat OST · LYKN",year:"2025",id:"C2msd9CqxYs"},
];
const verifiedDuets = [
  {title:"ฉ่ำ (CHARM)",detail:"LYKN with Joong Archen & Pond Naravit · 2024",id:"EZ7AO_G0MkE"},
  {title:"HUI LAY HUI",detail:"LYKN with SIZZY · 2023",id:"s3ehIJh88ec"},
  {title:"หยอกไม่หลอก (TRICK OR TREAT)",detail:"LYKN feat. Chrrissa · 2024",id:"b0V35uxCnmY"},
  {title:"ล็อกมง (You Shine I Choose)",detail:"LYKN feat. Bow Maylada · 2026",id:"rOnHI01ZP7k"},
];
const releaseAlbums = [
  {title:"DUSK & DAWN",year:"2025",detail:"Debut album · October 2025"},
  {title:"DUSK & DAWN (Japanese Deluxe)",year:"2026",detail:"Japanese deluxe edition · April 2026"},
  {title:"REFLEXION",year:"2026",detail:"Album · 2026"},
];
const verifiedPerformances = [
  {title:"LYKN LIVE SESSION · LIVING ROOM VERSION",date:"21 Jun 2024",id:"5e8x8xHu6Nc",label:"Performance video · RISER MUSIC"},
  {title:"CHARM · Special Dance Performance with Joong & Pond",date:"15 Apr 2024",id:"Z0ia30AmlK0",label:"Special dance performance · RISER MUSIC"},
  {title:"SUGOI · Dance Performance",date:"8 Oct 2024",id:"kw85HeMXyy0",label:"Dance performance · RISER MUSIC"},
];
const timelineMilestones = [
  {date:"2022",year:"2022",category:"Formation",title:"Project Alpha begins",detail:"The GMMTV survival programme introduces the trainees who will compete for places in a new group."},
  {date:"4 Dec 2022",year:"2022",category:"Formation",title:"Project Alpha premieres",detail:"The televised competition begins, following the trainees' vocal, dance and performance development."},
  {date:"5 Mar 2023",year:"2023",category:"Formation",title:"The five-member lineup is selected",detail:"William, Lego, Tui, Hong and Nut secure places in the debuting group through the Project Alpha finale."},
  {date:"5 Apr 2023",year:"2023",category:"Formation",title:"LYKN name is revealed",detail:"The five-member group is introduced under the name LYKN at the RISER launch."},
  {date:"5 May 2023",year:"2023",category:"Music",title:"Official debut with MAY I?",detail:"LYKN makes its music debut with เลิกกับเขาเดี๋ยวเหงาเป็นเพื่อน (MAY I?)."},
  {date:"2023",year:"2023",category:"Music",title:"UMM UMM, NO WORRIES and HUI LAY HUI",detail:"The group's first-year releases continue with UMM UMM, แอบรักไม่ทำให้ใครตาย (NO WORRIES) and the SIZZY collaboration HUI LAY HUI."},
  {date:"2024",year:"2024",category:"Music",title:"A year of collaborations and new singles",detail:"Releases include CHARM with Joong and Pond, TRUST ME, SUGOI, TRICK OR TREAT with Chrrissa and LYKYOU."},
  {date:"2025",year:"2025",category:"Music",title:"ThamePo soundtrack releases",detail:"LYKN contributes songs to Thame-Po: Heart That Skips a Beat, including All I Need, I Know You Want Me, Would You Mind?, Who Says and Fly High."},
  {date:"14 Oct 2025",year:"2025",category:"Music",title:"DUSK & DAWN album",detail:"LYKN releases the DUSK & DAWN album, bringing together earlier singles and new album tracks including Foreground and Feel Like Me."},
  {date:"18–19 Oct 2025",year:"2025",category:"Concert",title:"DUSK & DAWN Concert",detail:"LYKN holds the DUSK & DAWN concert at Impact Arena, Muang Thong Thani."},
  {date:"2026",year:"2026",category:"Music",title:"DUSK & DAWN Japanese Deluxe",detail:"The Japanese deluxe edition expands the album release with additional Japanese versions."},
  {date:"2026",year:"2026",category:"Music",title:"REFLEXION album era",detail:"LYKN enters the REFLEXION era with new music and live activities."},
  {date:"24–25 Oct 2026",year:"2026",category:"Concert",title:"REFLEXION Concert",detail:"The REFLEXION concert is announced for Impact Arena, Muang Thong Thani."},
  {date:"Nov 2026",year:"2026",category:"Music",title:"Always Been",detail:"คงต้องเป็นคนนี้ (Always Been) arrives as a new LYKN music video."},
];
const lyknGroupOverview = {
  pronunciation:"LYKN is pronounced “Lycan”, referencing the ability to transform from everyday boys into fierce stage performers.",
  identity:"A five-member T-Pop boy group under RISER MUSIC, a subsidiary of GMMTV. The members share leadership responsibilities; LYKN has no designated official leader.",
  debut:"5 May 2023",
  debutRelease:"“May I?” / เลิกกับเขาเดี๋ยวเหงาเป็นเพื่อน",
  fandom:"LYKYOU",
  milestones:"Formed through Project Alpha (December 2022–March 2023); portrayed the fictional boy band MARS in ThamePo: Heart That Skips a Beat (2024–2025); released Dusk & Dawn in October 2025 and entered the Reflexion album cycle in 2026."
};
const lyknMemberStories: Record<string,{
  fullName:string;thaiName:string;birthday:string;zodiac:string;height:string;weight?:string;bloodType?:string;
  emoji:string;positions:string;education:string;socials:{instagram?:string;photography?:string;x?:string;tiktok?:string;facebook?:string};birthplace?:string;preLykn:string;
  projectAlpha:string;creative:string;acting:string;favorites:string[];trivia:string[];
}> = {
  NUT:{
    fullName:"Thanat Danjesda",thaiName:"ธนัท ด่านเจษฎา",birthday:"20 April 2003",zodiac:"Taurus",height:"178 cm",weight:"68 kg",bloodType:"A",emoji:"🥜",
    positions:"Lead Dancer · Vocalist · Visual",education:"Faculty of Engineering, Chulalongkorn University",socials:{instagram:"@nnutdan",x:"@nnutdan",tiktok:"@nnutdan"},
    preLykn:"Nut began dancing at around 16–17 and started singing at around 18–19. Before LYKN, he was known as a school idol and performed with the K-pop cover-dance crew Monkey Kiss.",
    projectAlpha:"He began in the top Alpha tier, lost his Alpha badge to challenger Nicky during a confidence slump, then made a comeback in the finale to finish 5th overall and secure his place in LYKN.",
    creative:"Contributes to vocal arrangements and harmonies, creative concept direction and choreography brainstorming for group stages. His 2026 solo single is “เทสดี” (Tasty).",
    acting:"Appeared in LYKN's Halloween short film No Worries (2023) alongside Becky Armstrong and played Junn “Jun” in ThamePo: Heart That Skips a Beat (2024–2025).",
    favorites:["Colour: Blue","Food: Pizza and chocolate","Scents: Vanilla and cocoa/chocolate","Music: Pop and R&B","Films: Superhero films, especially the Iron Man trilogy and Superman","Sport: Soccer","Dream destination: The Grand Canyon"],
    trivia:["Speaks Thai and English and wants to learn Korean","Has an older brother and a Pomeranian named Tui","Sleeps in the starfish position","Often says “That's right”","Afraid of cockroaches, though he says they look cute when they walk"]
  },
  HONG:{
    fullName:"Pichetpong Chiradatesakunvong",thaiName:"พิเชฐพงศ์ จิรเดชสกุลวงศ์",birthday:"16 October 2003",zodiac:"Libra",height:"178 cm",weight:"68 kg",emoji:"🍦",
    positions:"Main Rapper · Lead Dancer · Sub-Vocalist",education:"Arts and Science in Integrated Innovation (BAScii), Chulalongkorn University",socials:{instagram:"@hongshihoshi",photography:"@introduction2youth",x:"@hongshihoshi03",tiktok:"@hongshihoshi"},
    preLykn:"Hong began dancing in 8th grade and competed in K-pop cover-dance groups, notably TNT. He began formal vocal training in November 2022, around the start of Project Alpha.",
    projectAlpha:"He stood out as a charismatic rap and hip-hop specialist, bringing his distinctive humour to the competition and finishing 4th overall.",
    creative:"A primary rap lyricist for LYKN, writing and structuring his own verses and co-writing rap sections across singles, Dusk & Dawn and Reflexion. His 2026 solo single is “ถูกสเปก” (Let's Go).",
    acting:"Played Dylan Zhou in ThamePo: Heart That Skips a Beat (2024–2025).",
    favorites:["Colours: Orange and pink","Food: Italian food, cheese and ice cream","Music: K-indie, K-R&B and J-pop","Sport: Soccer; plays left wing","Role model: IU"],
    trivia:["Thai-Chinese heritage; speaks Thai and English","Has a younger sibling","Wants a pet platypus because of Phineas and Ferb","Sleeps on his left side and tends to overthink","Often says “quite”","Dislikes the sound and feeling of fingernails scratching paper","Wants to learn Japanese so he can enjoy anime without subtitles"]
  },
  TUI:{
    fullName:"Chayatorn Trairattanapradit",thaiName:"ชยธร ไตรรัตนประดิษฐ์",birthday:"24 March 2004",zodiac:"Aries",height:"175 cm",weight:"65 kg",emoji:"🥓",
    positions:"Lead Vocalist · Lead Rapper · All-Rounder · Producer/Arranger",education:"College of Social Communication Innovation (Acting & Directing for Film), Srinakharinwirot University",socials:{instagram:"@m.tuiiii",x:"@TuiChayatorn",tiktok:"@m.tuiiii"},
    preLykn:"Tui began singing at around 6–7 and dancing at around 15. Before Project Alpha, he focused on vocal-group competitions and practised cover dancing independently without a permanent crew. He is also skilled at beatboxing, drums and music production.",
    projectAlpha:"A dark horse in the competition, he landed in the losing team twice early on and survived through audience votes. He surged in the second half, took an Alpha spot from Fluke and finished 3rd overall.",
    creative:"A core musical producer and creative contributor: songwriter, composer, arranger and co-producer across Dusk & Dawn (2025) and Reflexion (2026). His 2026 solo single is “ปล่อยใจ” (Bloom). He also assisted executive Kangsomks in producing Win Metawin's “Night Ride”.",
    acting:"Played Pavee “Pepper” Warisphol in ThamePo: Heart That Skips a Beat (2024–2025) and sang the OST “ไม่ใช่บังเอิญ” (Destined).",
    favorites:["Colour: Orange","Food: Korean cuisine","Music: Pop, hip-hop and R&B","Films: Superhero battles, kaiju and Ultraman","Sports: Soccer and snooker","Role models: GOT7","Dream home: A house in the mountains"],
    trivia:["Only child","Wants two turtles named Miso and Enso","Very talkative and dislikes quiet atmospheres when with friends","Collects Pokémon cards","Jokes that he wants to learn the Saiyan language","Favourite feature on himself is his eyes","Sleeps on his stomach with his left arm resting on something","Afraid of heights, darkness, ghosts, spiders and people leaving him"]
  },
  WILLIAM:{
    fullName:"Jakrapatr Kaewpanpong",thaiName:"จักรภัทร แก้วพันธุ์พงษ์",birthday:"14 February 2005",zodiac:"Aquarius",height:"178 cm",weight:"65 kg",emoji:"🎸",
    positions:"Main Vocalist",education:"College of Music (Music Theatre Department), Mahidol University",socials:{instagram:"@williamjkp",x:"@Williamjkp1",tiktok:"@jkpwilliam"},birthplace:"Hat Yai, Southern Thailand",
    preLykn:"William grew up in Hat Yai and speaks with a Southern Thai dialect. He began singing at around 13–14, plays piano and guitar, and was lead vocalist for high-school and street bands including Lost & Found, Dolphin and Broccoli. He auditioned remotely after a recommendation from his school's music head. He began dancing at around 17.",
    projectAlpha:"He dominated the vocal rankings throughout the season, finished 1st overall and earned the special title “King of Alpha”.",
    creative:"Draws on his musical-theatre background and piano and guitar skills to contribute to vocal arrangements, melody writing and acoustic/live-session arrangements. His 2026 solo single is “จำได้ว่าลืม” (Flashback).",
    acting:"Sang the OSTs “ภาพสุดท้าย” (Last Twilight) and “5CM”. Starred as Teema “Thame” in ThamePo: Heart That Skips a Beat (2024–2025), Rome in Me and Thee (2025) and Dean in You Maniac (2026).",
    favorites:["Colours: Blue and black","Food: Som tam, grilled pork jowl (kor moo yang) and grilled pork breast (nom moo yang)","Scents: Clean, sporty scents","Music: Emo, pop-rock and R&B","Films: Romance and love stories; 18 Again is a favourite","Sport: Taekwondo; black belt","Dream destination: The mountains","Would like to adopt a Golden Retriever"],
    trivia:["Childhood dream was to become an astronaut","Often says “Like... It was like...”","Sleeps lying down with one leg crossed over the other"]
  },
  LEGO:{
    fullName:"Rapeepong Supatineekitdecha",thaiName:"รพีพงศ์ ศุภธินีกิตติ์เดชา",birthday:"11 February 2006",zodiac:"Aquarius",height:"Approximately 167–170 cm",weight:"Approximately 50–56 kg",bloodType:"B",emoji:"🐱",
    positions:"Main Dancer · Center · Sub-Vocalist · Maknae (youngest)",education:"Not supplied in this profile",socials:{instagram:"@le_tsgo_eating",x:"@realxlg",tiktok:"@lgeat",facebook:"Lego Rapeepong (rapeepong.supatineekitdecha)"},birthplace:"Nakhon Ratchasima (Korat), Thailand",
    preLykn:"Lego began dancing at age 4; his first performance was to Wonder Girls' “Nobody” at his aunt's wedding. He competed in swimming during elementary school and began singing at 13. Before joining GMMTV, he was an idol in the co-ed/teen group 1stKidz under Bstars Music (active 2019–2021; debuted January 2020).",
    projectAlpha:"He stood out as a technical dance prodigy and fan favourite for sharp choreography and stage presence, finishing 2nd overall.",
    creative:"Takes part in choreography creation, dance-break arrangement and stage-performance direction. He also contributed lyrics and creative concept styling to his solo debut “ไม่รวยไม่คุย” (Rich), released in October 2026.",
    acting:"Played Napassakorn “Nano” in ThamePo: Heart That Skips a Beat (2024–2025) and had a main role in Mu-Te-Luv.",
    favorites:["Colours: Yellow and pastel pink","Food: Says he enjoys anything delicious; dislikes cheese and egg yolk","Scents: Cool, relaxing and fresh scents such as mint","Music: Pop and R&B","Films: Dramatic and mysterious films; can rewatch the Thai animated classic Khan Kluay","Role models: NCT, especially Jaehyun, Doyoung, Renjun and Jaemin"],
    trivia:["Has an older sister","Wanted to be a stuntman as a child","Afraid of snakes but still wants one as a pet","Often uses the word “too”","Can roll his tongue and do standing somersaults"]
  }
};
function UniversePage({ setNotice, archive = false }: { setNotice: (message: string) => void; archive?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isStaff } = useStaffRole();
  const [items,setItems] = useState<any[]>([]);
  const [selectedMember,setSelectedMember] = useState<string|null>(() => {
    const requested = new URLSearchParams(location.search).get("member")?.toUpperCase();
    return ["WILLIAM","LEGO","NUT","HONG","TUI"].includes(requested||"") ? (requested ?? null) : null;
  });
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("member")?.toUpperCase();
    if (["WILLIAM","LEGO","NUT","HONG","TUI"].includes(requested||"")) {
      setSelectedMember(requested!);
    }
  }, [location.search]);
  const [playingVideo,setPlayingVideo] = useState<string|null>(null);
  const [videoYear,setVideoYear] = useState("All");
  const [timelineYear,setTimelineYear] = useState("All");
  const [loading,setLoading] = useState(true);
  const [type,setType] = useState("member");
  const [member,setMember] = useState("WILLIAM");
  const [title,setTitle] = useState("");
  const [description,setDescription] = useState("");
  const [eventDate,setEventDate] = useState("");
  const [source,setSource] = useState("");
  const [imageFile,setImageFile] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [editingId,setEditingId] = useState<string|null>(null);
  const load = useCallback(async()=>{
    if(!supabase){setLoading(false);return;}
    const {data,error}=await supabase.from("lykn_universe_content").select("*").order("event_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false}).limit(200);
    if(error)setNotice("LYKN Universe content could not load: "+error.message);
    setItems(data??[]);setLoading(false);
  },[]);
  useEffect(()=>{void load();},[load]);
  async function publish(event:FormEvent, contentType=type){
    event.preventDefault();
    if(!user||!supabase||!isStaff)return;
    if(source.trim()){try{new URL(source.trim())}catch{setNotice("Enter a valid source URL.");return;}}
    setBusy(true);
    let uploadedPath:string|null=null;
    try{
      let imageUrl:string|null=null;
      let existingMember:any=null;
      let existingEntry:any=null;
      if(editingId){
        const {data,error:entryError}=await supabase.from("lykn_universe_content").select("id,image_url,title,description,source_url,event_date").eq("id",editingId).maybeSingle();
        if(entryError)throw entryError;
        existingEntry=data;
        if(!existingEntry)throw new Error("This entry no longer exists. Refresh the page and try again.");
      }
      if(contentType==="member" && member!=="LYKN"){
        const {data,error:lookupError}=await supabase.from("lykn_universe_content").select("id,image_url,title,description,source_url,event_date").eq("content_type","member").eq("member_name",member).maybeSingle();
        if(lookupError)throw lookupError;
        existingMember=data;
      }
      if(imageFile){
        if(!["image/jpeg","image/png","image/webp"].includes(imageFile.type)||imageFile.size>3*1024*1024)throw new Error("Choose a JPG, PNG or WebP image under 3 MB.");
        const ext=imageFile.type==="image/png"?"png":imageFile.type==="image/webp"?"webp":"jpg";
        uploadedPath="universe/"+user.id+"/"+Date.now()+"."+ext;
        const {error:uploadError}=await supabase.storage.from("space-media").upload(uploadedPath,imageFile,{contentType:imageFile.type,upsert:false});
        if(uploadError)throw uploadError;
        imageUrl=supabase.storage.from("space-media").getPublicUrl(uploadedPath).data.publicUrl;
      }
      const preserved=existingEntry||existingMember;
      const payload:any={content_type:contentType,member_name:member,title:title.trim()||preserved?.title||member,description:description.trim()||preserved?.description||"",event_date:eventDate||preserved?.event_date||null,source_url:source.trim()||preserved?.source_url||null,created_by:user.id};
      if(imageUrl)payload.image_url=imageUrl;
      let saveError:any=null;
      if(editingId){
        payload.image_url=imageUrl||existingEntry?.image_url||null;
        const result=await supabase.from("lykn_universe_content").update(payload).eq("id",editingId);
        saveError=result.error;
      }else if(contentType==="member" && member!=="LYKN" && existingMember){
        const result=await supabase.from("lykn_universe_content").update(payload).eq("id",existingMember.id);
        saveError=result.error;
      }else{
        payload.image_url=imageUrl;
        const result=await supabase.from("lykn_universe_content").insert(payload);
        saveError=result.error;
      }
      if(saveError)throw saveError;
      const previousImageUrl=existingEntry?.image_url||existingMember?.image_url;
      if(imageUrl && previousImageUrl){
        const marker="/storage/v1/object/public/space-media/";
        const oldPath=previousImageUrl.includes(marker)?decodeURIComponent(previousImageUrl.split(marker)[1].split("?")[0]):"";
        if(oldPath.startsWith("universe/") && oldPath!==uploadedPath)await supabase.storage.from("space-media").remove([oldPath]);
      }
      setTitle("");setDescription("");setEventDate("");setSource("");setImageFile(null);setEditingId(null);setNotice(contentType==="member"?"Member hub updated.":editingId?"LYKN Universe entry updated.":"LYKN Universe entry published.");await load();
    }catch(e){
      if(uploadedPath)await supabase.storage.from("space-media").remove([uploadedPath]);
      setNotice(e instanceof Error?e.message:"The entry could not be published.");
    }
    finally{setBusy(false);}
  }
  function editItem(item:any){
    setEditingId(item.id);setType(item.content_type);setMember(item.member_name||"LYKN");
    setTitle(item.title||"");setDescription(item.description||"");
    setEventDate(item.event_date||"");setSource(item.source_url||"");setImageFile(null);
    document.querySelector(".universe-publish")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function removeItem(id:string){
    if(!supabase||!isStaff||!window.confirm("Remove this LYKN Universe entry?"))return;
    const item=items.find(x=>x.id===id);
    const {error}=await supabase.from("lykn_universe_content").delete().eq("id",id);
    if(error)setNotice(error.message);else{
      if(item?.image_url){
        const marker="/storage/v1/object/public/space-media/";
        const path=item.image_url.includes(marker)?decodeURIComponent(item.image_url.split(marker)[1].split("?")[0]):"";
        if(path.startsWith("universe/"))await supabase.storage.from("space-media").remove([path]);
      }
      setItems(v=>v.filter(x=>x.id!==id));setNotice("Entry removed.");
    }
  }
  const byType=(key:string)=>items.filter(x=>x.content_type===key);
  const memberRows=byType("member");
  const names=["WILLIAM","LEGO","NUT","HONG","TUI"];
  const selected=names.find(n=>n===selectedMember);
  const renderCards=(rows:any[])=>rows.length?<div className="universe-content-grid">{rows.map(item=><article className="universe-content-card" key={item.id}>{item.image_url&&<img src={item.image_url} alt="" loading="lazy"/>}<div><span className="eyebrow">{item.member_name||item.content_type.replace("_"," ")}</span><h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}{item.event_date&&<small>{new Date(item.event_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</small>}{item.source_url&&<span className="schedule-source-credit">Source credit recorded</span>}{isStaff&&<div className="universe-entry-actions"><button className="text-link" onClick={()=>editItem(item)}>Edit entry</button><button className="text-link" onClick={()=>void removeItem(item.id)}>Remove entry</button></div>}</div></article>)}</div>:<div className="universe-empty">No entries published here yet.{isStaff?" Use the publishing panel below to add verified content.":" Check back as the fan-curated archive grows."}</div>;
  return <>
    {archive ? <section className="universe-banner archive-banner"><img className="universe-banner-group-photo" src="/images/lykn-group-hero.webp" alt="LYKN group" /><div className="universe-stars">✦　✧　·　✦</div><div className="eyebrow">THE MUSIC · THE MOMENTS · THE MILESTONES</div><h2>LYKN Archive</h2><p>The complete fan-curated collection of LYKN songs, music videos, releases, performances, projects and milestones.</p><span className="universe-disclaimer">THE COMPLETE LYKN COLLECTION</span></section> : <>
    <SectionHeading eyebrow="FIVE MEMBERS. ONE UNIVERSE." title="Meet LYKN" note="Explore the group, the members and what makes LYKN special."/>
    {isStaff&&<section className="universe-member-manager"><div className="universe-manager-copy"><span className="eyebrow">STAFF · QUICK UPDATE</span><h3>Member photo manager</h3><p>Choose the correct member, select their portrait and save it here. This updates the matching LYKN Universe member card without using a group-photo crop.</p></div><form onSubmit={(event)=>{setTitle(member);void publish(event,"member");}}><label>Member<select value={member} onChange={(event)=>{setMember(event.target.value);setTitle(event.target.value);}}><option value="WILLIAM">WILLIAM</option><option value="LEGO">LEGO</option><option value="NUT">NUT</option><option value="HONG">HONG</option><option value="TUI">TUI</option></select></label><label className="universe-image-input">Portrait image (JPG, PNG or WebP · max 3 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>setImageFile(event.target.files?.[0]||null)} /></label><button className="button-primary" type="submit" disabled={busy||!imageFile}>{busy?"Uploading…":"Upload member photo"}</button><small>{memberRows.find((row:any)=>row.member_name===member)?.image_url?"A portrait is currently saved for "+member+". Uploading replaces it.":"No portrait has been uploaded for "+member+" yet."}</small></form></section>}
    <section className="universe-banner"><img className="universe-banner-group-photo" src="/images/lykn-group-hero.webp" alt="LYKN group" /><div className="universe-stars">✦　✧　·　✦</div><div className="eyebrow">THE LYKN UNIVERSE</div><h2>Five stars.<br/><em>One constellation.</em></h2><p>A fan-made space to celebrate LYKN's music, performances, milestones and memories.</p><span className="universe-disclaimer">UNOFFICIAL FAN-CURATED HUB</span></section>
    <section className="lykn-group-overview"><div><span className="eyebrow">ABOUT THE GROUP</span><h3>LYKN <span>(ไลแคน)</span></h3><p>{lyknGroupOverview.identity}</p><p>{lyknGroupOverview.pronunciation}</p></div><div className="lykn-overview-facts"><div><small>DEBUT</small><strong>{lyknGroupOverview.debut}</strong><span>{lyknGroupOverview.debutRelease}</span></div><div><small>FANDOM</small><strong>{lyknGroupOverview.fandom}</strong></div><div><small>LEADERSHIP</small><strong>Shared by all five members</strong><span>No official leader</span></div></div><div className="lykn-group-milestones"><small>GROUP MILESTONES</small><p>{lyknGroupOverview.milestones}</p></div></section>
    <section className="lykn-official-socials"><div><span className="eyebrow">OFFICIAL GROUP CHANNELS</span><h3>Follow LYKN</h3></div><div><span><b>Instagram</b>@lykn_official</span><span><b>X</b>@LYKNofficial</span><span><b>TikTok</b>@lyknofficial</span><span><b>Facebook</b>LYKN</span></div></section>
    <SectionHeading eyebrow="GET TO KNOW THEM" title="Meet the members" note="Choose a member to explore their fan hub."/>
    <div className="member-grid">{names.map((name,i)=>{const row=memberRows.find(x=>x.member_name===name);return <button className={"member-card member-"+["lavender","mint","pink","blue","orange"][i]} key={name} onClick={()=>setSelectedMember(selectedMember===name?null:name)}><div className="member-glow"/>{row?.image_url?<img className="member-photo" src={row.image_url} alt={name}/>:<div className="member-avatar" aria-label={name+" portrait not yet uploaded"}>{name.charAt(0)}</div>}<div className="member-number">0{i+1} / 05</div><h3>{name}</h3><p>LYKN member</p><span>{selectedMember===name?"Close member hub":"Explore member hub"} <ArrowRight size={14}/></span></button>})}</div><p className="source-note">Individual official portraits will appear here when uploaded by staff. No cropped group-photo substitutes are used.</p>
    {selected&&<section className={"member-spotlight spotlight-"+selected.toLowerCase()}>{memberRows.find(x=>x.member_name===selected)?.image_url?<img className="member-spotlight-photo" src={memberRows.find(x=>x.member_name===selected)?.image_url} alt={selected+" official portrait"}/>:<div className="member-spotlight-photo member-spotlight-placeholder" role="img" aria-label={selected+" portrait not yet uploaded"}>{selected.charAt(0)}</div>}<div className="member-spotlight-copy"><div className="eyebrow">MEMBER FAN HUB · PROJECT ALPHA TO LYKN</div><h3>{selected}</h3><h4>{lyknMemberStories[selected].fullName}</h4><div className="member-profile-kicker"><span>{lyknMemberStories[selected].positions}</span></div><div className="member-fact-strip"><div><small>BIRTHDAY</small><strong>{lyknMemberStories[selected].birthday}</strong></div><div><small>ZODIAC</small><strong>{lyknMemberStories[selected].zodiac}</strong></div></div><div className="member-emoji-card"><strong>{lyknMemberStories[selected].emoji}</strong><div><small>REPRESENTATIVE EMOJI</small><span>{selected} · The member emoji</span></div></div><article className="member-project-alpha"><span className="eyebrow">PROJECT ALPHA</span><p>{lyknMemberStories[selected].projectAlpha}</p></article><div className="member-profile-facts"><div><small>THAI NAME</small><strong>{lyknMemberStories[selected].thaiName}</strong></div><div><small>HEIGHT / WEIGHT</small><strong>{lyknMemberStories[selected].height}{lyknMemberStories[selected].weight?" · "+lyknMemberStories[selected].weight:""}</strong></div><div><small>EDUCATION</small><strong>{lyknMemberStories[selected].education}</strong></div>{lyknMemberStories[selected].birthplace&&<div><small>BIRTHPLACE</small><strong>{lyknMemberStories[selected].birthplace}</strong></div>}{lyknMemberStories[selected].bloodType&&<div><small>BLOOD TYPE</small><strong>{lyknMemberStories[selected].bloodType}</strong></div>}</div><section className="member-socials"><h4>Official social media</h4>{Object.entries(lyknMemberStories[selected].socials).filter(([,handle])=>!!handle).map(([network,handle])=><div key={network}><b>{network==="photography"?"Instagram · Photography":network.charAt(0).toUpperCase()+network.slice(1)}</b><span>{handle}</span></div>)}</section><div className="member-story-grid"><article><span className="eyebrow">BEFORE LYKN</span><p>{lyknMemberStories[selected].preLykn}</p></article><article><span className="eyebrow">PROJECT ALPHA JOURNEY</span><p>{lyknMemberStories[selected].projectAlpha}</p></article><article><span className="eyebrow">MUSICAL & CREATIVE CONTRIBUTIONS</span><p>{lyknMemberStories[selected].creative}</p></article><article><span className="eyebrow">ACTING & OSTs</span><p>{lyknMemberStories[selected].acting}</p></article><article className="member-favourites"><span className="eyebrow">FAVOURITES</span><ul>{lyknMemberStories[selected].favorites.map((item)=><li key={item}>{item}</li>)}</ul></article><article className="member-trivia"><span className="eyebrow">PERSONAL TRIVIA</span><ul>{lyknMemberStories[selected].trivia.map((item)=><li key={item}>{item}</li>)}</ul></article></div><p className="member-profile-note">Profile information supplied by LYKN India Fanclub. Social handles and other details are shown only where supplied for this profile.</p><button className="button-primary" onClick={()=>navigate("/updates?member="+selected)}>View {selected}'s schedule <ArrowRight size={14}/></button></div></section>}
        <section className="universe-archive-card"><div><span className="eyebrow">KEEP EXPLORING</span><h3>The LYKN Archive</h3><p>Music videos, discography, songs, YouTube links, performances, solo projects, achievements and the full timeline — all in one place.</p></div><button className="button-primary" onClick={()=>navigate("/lykn-archive")}>Explore the archive <ArrowRight size={15}/></button></section>
    </>}
    {archive && <>
    <SectionHeading eyebrow="THE MUSIC" title="Music videos" note="Watch official LYKN releases here without leaving LYKYOU Space."/>
    <div className="music-year-filters">{["All","2023","2024","2025","2026"].map(year=><button key={year} className={videoYear===year?"active":""} onClick={()=>setVideoYear(year)}>{year}</button>)}</div>
    <div className="music-video-grid">{verifiedMusicVideos.filter(video=>videoYear==="All"||video.year===videoYear).map(video=><article className="music-video-card" key={video.id}><button className="music-video-thumb" onClick={()=>setPlayingVideo(playingVideo===video.id?null:video.id)} aria-label={"Play "+video.title}>{playingVideo===video.id?<iframe src={"https://www.youtube-nocookie.com/embed/"+video.id+"?autoplay=1"} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<><img src={"https://img.youtube.com/vi/"+video.id+"/hqdefault.jpg"} alt="" loading="lazy"/><span className="music-play">▶</span></>}</button><div className="music-video-copy"><span className="eyebrow">{video.year} · OFFICIAL VIDEO</span><h3>{video.title}</h3></div></article>)}</div>
    <SectionHeading eyebrow="MEMBER SOLO RELEASES" title="Five members. Five solo sounds." note="Official solo music videos, linked directly to the LYKN YouTube channel."/>
    <div className="music-video-grid">{verifiedSoloSongs.map(song=><article className="music-video-card" key={song.id}><button className="music-video-thumb" onClick={()=>setPlayingVideo(playingVideo===song.id?null:song.id)} aria-label={"Play "+song.title}>{playingVideo===song.id?<iframe src={"https://www.youtube-nocookie.com/embed/"+song.id+"?autoplay=1"} title={song.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<><img src={"https://img.youtube.com/vi/"+song.id+"/hqdefault.jpg"} alt="" loading="lazy"/><span className="music-play">▶</span></>}</button><div className="music-video-copy"><span className="eyebrow">{song.artist} · {song.year} · SOLO</span><h3>{song.title}</h3></div></article>)}</div>
    <SectionHeading eyebrow="DUETS & COLLABORATIONS" title="Together on one track" note="Official group collaborations and special-feature releases, with direct YouTube links."/>
    <div className="music-video-grid">{verifiedDuets.map(song=><article className="music-video-card" key={song.id}><button className="music-video-thumb" onClick={()=>setPlayingVideo(playingVideo===song.id?null:song.id)} aria-label={"Play "+song.title}>{playingVideo===song.id?<iframe src={"https://www.youtube-nocookie.com/embed/"+song.id+"?autoplay=1"} title={song.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<><img src={"https://img.youtube.com/vi/"+song.id+"/hqdefault.jpg"} alt="" loading="lazy"/><span className="music-play">▶</span></>}</button><div className="music-video-copy"><span className="eyebrow">COLLABORATION</span><h3>{song.title}</h3><p>{song.detail}</p></div></article>)}</div>
    <SectionHeading eyebrow="ORIGINAL SOUNDTRACKS" title="Songs for the stories" note="LYKN's ThamePo soundtrack tracks, linked to official music uploads."/>
    <div className="music-video-grid archive-ost-grid">{verifiedOsts.map(song=><article className="music-video-card" key={song.id}><button className="music-video-thumb" onClick={()=>setPlayingVideo(playingVideo===song.id?null:song.id)} aria-label={"Play "+song.title}>{playingVideo===song.id?<iframe src={"https://www.youtube-nocookie.com/embed/"+song.id+"?autoplay=1"} title={song.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<><img src={"https://img.youtube.com/vi/"+song.id+"/hqdefault.jpg"} alt="" loading="lazy"/><span className="music-play">▶</span></>}</button><div className="music-video-copy"><span className="eyebrow">{song.year} · THAMEPO OST</span><h3>{song.title}</h3></div></article>)}</div>
    {byType("release").length>0&&<div className="universe-database-releases">{renderCards(byType("release"))}</div>}
    <SectionHeading eyebrow="ALBUMS & RELEASES" title="Discography" note="Albums and editions are listed separately from music videos."/>
    <div className="release-album-grid">{releaseAlbums.map(album=><article className="release-album-card" key={album.title}><span className="eyebrow">{album.year} · ALBUM</span><h3>{album.title}</h3><p>{album.detail}</p></article>)}</div>
    <SectionHeading eyebrow="LIVE & ON STAGE" title="Performances" note="Official live sessions, dance performances and special stages, playable here."/>
    <div className="music-video-grid">{verifiedPerformances.map(video=><article className="music-video-card" key={video.id}><button className="music-video-thumb" onClick={()=>setPlayingVideo(playingVideo===video.id?null:video.id)} aria-label={"Play "+video.title}>{playingVideo===video.id?<iframe src={"https://www.youtube-nocookie.com/embed/"+video.id+"?autoplay=1"} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<><img src={"https://img.youtube.com/vi/"+video.id+"/hqdefault.jpg"} alt="" loading="lazy"/><span className="music-play">▶</span></>}</button><div className="music-video-copy"><span className="eyebrow">{video.date} · {video.label}</span><h3>{video.title}</h3></div></article>)}</div>
    {byType("performance").length>0&&<><SectionHeading eyebrow="MEMBER & SUB-UNIT SPOTLIGHTS" title="Duets, covers & special stages" note="Live pairings and sub-unit performances are kept separate from official studio releases." />{renderCards(byType("performance"))}</>}
    {byType("solo_release").length>0&&<><SectionHeading eyebrow="MEMBER SOLO MUSIC" title="Their own sound" note="Solo releases are filed under the member who released them. Add verified links and credits in Admin Content Studio."/><div className="universe-project-filters">{names.map(name=><button key={name} className={selectedMember===name?"active":""} onClick={()=>setSelectedMember(selectedMember===name?null:name)}>{name}</button>)}<button onClick={()=>setSelectedMember(null)}>All members</button></div>{renderCards(byType("solo_release").filter(item=>!selectedMember||item.member_name===selectedMember))}</>}
    {byType("collaboration").length>0&&<><SectionHeading eyebrow="DUETS & SPECIAL COLLABORATIONS" title="Together, in every combination" note="Includes member collaborations and duets such as WilliamEst. Each entry should identify all artists in its title or description." />{renderCards(byType("collaboration"))}</>}
    {["ost","acting_project","brand_project","variety","other_project"].some(key=>byType(key).length>0)&&<><SectionHeading eyebrow="BEYOND THE GROUP" title="Solo careers & other projects" note="Acting, OSTs, brand campaigns, variety appearances and other verified member projects."/><div className="universe-project-sections">{[["ost","OSTs & soundtracks"],["acting_project","Acting, series & films"],["brand_project","Brand & fashion projects"],["variety","Variety & guest appearances"],["other_project","Other projects"]].map(([key,label])=>byType(key).length>0?<section key={key}><h3>{label}</h3>{renderCards(byType(key))}</section>:null)}</div></>}
    <SectionHeading eyebrow="MILESTONES" title="LYKN timeline" note="Explore the group's formation, releases and live milestones by year."/>
    <div className="music-year-filters">{["All","2022","2023","2024","2025","2026"].map(year=><button key={year} className={timelineYear===year?"active":""} onClick={()=>setTimelineYear(year)}>{year}</button>)}</div>
    <div className="lykn-timeline">{timelineMilestones.filter(item=>timelineYear==="All"||item.year===timelineYear).map((item,index)=><article className="lykn-timeline-item" key={item.title}><div className="timeline-marker">{index+1}</div><div><span className="eyebrow">{item.date} · {item.category}</span><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}</div>
    {byType("timeline").length>0&&<div className="timeline-community-entries"><SectionHeading eyebrow="COMMUNITY ARCHIVE" title="Additional verified milestones"/>{renderCards(byType("timeline"))}</div>}
    <SectionHeading eyebrow="CELEBRATING THE JOURNEY" title="Achievements & milestones" note="A sourced overview of LYKN's group and individual milestones. Award titles and partnership roles are stated as reported by the linked sources."/>
    <div className="achievement-group-grid">
      <section className="achievement-group"><span className="eyebrow">01 · AWARDS & RECOGNITION</span><h3>Major awards & nominations</h3>
        <article><b>2024 · 20th Kom Chad Luek Awards</b><p>Best New Artist (T-Pop) — Winner. LYKN also received a nomination in the Best T-Pop Artist category.</p><a href="https://cha-pop.com/2024/05/29/winners-of-the-kom-chad-luek-awards-2024/" target="_blank" rel="noreferrer">Award results ↗</a></article>
        <article><b>2024 · FEED Y Awards</b><p>Popular Thai Pop Artists — Winner.</p><a href="https://newikis.com/en/LYKN" target="_blank" rel="noreferrer">Awards record ↗</a></article>
        <article><b>2025 · Thailand Music Awards</b><p>Best Artist: Male Duo / Group — Winner, recognising the 2024 T-Pop year.</p><a href="https://newikis.com/en/LYKN" target="_blank" rel="noreferrer">Awards record ↗</a></article>
        <article><b>2025 · The Guitar Mag Awards</b><p>Best Boy Group of the Year — Winner.</p><a href="https://newikis.com/en/LYKN" target="_blank" rel="noreferrer">Awards record ↗</a></article>
        <article><b>2025 · HOWE Awards</b><p>Hottest Artist Award — Winner.</p><a href="https://newikis.com/en/LYKN" target="_blank" rel="noreferrer">Awards record ↗</a></article>
        <article><b>2025 · 30th Asian Television Awards</b><p>Best Music Video — Winner for “โฮ่ง! (SUGOI)”.</p><a href="https://newikis.com/en/LYKN" target="_blank" rel="noreferrer">Awards record ↗</a></article>
        <article><b>2026 · 22nd Kom Chad Luek Awards</b><p>Best Male T-Pop Group — joint winner with ATLAS.</p><a href="https://cha-pop.com/2026/05/27/kom-chad-luek-awards-2026-atlas-and-lykn-both-named-best-male-t-pop-artiste/" target="_blank" rel="noreferrer">Award results ↗</a></article>
      </section>
      <section className="achievement-group"><span className="eyebrow">02 · MUSIC & RELEASES</span><h3>Music, chart & streaming milestones</h3>
        <article><b>5 May 2023 · Official debut</b><p>LYKN debuted with “เลิกกับเขาเดี๋ยวเหงาเป็นเพื่อน (MAY I?)”, beginning the group's official music-release journey.</p></article>
        <article><b>2023 · “NO WORRIES”</b><p>“แอบรักไม่ทำให้ใครตาย (NO WORRIES)” became an early signature release and helped establish LYKN's identity as a T-Pop group.</p></article>
        <article><b>2024 · Collaboration & performance era</b><p>Releases included “ฉ่ำ (CHARM)” with Joong and Pond, “ความรักไม่ได้น่ากลัวขนาดนั้น (TRUST ME)”, “โฮ่ง! (SUGOI)”, “หยอกไม่หลอก (TRICK OR TREAT)” and “LYKYOU”.</p></article>
        <article><b>October 2025 · DUSK & DAWN</b><p>LYKN released its debut studio album, DUSK & DAWN, expanding the group's catalogue beyond its earlier singles and soundtrack releases.</p></article>
        <article><b>2026 · REFLEXION era</b><p>The group moved into the REFLEXION era alongside new group and member releases. Individual releases are listed separately in the music archive.</p></article>
      </section>
      <section className="achievement-group"><span className="eyebrow">03 · CONCERTS & LIVE STAGES</span><h3>Concerts, tours & stage landmarks</h3>
        <article><b>21 September 2024 · LYKN UNLEASHED CONCERT</b><p>LYKN's first solo concert took place at Thunder Dome, Muang Thong Thani, Thailand.</p><a href="https://newikis.com/en/LYKN" target="_blank" rel="noreferrer">Concert history ↗</a></article>
        <article><b>2025 · LYKN UNLEASHED tour</b><p>The tour expanded the group's live stages beyond Thailand, with stops including Jakarta, Tokyo, Singapore, Phnom Penh, Taipei, Macau, Ho Chi Minh City, Bengaluru, Delhi and Manila.</p><a href="https://en.wikipedia.org/wiki/LYKN" target="_blank" rel="noreferrer">Tour dates ↗</a></article>
        <article><b>18–19 October 2025 · DUSK & DAWN CONCERT</b><p>A major two-day concert at Impact Arena, Muang Thong Thani, Thailand.</p><a href="https://newikis.com/en/LYKN" target="_blank" rel="noreferrer">Concert history ↗</a></article>
        <article><b>2026 · DUSK & DAWN WORLD TOUR</b><p>The group's touring activity continued internationally through 2026, bringing the DUSK & DAWN era to audiences across multiple regions.</p><a href="https://en.wikipedia.org/wiki/LYKN" target="_blank" rel="noreferrer">Tour dates ↗</a></article>
      </section>
      <section className="achievement-group"><span className="eyebrow">04 · ACTING & CROSSOVER</span><h3>Acting, OSTs & screen milestones</h3>
        <article><b>2024–2025 · ThamePo: Heart That Skips a Beat</b><p>The five members portrayed the fictional idol group MARS in the GMMTV series ThamePo: Heart That Skips a Beat. The series also connected LYKN's music catalogue with original soundtrack releases and live promotional stages.</p></article>
      </section>
      <section className="achievement-group achievement-brands"><span className="eyebrow">05 · BRAND COLLABORATIONS</span><h3>Group & individual partnerships</h3>
        <p className="achievement-note">This list distinguishes official presenter / ambassador appointments from event appearances and brand friendships. It includes only partnerships with a traceable public announcement.</p>
        <article><b>LYKN · Friend of LANEIGE</b><p>The group joined LANEIGE Thailand's “24/7: From Day To Night” event in September 2025 as Friends of LANEIGE.</p><a href="https://www.bangkokfocusnews.com/2025/10/LaneigeFromDayToNight.html" target="_blank" rel="noreferrer">Event coverage ↗</a></article>
        <article><b>LYKN · Smooto presenters</b><p>In April 2026, all five members were announced as presenters for Smooto's Insta Glam Flash Tint Lip campaign.</p><a href="https://www.planbmedia.co.th/th/insight/smooto-x-lykn-%E0%B8%9B%E0%B8%B2%E0%B8%81%E0%B8%89%E0%B9%88%E0%B8%B3%E0%B8%97%E0%B8%B0%E0%B8%A5%E0%B8%B8%E0%B8%88%E0%B8%AD%E0%B8%B2%E0%B8%99%E0%B8%99%E0%B8%AD%E0%B8%81%E0%B9%80%E0%B8%8A%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%A1-offline-to-online-%E0%B9%80%E0%B8%88%E0%B8%B2%E0%B8%B0%E0%B8%AD%E0%B8%B4%E0%B8%99%E0%B9%84%E0%B8%8B%E0%B8%95%E0%B9%8C%E0%B8%81%E0%B8%A5%E0%B8%B8%E0%B9%88%E0%B8%A1%E0%B9%81%E0%B8%9F%E0%B8%99%E0%B8%84%E0%B8%A5%E0%B8%B1%E0%B8%9A/" target="_blank" rel="noreferrer">Campaign coverage ↗</a></article>
        <article><b>LYKN · Makro presenters</b><p>The group was announced as Makro's presenter group for its 37th anniversary campaign.</p><a href="https://entertainment.trueid.net/detail/Ezg60rPX6EYM" target="_blank" rel="noreferrer">Campaign coverage ↗</a></article>
        <article><b>HONG · MELA presenter</b><p>HONG was announced as a presenter for MELA Toner Pad in November 2026.</p><a href="https://www.sotwe.com/LYKNid" target="_blank" rel="noreferrer">Announcement repost ↗</a></article>
        <article><b>WILLIAM · vivo Stage Ambassador</b><p>WILLIAM was announced as vivo Stage Ambassador for the vivo X500 Series in November 2026.</p><a href="https://www.sotwe.com/hashtag/LYKN_Schedule" target="_blank" rel="noreferrer">Announcement repost ↗</a></article>
      </section>
    </div>
    {byType("achievement").length>0&&<div className="universe-database-releases"><SectionHeading eyebrow="FAN-CURATED ADDITIONS" title="More milestones from the archive"/>{renderCards(byType("achievement"))}</div>}
    <SectionHeading eyebrow="FAN MEMORIES" title="Gallery & memories"/>
    {renderCards(byType("gallery"))}
    <SectionHeading eyebrow="PLAY & DISCOVER" title="Trivia & interactive corner" note="Take the LYKN quizzes and fan activities in the Fun Zone."/>
    <button className="button-primary" onClick={()=>navigate("/fun-zone")}>Explore Fun Zone <ArrowRight size={14}/></button>
    </>}
    {loading&&<p className="admin-muted">Loading LYKN content…</p>}
    {isStaff&&<section className="universe-publish"><div className="eyebrow">ADMIN CONTENT STUDIO</div><h3>{editingId?"Edit LYKN Universe entry":"Add or update LYKN Universe content"}</h3><p>Only authorised staff can publish. Use properly credited photos and verified source links. Images are limited to 3 MB each.</p><form onSubmit={publish}><select value={type} onChange={e=>{setType(e.target.value);if(e.target.value==="member")setTitle(member==="LYKN"?"LYKN":member);}}><option value="member">Member profile photo / intro</option><option value="music_video">Group music video</option><option value="performance">Group performance</option><option value="release">Group release / discography</option><option value="solo_release">Member solo song / release</option><option value="collaboration">Collaboration / duet (including WilliamEst)</option><option value="ost">OST / soundtrack</option><option value="acting_project">Acting / series / film project</option><option value="brand_project">Brand / fashion / campaign project</option><option value="variety">Variety / guest appearance</option><option value="other_project">Other member project</option><option value="timeline">Timeline milestone</option><option value="achievement">Achievement</option><option value="gallery">Gallery / memory</option></select><select value={member} onChange={e=>{setMember(e.target.value);if(type==="member")setTitle(e.target.value);}}><option value="LYKN">LYKN (group)</option>{names.map(n=><option key={n} value={n}>{n}</option>)}</select><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" maxLength={180} required/><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description / verified details" maxLength={3000} rows={3}/><input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)}/><input type="url" value={source} onChange={e=>setSource(e.target.value)} placeholder="Official source / credit URL"/><label className="universe-image-input">Add image (JPG, PNG or WebP · max 3 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setImageFile(e.target.files?.[0]||null)}/></label><div className="universe-editor-actions"><button className="button-primary" type="submit" disabled={busy}>{busy?"Saving…":editingId?"Save changes":"Publish to LYKN Universe"}</button>{editingId&&<button className="button-outline" type="button" onClick={()=>{setEditingId(null);setTitle("");setDescription("");setEventDate("");setSource("");setImageFile(null);}}>Cancel edit</button>}</div></form></section>}
    <p className="source-note"><Shield size={14}/> This is an independent fan space. Facts and schedules should be checked against official public sources before publication.</p>
  </>;
}
const featuredReleaseUpdates = [
  {date:"13 Nov 2026",category:"MUSIC VIDEO",title:"คงต้องเป็นคนนี้ (Always Been)",summary:"LYKN's November 2026 music video release."},
  {date:"22 Oct 2026",category:"MUSIC VIDEO",title:"ครั้งแรกพอทน (Not Again)",summary:"A collaboration release featuring Joke iScream."},
  {date:"15 Sep 2026",category:"MUSIC VIDEO",title:"หน้าไหว้หลังหลอก (Oh My Gosh)",summary:"LYKN's September 2026 official music video release."},
  {date:"2026",category:"ALBUM",title:"REFLEXION",summary:"LYKN's 2026 album era, with group and member releases."},
  {date:"2026",category:"MUSIC",title:"ถ้าเกิด (If Only)",summary:"A 2026 LYKN release."},
  {date:"2026",category:"COLLABORATION",title:"ล็อกมง (You Shine I Choose)",summary:"A LYKN collaboration featuring Bow Maylada."},
];
function UpdatesPage({ setNotice }: { setNotice: (message: string) => void }) {
  const { user, configured } = useAuth();
  const { isAdmin } = useStaffRole();
  const [updates,setUpdates] = useState<any[]>([]);
  const [categoryFilter,setCategoryFilter] = useState("all");
  const [scheduleEntries,setScheduleEntries] = useState<any[]>([]);
  const [scheduleRange,setScheduleRange] = useState("upcoming");
  const location = useLocation();
  const [scheduleFilter,setScheduleFilter] = useState(new URLSearchParams(location.search).get("member") || "LYKN");
  const [scheduleMember,setScheduleMember] = useState("LYKN");
  const [scheduleTitle,setScheduleTitle] = useState("");
  const [scheduleDate,setScheduleDate] = useState("");
  const [scheduleLocation,setScheduleLocation] = useState("");
  const [scheduleSource,setScheduleSource] = useState("");
  const [loading,setLoading] = useState(true);
  const [category,setCategory] = useState("news");
  const [title,setTitle] = useState("");
  const [summary,setSummary] = useState("");
  const [sourceUrl,setSourceUrl] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");

  const loadUpdates = useCallback(async()=>{
    if(!configured||!supabase){setUpdates([]);setLoading(false);return;}
    const [{data,error},{data:scheduleData,error:scheduleError}]=await Promise.all([
      supabase.from("lykn_updates").select("id,category,title,summary,source_url,source_label,published_at,created_at").eq("status","published").order("published_at",{ascending:false}).limit(50),
      supabase.from("lykn_schedule_entries").select("id,member_name,title,starts_at,timezone,location_text,source_url,source_label").eq("status","published").order("starts_at",{ascending:true}).limit(200),
    ]);
    if(error)setNotice("Updates could not be loaded: "+error.message);
    if(scheduleError)setNotice("Schedule board is unavailable until the latest database migration is applied: "+scheduleError.message);
    setUpdates(data??[]); setScheduleEntries(scheduleData??[]);
    setLoading(false);
  },[configured]);

  useEffect(()=>{void loadUpdates();},[loadUpdates]);

  async function publishSchedule(event:FormEvent){
    event.preventDefault();
    if(!user||!supabase||!isAdmin)return;
    if(!scheduleSource.trim()){setNotice("Add the official source link before publishing this schedule entry.");return;}
    try{new URL(scheduleSource.trim());}catch{setNotice("Enter a valid official schedule source URL.");return;}
    setBusy(true);setMessage("");
    const {error}=await supabase.from("lykn_schedule_entries").insert({
      member_name:scheduleMember,title:scheduleTitle.trim(),starts_at:new Date(scheduleDate + ":00+05:30").toISOString(),
      timezone:"Asia/Kolkata",location_text:scheduleLocation.trim()||null,source_url:scheduleSource.trim()||null,
      source_label:"Official source",status:"published",created_by:user.id,published_at:new Date().toISOString(),
    });
    if(error)setNotice(error.message);
    else{setScheduleTitle("");setScheduleDate("");setScheduleLocation("");setScheduleSource("");setMessage("Schedule entry published.");await loadUpdates();}
    setBusy(false);
  }

  async function publish(event:FormEvent){
    event.preventDefault();
    if(!user||!supabase||!isAdmin)return;
    if(sourceUrl.trim()){
      try{new URL(sourceUrl.trim());}catch{setNotice("Enter a valid source URL.");return;}
    }
    setBusy(true);setMessage("");
    const {error}=await supabase.from("lykn_updates").insert({
      category,title:title.trim(),summary:summary.trim(),source_url:sourceUrl.trim()||null,
      source_label:sourceUrl.trim()?"Source":"Fanclub announcement",
      status:"published",created_by:user.id,published_at:new Date().toISOString(),
    });
    if(error)setNotice(error.message);
    else{setTitle("");setSummary("");setSourceUrl("");setMessage("Update published.");await loadUpdates();}
    setBusy(false);
  }

  return <><SectionHeading eyebrow="THE LATEST FROM OUR FAN UNIVERSE" title="LYKN Updates" note="A fanclub-curated hub for announcements, releases, schedules and useful links."/><section className="updates-hero"><div className="updates-hero-copy"><span className="eyebrow">NEWS · MUSIC · SCHEDULES · APPEARANCES</span><h2>Stay in the<br/><em>LYKN loop.</em></h2><p>All the updates LYKYOUs need, gathered in one place. Read summaries here; original sources are credited when necessary.</p></div><div className="updates-hero-art" aria-hidden="true"><span>✦</span><span>♫</span><span>✧</span></div></section><div className="updates-notice"><Megaphone size={20}/><div><strong>Independent fanclub updates</strong><span>We prioritise official sources and clearly label fanclub announcements. Unconfirmed rumours are not presented as facts.</span></div></div>
    {message&&<div className="auth-message success">{message}</div>}
    {isAdmin&&<form className="update-publish-form" onSubmit={publish}><div><div className="eyebrow">ADMIN PUBLISHING</div><h3>Publish an update</h3><p>Check the source before publishing. All admins can publish LYKN Updates.</p></div><select value={category} onChange={(e)=>setCategory(e.target.value)}><option value="news">News & announcements</option><option value="music">Music & releases</option><option value="schedule">Schedules & appearances</option><option value="media">Media & interviews</option><option value="notice">Important notice</option></select><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Update headline" maxLength={180} required/><textarea value={summary} onChange={(e)=>setSummary(e.target.value)} placeholder="Short verified summary" maxLength={3000} rows={3}/><input type="url" value={sourceUrl} onChange={(e)=>setSourceUrl(e.target.value)} placeholder="Source URL (optional for fanclub notices)"/><button className="button-primary" type="submit" disabled={busy}>{busy?"Publishing…":"Publish update"} <ArrowRight size={14}/></button></form>}
    <div className="filter-tabs updates-filters">{[["all","All updates"],["news","News"],["music","Music"],["schedule","Schedules"],["media","Media"],["notice","Notices"]].map(([value,label])=><button key={value} className={categoryFilter===value?"active":""} onClick={()=>setCategoryFilter(value)}>{label}</button>)}</div><div className="updates-grid">{loading?<EmptyState title="Loading updates" text="Checking the latest published fanclub updates…"/>:configured&&updates.length===0?<EmptyState title="No updates published yet" text="Verified announcements and release information will appear here once an admin publishes them."/>:configured?updates.filter((item)=>categoryFilter==="all"||item.category===categoryFilter).map((item)=> <article className="update-card" key={item.id}><div className="update-art tone-lavender"><Sparkles size={29}/></div><div className="update-body"><span className="eyebrow">{item.category}</span><h3>{item.title}</h3><p>{item.summary}</p><span className="update-date">{new Date(item.published_at??item.created_at).toLocaleDateString()}</span>{item.source_url&&<span className="schedule-source-credit">{item.source_label||"Source credit recorded"}</span>}</div></article>):updateItems.map((item)=><article className="update-card" key={item.title}><div className={`update-art tone-${item.tone}`}><Sparkles size={29}/></div><div className="update-body"><span className="eyebrow">{item.category}</span><h3>{item.title}</h3><p>{item.desc}</p><span className="update-date">Preview section</span></div></article>)}</div>
    {configured&&updates.length===0&&<><SectionHeading eyebrow="RECENT RELEASES" title="Latest from LYKN" note="A compact in-app release digest while the fanclub update desk is being populated."/><div className="updates-grid">{featuredReleaseUpdates.map(item=><article className="update-card" key={item.title}><div className="update-art tone-lavender"><Music2 size={29}/></div><div className="update-body"><span className="eyebrow">{item.category}</span><h3>{item.title}</h3><p>{item.summary}</p><span className="update-date">{item.date}</span></div></article>)}</div></>}
        <SectionHeading eyebrow="SCHEDULE SYNC" title="One calendar. Five member filters." note="Browse the published schedule here. Source credits are provided only when needed."/><div className="schedule-preview"><div className="schedule-toolbar"><strong><CalendarDays size={17}/> LYKN & member schedules</strong><div className="schedule-toolbar-controls"><select value={scheduleRange} onChange={(e)=>setScheduleRange(e.target.value)}><option value="upcoming">Upcoming</option><option value="all">All dates</option></select><select value={scheduleFilter} onChange={(e)=>setScheduleFilter(e.target.value)}><option value="LYKN">All LYKN</option>{members.map((m)=><option key={m.name} value={m.name}>{m.name}</option>)}</select></div></div><div className="member-filters">{members.map((m)=><button key={m.name} className={scheduleFilter===m.name?"active":""} onClick={()=>setScheduleFilter(m.name)}><i className={`filter-dot tone-${m.tone}`}/>{m.name}</button>)}</div>{loading?<EmptyState title="Loading schedule" text="Checking published schedule entries…"/>:scheduleEntries.filter((entry)=>(scheduleRange==="all"||new Date(entry.starts_at)>=new Date())&&(scheduleFilter==="LYKN"?true:entry.member_name===scheduleFilter||entry.member_name==="LYKN")).length===0?<EmptyState title="No upcoming schedule entries" text="Published official dates will appear here when added by an admin."/>:<div className="schedule-entry-list">{scheduleEntries.filter((entry)=>(scheduleRange==="all"||new Date(entry.starts_at)>=new Date())&&(scheduleFilter==="LYKN"?true:entry.member_name===scheduleFilter||entry.member_name==="LYKN")).map((entry)=><article className="schedule-entry" key={entry.id}><div className="schedule-entry-date"><strong>{new Date(entry.starts_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",timeZone:"Asia/Kolkata"})}</strong><small>{new Date(entry.starts_at).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Kolkata"})} IST</small></div><div><span className="eyebrow">{entry.member_name}</span><strong>{entry.title}</strong><p>{entry.location_text||"Location to be confirmed"}</p>{entry.source_url&&<span className="schedule-source-credit">Source: {entry.source_label || "official announcement"}</span>}</div></article>)}</div>}{isAdmin&&<form className="hub-submit-form schedule-entry-form" onSubmit={publishSchedule}><strong>Add a verified schedule entry</strong><select value={scheduleMember} onChange={(e)=>setScheduleMember(e.target.value)}><option value="LYKN">LYKN (group)</option>{members.map((m)=><option key={m.name} value={m.name}>{m.name}</option>)}</select><input value={scheduleTitle} onChange={(e)=>setScheduleTitle(e.target.value)} placeholder="Event or appearance" maxLength={180} required/><input type="datetime-local" value={scheduleDate} onChange={(e)=>setScheduleDate(e.target.value)} required/><input value={scheduleLocation} onChange={(e)=>setScheduleLocation(e.target.value)} placeholder="Location (optional)"/><input type="url" value={scheduleSource} onChange={(e)=>setScheduleSource(e.target.value)} placeholder="Official source URL" required/><button className="button-primary" type="submit" disabled={busy||!scheduleDate}>{busy?"Publishing…":"Publish schedule entry"}</button><small>Confirm the date and time against an official source before publishing. Timezone: Asia/Kolkata.</small></form>}</div>
  </>;
}
function PlaceholderPage({ title, go }: { title: string; go: (path: string) => void }) { return <EmptyState title={title} text="This area is part of the LYKYOU Space roadmap. Its full page will be added in the next build stages." action={<button className="button-primary" onClick={() => go("/")}>Back to Home <ArrowRight size={15}/></button>}/>; }
function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Sparkles size={24}/></div><h3>{title}</h3><p>{text}</p>{action}</div>; }
export default SpacePages;
