import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css";
import { useAuth, useStaffRole } from "./lib/auth";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "./lib/supabase";

/* ==========================================================================
   LYKYOU Space — Home dashboard

   This is a visual frontend prototype. Nothing here is connected to a backend:
   authentication, posts, polls, notifications, events and birthdays
   are all PREVIEW DATA defined in `PREVIEW_HOME_DATA` below.

   Supabase-ready structure:
   - Every piece of content on this page is described by the typed `HomeData`
     model. Presentational components only receive props.
   - `useHomeData()` is the single seam to replace later with real queries.
     (e.g. fetch profile, feed, event, trending tags and birthdays, then map
     the rows into the `HomeData` shape.)
   ========================================================================== */

/* Set to false to hide the preview/sample labels once real data is wired up. */
const SHOW_PREVIEW_NOTICE = !supabase;

/* The only page built so far. */
const ACTIVE_PAGE = "home";

/* ------------------------------------------------------------------ types */

type IconName =
  | "home" | "search" | "users" | "groups" | "calendar" | "projects" | "updates"
  | "message" | "bell" | "bookmark" | "user" | "settings" | "menu" | "plus"
  | "chevron" | "image" | "poll" | "question" | "smile" | "thumb" | "comment"
  | "quote" | "share" | "more" | "star" | "infinity" | "heart" | "cube"
  | "sparkle" | "flame" | "crown" | "gamepad" | "planet" | "megaphone";

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: IconName;
  group: "main" | "personal";
  badge?: number;
}

interface HeroChip {
  id: string;
  label: string;
  icon: IconName;
  tone: "amber" | "violet" | "teal" | "pink";
}

interface Member {
  id: string;
  name: string;
  color: string;
  birthday: string;
  avatarUrl?: string;
}

interface Story {
  id: string;
  name: string;
  color: string;
  isOwn?: boolean;
}

interface PollOption {
  id: string;
  label: string;
  percent: number;
}

interface FeedPost {
  id: string;
  author: string;
  authorBadge?: string;
  authorColor: string;
  ago: string;
  visibility: "Public" | "Members";
  body: string;
  hashtag?: string;
  mediaTone?: "stage" | "group";
  mediaUrl?: string;
  mediaAlt?: string;
  poll?: PollOption[];
  reactionCount: number;
  comments: number;
  liked?: boolean;
  bookmarked?: boolean;
  shares?: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  countdownLabel?: string;
}

interface HomeData {
  viewer: { displayName: string; avatarUrl?: string };
  heroImageUrl?: string;
  chips: HeroChip[];
  nav: NavItem[];
  stories: Story[];
  posts: FeedPost[];
  event?: UpcomingEvent;
  trending: string[];
  birthdays: Member[];
  universeMembers: Member[];
  isLive: boolean;
}

/* ----------------------------------------------------------- preview data */

const PREVIEW_HOME_DATA: HomeData = {
  isLive: false,
  universeMembers: [
    { id: "william", name: "WILLIAM", color: "#FFB36B", birthday: "13 Feb" },
    { id: "lego", name: "LEGO", color: "#7DD3FC", birthday: "10 Feb" },
    { id: "nut", name: "NUT", color: "#A7F3D0", birthday: "19 Apr" },
    { id: "hong", name: "HONG", color: "#A78BFA", birthday: "15 Oct" },
    { id: "tui", name: "TUI", color: "#F9A8D4", birthday: "23 Mar" },
  ],
  viewer: { displayName: "LYKYOU" },
  heroImageUrl: "/images/lykyou-space-banner.webp",
  chips: [
    { id: "members", label: "5 MEMBERS", icon: "star", tone: "amber" },
    { id: "space", label: "1 SPACE", icon: "cube", tone: "violet" },
    { id: "memories", label: "MEMORIES", icon: "infinity", tone: "teal" },
    { id: "lykyou", label: "LYKYOU", icon: "heart", tone: "pink" },
  ],
  nav: [
    { id: "home", label: "Home", icon: "home", group: "main" },
    { id: "community", label: "Community", icon: "users", group: "main" },
    { id: "discover", label: "Discover", icon: "search", group: "main" },
    { id: "funzone", label: "Fun Zone", icon: "gamepad", group: "main" },
    { id: "bias", label: "Bias Corner", icon: "heart", group: "main" },
    { id: "projects", label: "Fan Project Wall", shortLabel: "Projects", icon: "projects", group: "main" },
    { id: "events", label: "Events & Meetups", shortLabel: "Events", icon: "calendar", group: "main" },
    { id: "fandom", label: "Fandom Hub", shortLabel: "Fandom", icon: "heart", group: "main" },
    { id: "universe", label: "LYKN Universe", shortLabel: "Universe", icon: "planet", group: "main" },
    { id: "updates", label: "LYKN Updates", icon: "megaphone", group: "main" },
    { id: "friends", label: "My Friends", icon: "users", group: "personal" },
    { id: "groups", label: "My Groups", icon: "groups", group: "personal" },
    { id: "notifications", label: "Notifications", icon: "bell", group: "personal" },
    { id: "bookmarks", label: "Bookmarks", icon: "bookmark", group: "personal" },
    { id: "profile", label: "My Profile", icon: "user", group: "personal" },
    { id: "settings", label: "Settings", icon: "settings", group: "personal" },
  ],
  stories: [
    { id: "you", name: "Your story", color: "#C4B5FD", isOwn: true },
    { id: "william", name: "William", color: "#FFB36B" },
    { id: "lego", name: "Lego", color: "#7DD3FC" },
    { id: "nut", name: "Nut", color: "#A7F3D0" },
    { id: "hong", name: "Hong", color: "#A78BFA" },
    { id: "tui", name: "Tui", color: "#F9A8D4" },
  ],
  posts: [
    {
      id: "p1",
      author: "StarryLYKYOU",
      authorBadge: "✨",
      authorColor: "#A78BFA",
      ago: "2h ago",
      visibility: "Public",
      body: "That moment when LYKN said “We’ll see you soon” and my heart just 😍💜",
      hashtag: "#LYKYOUForever",
      mediaTone: "stage",
      reactionCount: 128,
      comments: 12,
      shares: 23,
    },
    {
      id: "p2",
      author: "DreamyLYKYOU",
      authorBadge: "🌙",
      authorColor: "#7DD3FC",
      ago: "1h ago",
      visibility: "Public",
      body: "Random appreciation for how LYKN makes us feel so seen and loved 🥹💗 We’re really so lucky ✨",
      hashtag: "#LYKYOUFamily",
      mediaTone: "group",
      reactionCount: 96,
      comments: 12,
      shares: 8,
    },
    {
      id: "p3",
      author: "GalaxyLYKYOU",
      authorBadge: "🚀",
      authorColor: "#F9A8D4",
      ago: "3h ago",
      visibility: "Public",
      body: "Which LYKYOU song is your current mood?",
      poll: [
        { id: "o1", label: "Umm Umm", percent: 42 },
        { id: "o2", label: "May I?", percent: 28 },
        { id: "o3", label: "All I Need", percent: 18 },
        { id: "o4", label: "Another song", percent: 12 },
      ],
      reactionCount: 54,
      comments: 31,
      shares: 4,
    },
  ],
  event: undefined,
  trending: ["#LYKYOUJourney", "#NutFocus", "#HongWisdom", "#TuiEnergy", "#WilliamSmile"],
  birthdays: [
    { id: "william", name: "William", color: "#FFB36B", birthday: "13 Feb" },
    { id: "lego", name: "Lego", color: "#7DD3FC", birthday: "10 Feb" },
    { id: "nut", name: "Nut", color: "#A7F3D0", birthday: "19 Apr" },
    { id: "hong", name: "Hong", color: "#A78BFA", birthday: "15 Oct" },
    { id: "tui", name: "Tui", color: "#F9A8D4", birthday: "23 Mar" },
  ],
};

/* Load real community content whenever Supabase is configured. */
function useHomeData(refreshKey = 0): HomeData {
  const { user } = useAuth();
  const [liveData, setLiveData] = useState<HomeData>(PREVIEW_HOME_DATA);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLiveData(PREVIEW_HOME_DATA); return; }
      const [profileResult, postResult, unreadResult, eventResult, countdownResult, memberResult] = await Promise.all([
        user ? supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from("posts").select("id,author_id,body,visibility,created_at,post_type").eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(20),
        user ? supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null) : Promise.resolve({ count: 0, error: null }),
        supabase.from("events").select("id,title,starts_at,timezone").eq("status", "published").gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(1),
        supabase.from("space_countdowns").select("id,title,description,countdown_type,member_name,target_at,timezone").eq("status", "published").gte("target_at", new Date().toISOString()).order("target_at", { ascending: true }).limit(20),
        supabase.from("lykn_universe_content").select("member_name,image_url").eq("content_type", "member"),
      ]);
      if (!active) return;
      if (postResult.error) { setLiveData(PREVIEW_HOME_DATA); return; }
      const rows = postResult.data ?? [];
      const authorIds = [...new Set(rows.map((row: any) => row.author_id))];
      const postIds = rows.map((row: any) => row.id);
      const [profilesResult, likesResult, commentsResult, mineLikesResult, mineBookmarksResult] = await Promise.all([
        authorIds.length ? supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds) : Promise.resolve({ data: [] }),
        postIds.length ? supabase.from("post_likes").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] }),
        postIds.length ? supabase.from("comments").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] }),
        user && postIds.length ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
        user && postIds.length ? supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
      ]);
      if (!active) return;
      const profileMap = new Map((profilesResult.data ?? []).map((p: any) => [p.id, p]));
      const likeCounts = new Map<string, number>();
      const commentCounts = new Map<string, number>();
      (likesResult.data ?? []).forEach((row: any) => likeCounts.set(row.post_id, (likeCounts.get(row.post_id) ?? 0) + 1));
      (commentsResult.data ?? []).forEach((row: any) => commentCounts.set(row.post_id, (commentCounts.get(row.post_id) ?? 0) + 1));
      const likedIds = new Set((mineLikesResult.data ?? []).map((row: any) => row.post_id));
      const bookmarkedIds = new Set((mineBookmarksResult.data ?? []).map((row: any) => row.post_id));
      const palette = ["#A78BFA", "#7DD3FC", "#A7F3D0", "#F9A8D4", "#FFB36B"];
      const posts: FeedPost[] = rows.map((row: any, index: number) => {
        const author: any = profileMap.get(row.author_id);
        const elapsed = Math.max(0, Date.now() - new Date(row.created_at).getTime());
        const mins = Math.floor(elapsed / 60000);
        const ago = mins < 1 ? "just now" : mins < 60 ? mins + "m ago" : mins < 1440 ? Math.floor(mins / 60) + "h ago" : Math.floor(mins / 1440) + "d ago";
        return { id: row.id, author: author?.display_name ?? "LYKYOU", authorColor: palette[index % palette.length], ago, visibility: "Public", body: row.body ?? "", reactionCount: likeCounts.get(row.id) ?? 0, comments: commentCounts.get(row.id) ?? 0, liked: likedIds.has(row.id), bookmarked: bookmarkedIds.has(row.id) };
      });
      const tagCounts = new Map<string, number>();
      posts.forEach((post) => (post.body.match(/#[a-z0-9_]+/gi) ?? []).forEach((tag: string) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)));
      const trending = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
      const nextEvent = eventResult.data?.[0];
      const countdowns = countdownResult.data ?? [];
      const nextCountdown = countdowns.find((item: any) => item.countdown_type !== "birthday");
      const countdownEvent = nextCountdown ?? countdowns[0];
      const event = nextEvent ? (() => {
        const start = new Date(nextEvent.starts_at);
        const days = Math.max(0, Math.ceil((start.getTime() - Date.now()) / 86400000));
        return { id: nextEvent.id, title: nextEvent.title, dateLabel: start.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: nextEvent.timezone || "Asia/Kolkata" }), timeLabel: start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: nextEvent.timezone || "Asia/Kolkata" }), countdownLabel: days === 0 ? "Today" : days + " days to go" };
      })() : countdownEvent ? (() => {
        const start = new Date(countdownEvent.target_at);
        const days = Math.max(0, Math.ceil((start.getTime() - Date.now()) / 86400000));
        return { id: countdownEvent.id, title: countdownEvent.title, dateLabel: start.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: countdownEvent.timezone || "Asia/Kolkata" }), timeLabel: countdownEvent.description || "Save the date", countdownLabel: days === 0 ? "Today" : days + " days to go" };
      })() : undefined;
      const memberImages = new Map((memberResult.data ?? []).map((item: any) => [String(item.member_name ?? "").toUpperCase(), item.image_url]));
      const universeMembers = PREVIEW_HOME_DATA.universeMembers.map((member) => ({ ...member, avatarUrl: (memberImages.get(member.name) as string | null) ?? undefined }));
      const birthdays = countdowns.filter((item: any) => item.countdown_type === "birthday" && item.member_name).map((item: any) => {
        const member = universeMembers.find((person) => person.name === String(item.member_name).toUpperCase());
        const date = new Date(item.target_at);
        return { id: item.id, name: member?.name ?? item.member_name, color: member?.color ?? "#A78BFA", birthday: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }), avatarUrl: member?.avatarUrl };
      });
      setLiveData({ ...PREVIEW_HOME_DATA, isLive: true, viewer: { displayName: profileResult.data?.display_name ?? user?.user_metadata?.display_name ?? "LYKYOU", avatarUrl: profileResult.data?.avatar_url ?? undefined }, nav: PREVIEW_HOME_DATA.nav.map((item) => item.id === "notifications" ? { ...item, badge: unreadResult.count ?? 0 } : item), stories: [], posts, event, birthdays, universeMembers, trending });
    }
    void load();
    return () => { active = false; };
  }, [user?.id, refreshKey]);
  return liveData;
}

/* ------------------------------------------------------------------ icons */

const ICONS: Record<IconName, ReactNode> = {
  home: (<><path d="M3.5 11 12 3.5 20.5 11" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>),
  users: (<><circle cx="9" cy="8" r="3.4" /><path d="M2.8 20c0-3.5 2.8-5.8 6.2-5.8s6.2 2.3 6.2 5.8" /><path d="M16 4.9a3.4 3.4 0 0 1 0 6.3" /><path d="M18 14.5c2 .6 3.3 2.4 3.3 5.5" /></>),
  groups: (<><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c0-3.5 2.8-5.8 6.5-5.8s6.5 2.3 6.5 5.8" /><circle cx="4.5" cy="10" r="2" /><circle cx="19.5" cy="10" r="2" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  projects: (<><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 2.5h6V5H9z" /><path d="M12 17s-3-1.7-3-3.8a1.7 1.7 0 0 1 3-1 1.7 1.7 0 0 1 3 1c0 2.1-3 3.8-3 3.8z" /></>),
  updates: (<><path d="M12 2.8 21 12l-9 9.2L3 12z" /><circle cx="12" cy="12" r="2.2" /></>),
  message: (<path d="M21 11.8a8 8 0 0 1-11.5 7.2L4 20.2l1.2-4.6A8 8 0 1 1 21 11.8z" />),
  bell: (<><path d="M6 9.5a6 6 0 0 1 12 0c0 5.5 2.3 7 2.3 7H3.7S6 15 6 9.5z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  bookmark: (<path d="M6.5 3.5h11v17L12 16.6l-5.5 3.9z" />),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.2 3.6-6.8 8-6.8s8 2.6 8 6.8" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>),
  menu: (<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />),
  plus: (<path d="M12 5v14M5 12h14" />),
  chevron: (<path d="m6 9 6 6 6-6" />),
  image: (<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-5-5-9 8.5" /></>),
  poll: (<><rect x="4" y="12" width="4" height="8" rx="1" /><rect x="10" y="4" width="4" height="16" rx="1" /><rect x="16" y="9" width="4" height="11" rx="1" /></>),
  question: (<><circle cx="12" cy="12" r="9" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1 1-1.1 1.8M12 17h.01" /></>),
  smile: (<><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5M9 9.5h.01M15 9.5h.01" /></>),
  thumb: (<><path d="M7 11v9H4.2a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" /><path d="m7 11 4-7.5a2.4 2.4 0 0 1 3 2.8L13.3 10H19a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 17.7 20H7" /></>),
  comment: (<path d="M21 11.8a8 8 0 0 1-11.5 7.2L4 20.2l1.2-4.6A8 8 0 1 1 21 11.8z" />),
  quote: (<><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M8 10h8M8 14h5" /></>),
  share: (<><path d="M4 12.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6.5" /><path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" /></>),
  more: (<><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>),
  star: (<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />),
  infinity: (<path d="M12 12c-2-3-3.5-4-5.5-4a4 4 0 0 0 0 8c2 0 3.5-1 5.5-4zm0 0c2 3 3.5 4 5.5 4a4 4 0 0 0 0-8c-2 0-3.5 1-5.5 4z" />),
  heart: (<path d="M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8 2.3C20 15.4 12 20 12 20z" />),
  cube: (<><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>),
  sparkle: (<path d="m12 2.5 2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z" />),
  flame: (<path d="M12 3c1 3.2 5.2 5.4 5.2 10a5.2 5.2 0 0 1-10.4 0c0-2.2 1-3.6 2.2-4.6.1 2 1 2.6 1.6 2.6C9.8 8.6 10.8 5.2 12 3z" />),
  crown: (<path d="m3 8 4.2 4L12 5l4.8 7L21 8l-2 11H5z" />),
  gamepad: (<><rect x="2.5" y="7" width="19" height="11" rx="5.5" /><path d="M7.5 10.5v4M5.5 12.5h4" /><circle cx="15.5" cy="11.5" r=".9" /><circle cx="18" cy="13.8" r=".9" /></>),
  planet: (<><circle cx="12" cy="12" r="5" /><ellipse cx="12" cy="12" rx="10" ry="3.6" transform="rotate(-25 12 12)" /></>),
  megaphone: (<><path d="M3.5 10v4a1 1 0 0 0 1 1H7l9 4.5v-15L7 9H4.5a1 1 0 0 0-1 1z" /><path d="M19.5 9.5a4 4 0 0 1 0 5" /></>),
};

function Icon({ name, size = 20, fill = false }: { name: IconName; size?: number; fill?: boolean }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

/* ---------------------------------------------------------- small pieces */

/* The approved LYKYOU wolf mascot was cropped directly from the supplied PDF.
   Every mascot slot uses that artwork; the LYKN India logo remains separate. */
const MASCOT_SRC: string = "/images/lykyou-wolf.webp";

function Mascot({ size = 40, className = "" }: { size?: number; className?: string }) {
  const style = { "--s": `${size}px` } as CSSProperties;
  return (
    <span className={`mascot ${className}`.trim()} style={style} aria-hidden="true">
      {MASCOT_SRC ? (
        <img src={MASCOT_SRC} alt="" draggable={false} />
      ) : (
        <Icon name="sparkle" size={Math.round(size * 0.5)} fill />
      )}
    </span>
  );
}

function SampleTag() {
  return SHOW_PREVIEW_NOTICE ? <span className="sample-tag">SAMPLE</span> : null;
}

function Avatar({
  name,
  color,
  size = 44,
  src,
  ring = true,
}: {
  name: string;
  color: string;
  size?: number;
  src?: string;
  ring?: boolean;
}) {
  const memberIndex = ["WILLIAM","LEGO","NUT","HONG","TUI"].indexOf(name.toUpperCase());
  const style = {
    "--s": `${size}px`,
    "--c": color,
    ...(memberIndex >= 0 && !src ? { backgroundImage: 'url("https://pbs.twimg.com/media/G8MSHezbMAACAh7.jpg")', backgroundSize: "500% auto", backgroundPosition: `${memberIndex * 25}% 35%` } : {}),
  } as CSSProperties;
  return (
    <span className={`avatar${ring ? " ringed" : ""}`} style={style} aria-hidden="true">
      {src ? <img src={src} alt="" /> : memberIndex >= 0 ? null : name.charAt(0).toUpperCase()}
    </span>
  );
}

/* ---------------------------------------------------------------- sidebar */

function Sidebar({
  nav,
  active,
  open,
  hidden,
  onSelect,
}: {
  nav: NavItem[];
  active: string;
  open: boolean;
  hidden: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <aside
      id="sidebar"
      className={`sidebar${open ? " open" : ""}${hidden ? " is-hidden" : ""}`}
      aria-label="Primary"
    >
      <div className="brand">
        <div className="logo">
          <img src="/images/lykyou-wolf.webp" alt="LYKN India Fanclub mascot" draggable={false} />
        </div>
        <span className="brand-wordmark"><b>LYKYOU</b><i>SPACE</i></span>
      </div>

      <nav className="side-nav" aria-label="Main navigation">
        {(["main", "personal"] as const).map((group) => (
          <ul key={group} className={`nav-group g-${group}`}>
            {nav
              .filter((item) => item.group === group)
              .map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`nav-item${active === item.id ? " active" : ""}`}
                    aria-current={active === item.id ? "page" : undefined}
                    onClick={() => onSelect(item.id)}
                  >
                    <Icon name={item.icon} size={20} />
                    <span className="nav-label">{item.label}</span>
                    {item.badge ? (
                      <span className="nav-badge" aria-label={`${item.badge} unread`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
          </ul>
        ))}
      </nav>

      <div className="stars-card" aria-hidden="true">
        <span className="orbit-ring" />
        <span className="twinkle t1">✦</span>
        <span className="twinkle t2">✦</span>
        <span className="twinkle t3">✦</span>
        <Mascot size={60} className="stars-cat" />
        <p>
          YOU ARE
          <br />
          MADE OF
          <br />
          <em>STARS</em>
        </p>
      </div>
    </aside>
  );
}

/* ----------------------------------------------------------------- header */

function TopBar({
  viewerName,
  viewerAvatar,
  unread,
  menuOpen,
  onMenu,
  onAccount,
  onSearch,
  onCreate,
  onNotifications,
}: {
  viewerName: string;
  viewerAvatar?: string;
  unread: number;
  menuOpen: boolean;
  onMenu: () => void;
  onAccount: () => void;
  onSearch: (query: string) => void;
  onCreate: () => void;
  onNotifications: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <header className="topbar">
      <div className="tb-desktop">
        <button
          type="button"
          className="icon-plain"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          onClick={onMenu}
        >
          <Icon name="menu" size={26} />
        </button>

        <form className="search" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(searchQuery); }}>
          <Icon name="search" size={20} />
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search LYKYOU Space..." aria-label="Search LYKYOU Space" />
        </form>

        {SHOW_PREVIEW_NOTICE && <span className="preview-pill">PREVIEW · SAMPLE DATA</span>}

        <div className="tb-right">
          <Mascot size={42} className="tb-cat" />
          <button type="button" className="plus-btn" aria-label="Create a post" onClick={onCreate}>
            <Icon name="plus" size={22} />
          </button>
          <button type="button" className="bell-btn" onClick={onNotifications} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
            <Icon name="bell" size={26} />
            {unread > 0 && <span className="bell-badge">{unread}</span>}
          </button>
          <button type="button" className="me-btn" aria-label="Open account" onClick={onAccount}>
            <Avatar name={viewerName} color="#C4B5FD" size={46} src={viewerAvatar} />
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>

      <div className="tb-mobile">
        <Mascot size={38} />
        <strong>
          LYKYOU Space <Icon name="sparkle" size={14} fill />
        </strong>
        <button type="button" className="icon-plain" aria-label="Search members" onClick={() => onSearch("")}>
          <Icon name="search" size={22} />
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------- hero */

function Hero({ chips, heroImageUrl }: { chips: HeroChip[]; heroImageUrl?: string }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden="true">
        <span className="hero-stars" />
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
        <span className="orb o4" />
        <span className="orb o5" />
        {heroImageUrl ? <img className="hero-photo" src={heroImageUrl} alt="" /> : null}
        <span className="spark sp1">✦</span>
        <span className="spark sp2">✦</span>
        <span className="spark sp3">✧</span>
      </div>

      <div className="hero-copy">
        <p className="hero-hi">Welcome back,</p>
        <h1 id="hero-title">
          LYKYOU! <Icon name="sparkle" size={26} fill />
        </h1>
        <p className="hero-sub">
          This is our space. Our vibes. Our story.
          <br />
          We’re so happy you’re here.
        </p>
      </div>

      <div className="hero-planet" aria-hidden="true">
        <span className="saucer" />
        <span className="dome">
          <Mascot size={74} />
        </span>
      </div>

      <ul className="hero-chips">
        {chips.map((chip) => (
          <li key={chip.id} className={`chip ${chip.tone}`}>
            <Icon name={chip.icon} size={16} />
            {chip.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- composer */

function Composer({ draft, onDraft, onSubmit, disabled }: { draft: string; onDraft: (v: string) => void; onSubmit: () => void; disabled: boolean }) {
  return (
    <section className="card composer" aria-label="Create a post">
      <form className="composer-top" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <Mascot size={56} className="composer-cat" />
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          placeholder="What’s on your mind, LYKYOU?"
          aria-label="What’s on your mind?"
          maxLength={5000}
        />
        <button type="submit" className="button-primary button-small" disabled={disabled || !draft.trim()}>Post</button>
      </form>
      <div className="composer-actions">
        <button type="button" className="c-act act-photo" data-stub="Photo/video posts">
          <Icon name="image" size={20} />
          <span>
            Photo<span className="hide-sm">/Video</span>
          </span>
        </button>
        <button type="button" className="c-act act-poll" data-stub="Poll creation">
          <Icon name="poll" size={20} />
          <span>Poll</span>
        </button>
        <button type="button" className="c-act act-question" data-stub="Question posts">
          <Icon name="question" size={20} />
          <span>Question</span>
        </button>
        <button type="button" className="c-act act-feeling hide-sm" data-stub="Feeling posts">
          <Icon name="smile" size={20} />
          <span>Feeling</span>
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- feed */

function PostCard({ post, onLike, onComment, onBookmark }: { post: FeedPost; onLike: (id: string) => void; onComment: (id: string) => void; onBookmark: (id: string) => void }) {
  return (
    <article className="card post">
      <header className="post-head">
        <Avatar name={post.author} color={post.authorColor} size={46} />
        <div className="post-who">
          <strong>
            {post.author} {post.authorBadge ? <span className="badge-emoji">{post.authorBadge}</span> : null}
          </strong>
          <span>
            {post.ago} <i aria-hidden="true">•</i> {post.visibility} <SampleTag />
          </span>
        </div>
        <button type="button" className="icon-plain" aria-label="Post options" data-stub="Post options">
          <Icon name="more" size={22} />
        </button>
      </header>

      <p className="post-body">
        {post.body}
        {post.hashtag ? (
          <>
            {" "}
            <span className="hashtag">{post.hashtag}</span>
          </>
        ) : null}
      </p>

      {post.poll ? (
        <ul className="poll" aria-label="Poll results (preview)">
          {post.poll.map((opt) => (
            <li key={opt.id} className="poll-row">
              <span className="poll-bar" style={{ width: `${opt.percent}%` }} />
              <span className="poll-label">{opt.label}</span>
              <span className="poll-pct">{opt.percent}%</span>
            </li>
          ))}
        </ul>
      ) : post.mediaUrl ? (
        <img className="media" src={post.mediaUrl} alt={post.mediaAlt ?? ""} loading="lazy" />
      ) : post.mediaTone ? (
        <div className={`media ph ${post.mediaTone}`} aria-hidden="true" />
      ) : null}

      <div className="post-stats">
        <span className="reactions">
          <span className="r-stack" aria-hidden="true">
            <i className="r r1">♥</i>
            <i className="r r2">★</i>
            <i className="r r3">✦</i>
          </span>
          {post.reactionCount}
        </span>
        <span className="post-counts">
          <span>{post.comments} Comments</span>
          {post.shares !== undefined ? <span className="hide-sm">{post.shares} Shares</span> : null}
        </span>
      </div>

      <div className="post-actions">
        <button type="button" aria-label="Like" aria-pressed={!!post.liked} onClick={() => onLike(post.id)}><Icon name="thumb" size={24} /> {post.reactionCount}</button>
        <button type="button" aria-label="Comment" onClick={() => onComment(post.id)}><Icon name="comment" size={24} /> {post.comments}</button>
        <button type="button" aria-label="Quote" className="hide-sm" data-stub="Quoting"><Icon name="quote" size={24} /></button>
        <button type="button" aria-label="Share" data-stub="Sharing"><Icon name="share" size={24} /></button>
        <button type="button" aria-label="Save" aria-pressed={!!post.bookmarked} onClick={() => onBookmark(post.id)}><Icon name="bookmark" size={24} /></button>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- right rail */

function EventCard({ event, onOpen }: { event: UpcomingEvent; onOpen: () => void }) {
  return (
    <section className="card event" aria-label="Upcoming event">
      <div className="card-top">
        <span className="tag-row">
          <span className="pill-tag">UPCOMING EVENT</span>
          <SampleTag />
        </span>
        <button type="button" className="icon-plain sm" aria-label="Event options" data-stub="Event options">
          <Icon name="more" size={20} />
        </button>
      </div>
      <div className="event-main">
        <h3>{event.title}</h3>
        {event.countdownLabel ? <span className="countdown">{event.countdownLabel}</span> : null}
      </div>
      <p className="event-when">
        {event.dateLabel} <i aria-hidden="true">•</i> {event.timeLabel}
      </p>
      <button type="button" className="btn-primary" onClick={onOpen}>
        View Details
      </button>
      <span className="event-planet" aria-hidden="true" />
    </section>
  );
}

function TrendingCard({ tags }: { tags: string[] }) {
  return (
    <section className="card rail-card" aria-label="Trending now">
      <h2 className="rail-title">
        TRENDING NOW <Icon name="flame" size={16} fill /> <SampleTag />
      </h2>
      <ol className="trend-list">
        {tags.map((tag, i) => (
          <li key={tag}>
            <span className={`rank rk${i % 5}`}>{i + 1}</span>
            <span className="tag">{tag}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BirthdaysCard({ members }: { members: Member[] }) {
  return (
    <section className="card rail-card" aria-label="Birthdays soon">
      <div className="card-top">
        <h2 className="rail-title">
          BIRTHDAYS SOON <Icon name="crown" size={16} fill /> <SampleTag />
        </h2>
        <button type="button" className="icon-plain sm" aria-label="Birthday options" data-stub="Birthday options">
          <Icon name="more" size={20} />
        </button>
      </div>
      <ul className="bday-list">
        {members.map((m) => (
          <li key={m.id}>
            <Avatar name={m.name} color={m.color} size={48} src={m.avatarUrl} />
            <strong>{m.name}</strong>
            <span>{m.birthday}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}



function QuickActions({ onNavigate }: { onNavigate: (path: string) => void }) {
  const actions = [
    { title: "Find your people", detail: "Meet LYKYOUs who get you", icon: "users" as IconName, tone: "violet", path: "/members" },
    { title: "Make memories", detail: "Share moments with the community", icon: "image" as IconName, tone: "teal", path: "/community" },
    { title: "Build together", detail: "Join a fan project or start one", icon: "projects" as IconName, tone: "pink", path: "/fan-project-wall" },
  ];
  return (
    <section className="quick-actions" aria-label="Explore your universe">
      <div className="quick-actions-heading"><div><span className="section-kicker">YOUR UNIVERSE, TODAY</span><h2>Make this space yours</h2></div><span className="quick-actions-note">Your people are here.</span></div>
      <div className="quick-actions-grid">
        {actions.map((item) => <button type="button" className="quick-action-card" key={item.title} onClick={() => onNavigate(item.path)}>
          <span className={`quick-action-icon ${item.tone}`}><Icon name={item.icon} size={24}/></span>
          <span className="quick-action-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
          <span className="quick-action-arrow" aria-hidden="true">↗</span>
        </button>)}
      </div>
    </section>
  );
}

function FiveStarsCard({ members }: { members: Member[] }) {
  return (
    <section className="card rail-card five-stars-card" aria-label="LYKN members">
      <h2 className="rail-title">OUR FIVE STARS <Icon name="star" size={16} fill /></h2>
      <p className="five-stars-note">The five members at the heart of our universe.</p>
      <div className="five-stars-grid">
        {members.map((member) => <div className="five-star" key={member.id}>
          <Avatar name={member.name} color={member.color} size={54} src={member.avatarUrl}/>
          <strong>{member.name}</strong>
        </div>)}
      </div>
      <p className="five-stars-foot">Member portraits appear here when added by the fanclub admins.</p>
    </section>
  );
}

/* ---------------------------------------------------------------- mobile */

function Stories({ stories }: { stories: Story[] }) {
  return (
    <ul className="stories" aria-label="Stories">
      {stories.map((s) => (
        <li key={s.id}>
          <button type="button" className="story" data-stub="Viewing stories">
            <span className="story-ring" style={{ "--c": s.color } as CSSProperties}>
              {s.isOwn ? <Mascot size={54} className="story-cat" /> : <Avatar name={s.name} color={s.color} size={54} ring={false} />}
              {s.isOwn ? (
                <span className="story-plus" aria-hidden="true">
                  <Icon name="plus" size={12} />
                </span>
              ) : null}
            </span>
            <span className="story-name">{s.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MobileNav({
  nav,
  active,
  onSelect,
  onMenu,
  menuOpen,
}: {
  nav: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  onMenu: () => void;
  menuOpen: boolean;
}) {
  /* Five destinations + More. Anything else lives in the drawer. */
  const primary = nav.filter((n) => n.group === "main").slice(0, 5);
  const moreActive = !primary.some((n) => n.id === active);

  return (
    <nav className="mobile-nav" aria-label="Quick navigation">
      {primary.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? "active" : ""}
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => onSelect(item.id)}
        >
          <span className="mn-icon">
            <Icon name={item.icon} size={24} />
          </span>
          <small>{item.shortLabel ?? item.label}</small>
        </button>
      ))}
      <button
        type="button"
        className={`mn-more${moreActive ? " active" : ""}`}
        aria-label="More"
        aria-expanded={menuOpen}
        aria-controls="sidebar"
        onClick={onMenu}
      >
        <span className="mn-icon">
          <Icon name="menu" size={24} />
          {nav.some((n) => n.group === "personal" && n.badge) && <span className="mn-dot" />}
        </span>
        <small>More</small>
      </button>
    </nav>
  );
}

/* -------------------------------------------------------------------- app */

function HomeDashboard() {
  const navigate = useNavigate();
  const [feedRefresh, setFeedRefresh] = useState(0);
  const data = useHomeData(feedRefresh);
  const { user } = useAuth();
  const { isStaff } = useStaffRole();
  const navItems: NavItem[] = isStaff ? [...data.nav, { id: "admin", label: "Admin HQ", shortLabel: "Admin", icon: "settings", group: "personal" }] : data.nav;
  const [notice, setNotice] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false); // small screens
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  async function togglePostRelation(postId: string, table: "post_likes" | "bookmarks", active: boolean) {
    if (!user) { navigate("/login"); return; }
    if (!supabase) return;
    const query = supabase.from(table);
    const result = active
      ? await query.delete().eq("post_id", postId).eq("user_id", user.id)
      : await query.insert({ post_id: postId, user_id: user.id });
    if (result.error) setNotice(result.error.message);
    else setFeedRefresh((value) => value + 1);
  }

  async function publishPost() {
    if (!draft.trim()) return;
    if (!user) { setNotice("Sign in to share a post with the community."); navigate("/login"); return; }
    if (!supabase) { setNotice("Live posting will be available when the Supabase project is connected."); return; }
    setPosting(true);
    const { error } = await supabase.from("posts").insert({ author_id: user.id, body: draft.trim(), post_type: "text", visibility: "public", status: "published" });
    setPosting(false);
    if (error) { setNotice(error.message); return; }
    setDraft(""); setNotice("Your post has been published."); setFeedRefresh((value) => value + 1);
  }

  const unread = navItems.find((n) => n.id === "notifications")?.badge ?? 0;
  const isSmall = () => window.matchMedia("(max-width: 900px)").matches;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const toggleMenu = () => { if (isSmall()) setDrawerOpen((v) => !v); };

  /* Only Home exists so far. Other destinations explain that instead of pretending to navigate. */
  const routeById: Record<string, string> = {
    home: "/", community: "/community", discover: "/discover", funzone: "/fun-zone", admin: "/admin",
    bias: "/bias-corner", projects: "/fan-project-wall", events: "/events-countdowns",
    fandom: "/fandom-hub", universe: "/lykn-universe", updates: "/updates",
    friends: "/members", groups: "/groups",
    profile: user ? "/profile" : "/login",
    notifications: user ? "/notifications" : "/login",
    bookmarks: user ? "/bookmarks" : "/login",
    settings: user ? "/settings" : "/login",
  };
  const select = (id: string) => {
    setDrawerOpen(false);
    const route = routeById[id];
    if (route) {
      navigate(route);
      return;
    }
    const label = data.nav.find((n) => n.id === id)?.label ?? "This page";
    setNotice(`${label} will be available after the member account features are connected.`);
  };

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);

  /* Controls marked data-stub are visual only. Pressing one explains that, rather than doing nothing. */
  const stubLabel = (target: EventTarget, selector: string): string | null => {
    const el = (target as Element).closest(selector);
    return el ? el.getAttribute("data-stub") : null;
  };
  const onRootClick = (e: { target: EventTarget }) => {
    const label = stubLabel(e.target, "button[data-stub]");
    if (label) setNotice(`${label} isn’t connected yet. This is a preview.`);
  };
  const onRootSubmit = (e: { target: EventTarget; preventDefault: () => void }) => {
    e.preventDefault();
    const label = stubLabel(e.target, "form[data-stub]");
    if (label) setNotice(`${label} isn’t connected yet. This is a preview.`);
  };

  return (
    <div className="app" onClick={onRootClick} onSubmit={onRootSubmit}>
      <div className="sky" aria-hidden="true" />

      <Sidebar nav={navItems} active={ACTIVE_PAGE} open={drawerOpen} hidden={false} onSelect={select} />
      {drawerOpen && <button type="button" className="backdrop" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />}

      <div className="shell">
        <TopBar
          viewerName={user?.user_metadata?.display_name ?? data.viewer.displayName}
          viewerAvatar={data.viewer.avatarUrl}
          unread={unread}
          menuOpen={drawerOpen}
          onMenu={toggleMenu}
          onAccount={() => navigate(user ? "/profile" : "/login")}
          onSearch={(query) => navigate(query.trim() ? "/members?search=" + encodeURIComponent(query.trim()) : "/members")}
          onCreate={() => navigate(user ? "/community" : "/login")}
          onNotifications={() => navigate(user ? "/notifications" : "/login")}
        />

        <main className="main">
          {!data.isLive && <p className="preview-strip">Preview mode · connect Supabase and apply the database setup to load live member content</p>}
          <Hero chips={data.chips} heroImageUrl={data.heroImageUrl} />
          <QuickActions onNavigate={(path) => navigate(path)} />

          <Stories stories={data.stories} />

          <div className="home-grid">
            <div className="feed">
              <Composer draft={draft} onDraft={setDraft} onSubmit={() => void publishPost()} disabled={posting} />
              {data.posts.map((post) => (
                <PostCard key={post.id} post={post}
                  onLike={() => void togglePostRelation(post.id, "post_likes", !!post.liked)}
                  onBookmark={() => void togglePostRelation(post.id, "bookmarks", !!post.bookmarked)}
                  onComment={() => navigate("/community?post=" + encodeURIComponent(post.id))}
                />
              ))}
            </div>

            <aside className="rail" aria-label="Community highlights">
              {data.event ? <EventCard event={data.event} onOpen={() => navigate("/events-countdowns")} /> : null}
              <FiveStarsCard members={data.universeMembers} />
              {data.trending.length ? <TrendingCard tags={data.trending} /> : null}
              {data.birthdays.length ? <BirthdaysCard members={data.birthdays} /> : null}
            </aside>
          </div>

          <footer className="page-foot">
            <p>
              LYKYOU Space is made and operated by LYKN India Fanclub. Not affiliated with LYKN or
              GMMTV.
            </p>
            {SHOW_PREVIEW_NOTICE && (
              <p>
                Community posts, events, countdowns and member portraits are loaded from the connected space database. Member photos appear here once the fanclub adds approved portraits.
              </p>
            )}
          </footer>
        </main>
      </div>

      <div className="toast-region" role="status" aria-live="polite">
        {notice ? <p className="toast">{notice}</p> : null}
      </div>

      <MobileNav nav={navItems} active={ACTIVE_PAGE} onSelect={select} onMenu={toggleMenu} menuOpen={drawerOpen} />
    </div>
  );
}

export default HomeDashboard;
