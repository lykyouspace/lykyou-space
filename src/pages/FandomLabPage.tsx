import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, CalendarClock, Check, Compass, Copy, ExternalLink, Globe2, Heart, Link2, ListMusic, Lock, Music2, RefreshCw, Shuffle, Sparkles, Ticket, Trophy, WandSparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import "./fandom-lab.css";

type ArchiveEntry = { id: string; content_type: string; title: string; description: string; member_name: string | null; event_date: string | null; source_url: string | null };
type Song = { key: string; title: string; artist: string; url: string | null; source: string };
const members = ["WILLIAM", "LEGO", "NUT", "HONG", "TUI"];
const passportTasks = ["Visit the member's LYKN Universe hub", "Listen to a song or project connected to them", "Watch a verified performance or video", "Share a positive appreciation message", "Discover something new about their work"];
const bingoPrompts = ["Rewatched a favourite stage", "Saved a LYKN song", "Found a new LYKYOU", "Joined a fan project", "Played a Space game", "Shared a LYKN update", "Explored a member hub", "Made a playlist", "Voted in a weekly chart", "Joined an online event", "Learned a new fact", "Recommended LYKN to a friend", "Celebrated OT5", "Found a new performance", "Left a kind comment", "Joined a streaming party", "Visited the Music Library", "Tried a new game", "Shared a fandom memory", "Checked LYKN updates", "Supported a fan project", "Discovered an OST", "Met a fan with another bias", "Used a Space countdown"];
const crosswordClues = [
  { clue: "The five-member group at the centre of this community", answer: "LYKN" },
  { clue: "The fandom name used in LYKYOU Space", answer: "LYKYOU" },
  { clue: "Member whose name starts with W", answer: "WILLIAM" },
  { clue: "Member whose name starts with L", answer: "LEGO" },
  { clue: "Member whose name starts with N", answer: "NUT" },
  { clue: "Member whose name starts with H", answer: "HONG" },
  { clue: "Member whose name starts with T", answer: "TUI" },
];
const story = [
  { title: "A new corner of the galaxy", text: "You open LYKYOU Space and find a quiet little music room, a buzzing project wall and a trail of glowing stars. Where will you begin?", choices: [{ label: "Follow the music", next: 1 }, { label: "Find the project crew", next: 2 }] },
  { title: "The listening room", text: "A song starts playing. Other LYKYOUs are sharing the tracks that brought them here. You add your own pick and discover a new favourite.", choices: [{ label: "Build a setlist together", next: 3 }, { label: "Explore the member hubs", next: 4 }] },
  { title: "The project wall", text: "You meet fans from different places, each bringing a different skill. A small idea turns into a team effort.", choices: [{ label: "Help with a mission", next: 5 }, { label: "Invite another LYKYOU", next: 4 }] },
  { title: "A shared encore", text: "Your setlist is ready. It has high-energy openers, favourite vocals and a closing song everyone can sing along to.", choices: [{ label: "Replay the story", next: 0 }, { label: "Finish this chapter", next: 6 }] },
  { title: "The member constellation", text: "You explore the five member hubs, find performances and projects, and leave with even more to discover.", choices: [{ label: "Return to the music room", next: 1 }, { label: "Finish this chapter", next: 6 }] },
  { title: "A mission accomplished", text: "The team makes progress because everyone contributed something different. Your little part helped the whole fandom move forward.", choices: [{ label: "Start another adventure", next: 0 }, { label: "Finish this chapter", next: 6 }] },
  { title: "Your place in the galaxy", text: "The best part wasn't finishing a task. It was finding people who love the same things and making something together. Your story can continue whenever you return.", choices: [{ label: "Start again", next: 0 }] },
];

async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); return true; } catch { return false; }
}

export default function FandomLabPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("roulette");
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [roulette, setRoulette] = useState<Song | null>(null);
  const [setlist, setSetlist] = useState<Song[]>([]);
  const [storyStep, setStoryStep] = useState(0);
  const [bias, setBias] = useState("WILLIAM");
  const [passport, setPassport] = useState<Record<string, boolean>>({});
  const [bingo, setBingo] = useState<string[]>([]);
  const [bingoChecked, setBingoChecked] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [watchTitle, setWatchTitle] = useState("LYKN watch party");
  const [watchDate, setWatchDate] = useState("");
  const [watchTime, setWatchTime] = useState("20:00");
  const [watchUrl, setWatchUrl] = useState("");
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistNote, setPlaylistNote] = useState("");
  const [capsuleText, setCapsuleText] = useState("");
  const [capsuleDate, setCapsuleDate] = useState("");
  const [capsuleSaved, setCapsuleSaved] = useState<any>(null);
  const [capsuleDraft, setCapsuleDraft] = useState<any>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const [archiveResult, tracksResult, countResult] = await Promise.all([
        supabase.from("lykn_universe_content").select("id,content_type,title,description,member_name,event_date,source_url").in("content_type", ["release","solo_release","ost","collaboration","timeline","achievement","performance","music_video"]).order("event_date", { ascending: true, nullsFirst: false }).limit(150),
        supabase.from("music_tracks").select("track_uri,title,artist,spotify_url").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_visibility", "public"),
      ]);
      if (!active) return;
      if (archiveResult.error) setError(archiveResult.error.message); else setArchive((archiveResult.data ?? []) as ArchiveEntry[]);
      if (!tracksResult.error) setTracks(tracksResult.data ?? []);
      if (!countResult.error) setMemberCount(countResult.count ?? 0);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lykyou-space-bias-passport-v1");
      if (saved) setPassport(JSON.parse(saved));
      const capsule = localStorage.getItem("lykyou-space-time-capsule-v1");
      if (capsule) setCapsuleSaved(JSON.parse(capsule));
    } catch { /* Local-only tools can safely start fresh if browser storage is unavailable. */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("lykyou-space-bias-passport-v1", JSON.stringify(passport)); } catch { /* Optional local progress. */ } }, [passport]);

  const songs = useMemo<Song[]>(() => {
    const fromPlayer: Song[] = tracks.map((track:any) => ({ key:track.track_uri, title:track.title, artist:track.artist, url:track.spotify_url, source:"Space player" }));
    const fromArchive: Song[] = archive.filter((item) => ["release","solo_release","ost","collaboration"].includes(item.content_type)).map((item) => ({ key:item.id, title:item.title, artist:item.member_name || "LYKN", url:item.source_url, source:item.content_type.replace("_"," ") }));
    return [...new Map([...fromPlayer,...fromArchive].map((song) => [song.title.toLowerCase()+"|"+song.artist.toLowerCase(),song])).values()];
  }, [tracks, archive]);
  const timeline = useMemo(() => archive.filter((item) => item.content_type === "timeline" || item.content_type === "achievement").sort((a,b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999")), [archive]);
  const passportDone = passportTasks.filter((_,i) => passport[bias+":"+i]).length;
  const checkedAnswers = crosswordClues.filter((clue,i) => (answers[i] ?? "").trim().toUpperCase() === clue.answer).length;

  function pickRoulette() {
    if (!songs.length) { setNotice("The roulette will be ready once the Music Library has tracks to draw from."); return; }
    setRoulette(songs[Math.floor(Math.random()*songs.length)]);
  }
  function addSong(song: Song) { if (!setlist.some((item) => item.key === song.key)) setSetlist((current) => [...current,song]); }
  function moveSong(index:number, direction:number) {
    setSetlist((current) => { const next=[...current]; const target=index+direction; if(target<0||target>=next.length)return current; [next[index],next[target]]=[next[target],next[index]]; return next; });
  }
  function shuffleBingo() {
    const shuffled=[...bingoPrompts].sort(()=>Math.random()-.5).slice(0,24);
    const next=[...shuffled.slice(0,12),"FREE SPACE",...shuffled.slice(12)];
    setBingo(next); setBingoChecked([]);
  }
  function saveCapsule() {
    if (!capsuleText.trim() || !capsuleDate) { setNotice("Add a message and a reveal date first."); return; }
    const record={text:capsuleText.trim(),revealDate:capsuleDate,createdAt:new Date().toISOString()};
    try { localStorage.setItem("lykyou-space-time-capsule-v1",JSON.stringify(record)); setCapsuleSaved(record); setCapsuleDraft(null); setNotice("Your time capsule is saved on this device."); }
    catch { setNotice("This browser couldn't save the capsule. Copy your message somewhere safe."); }
  }
  const capsuleUnlocked = capsuleSaved ? new Date(capsuleSaved.revealDate+"T00:00:00").getTime() <= Date.now() : false;

  const tabs = [
    ["roulette","Song Roulette"],["setlist","Setlist Creator"],["eras","Era Explorer"],["story","Story Mode"],["passport","Bias Passport"],["memory","Memory Lane"],["crossword","Crossword"],["bingo","Bingo Generator"],["watch","Watch Party"],["playlists","Playlist Exchange"],["capsule","Time Capsule"],["missions","Project Missions"],["global","Global Board"],
  ];

  return <section className="fandom-lab-page">
    <header className="fandom-lab-hero"><div><span className="fandom-lab-eyebrow">EXPERIMENT · PLAY · MAKE MEMORIES</span><h2>LYKYOU <em>Experience Lab</em></h2><p>Little tools and fandom adventures for every kind of LYKYOU. Your progress in these mini-tools stays on this device unless a feature says otherwise.</p></div><WandSparkles size={76}/></header>
    <nav className="fandom-lab-tabs" aria-label="Experience Lab tools">{tabs.map(([key,label]) => <button key={key} className={tab===key?"active":""} onClick={()=>{setTab(key);setNotice("");setError("");}}>{label}</button>)}</nav>
    {notice && <p className="fandom-lab-notice" role="status">{notice}</p>}
    {error && <p className="fandom-lab-error" role="alert">{error}</p>}
    {loading && <p className="fandom-lab-empty">Loading your LYKN content…</p>}

    {!loading && tab==="roulette" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">CAN'T PICK A SONG?</span><h3><Shuffle/> Song Roulette</h3><p>Let the Space pick a track from the Music Library and verified archive entries it can access.</p><button className="fandom-lab-primary" onClick={pickRoulette}>Spin the roulette</button>{roulette && <article className="fandom-lab-result"><Music2/><div><strong>{roulette.title}</strong><span>{roulette.artist} · {roulette.source}</span></div>{roulette.url && <a href={roulette.url} target="_blank" rel="noreferrer">Open <ExternalLink size={13}/></a>}</article>}{!songs.length && <p className="fandom-lab-muted">No tracks are indexed yet. Start with the embedded player in <Link to="/music-library">Music Library</Link>.</p>}</section>}

    {!loading && tab==="setlist" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">BUILD YOUR DREAM CONCERT</span><h3><ListMusic/> Dream Concert Setlist Creator</h3><p>Add songs, arrange the order and split the show in your imagination. The setlist is temporary in this browser and can be copied as text.</p><div className="fandom-lab-two-col"><div><h4>Available songs</h4><div className="fandom-lab-song-options">{songs.map((song)=><button key={song.key} onClick={()=>addSong(song)} disabled={setlist.some((item)=>item.key===song.key)}><span>{song.title}<small>{song.artist}</small></span><b>{setlist.some((item)=>item.key===song.key)?"Added":"+"}</b></button>)}</div></div><div><h4>Your setlist · {setlist.length} songs</h4>{setlist.length===0?<p className="fandom-lab-muted">Choose songs from the library to start building your set.</p>:<ol className="fandom-lab-setlist">{setlist.map((song,i)=><li key={song.key}><span>{song.title}<small>{song.artist}</small></span><button aria-label="Move song up" onClick={()=>moveSong(i,-1)} disabled={i===0}><ArrowUp size={14}/></button><button aria-label="Move song down" onClick={()=>moveSong(i,1)} disabled={i===setlist.length-1}><ArrowDown size={14}/></button><button aria-label="Remove song" onClick={()=>setSetlist((current)=>current.filter((item)=>item.key!==song.key))}>×</button></li>)}</ol>}<button className="fandom-lab-secondary" disabled={!setlist.length} onClick={async()=>setNotice(await copyText(setlist.map((song,i)=>(i+1)+". "+song.title+" — "+song.artist).join("\n"))?"Setlist copied.":"Copy isn't available in this browser.")}><Copy size={14}/> Copy setlist</button></div></div></section>}

    {!loading && tab==="eras" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">EXPLORE RELEASES & PROJECTS</span><h3><Compass/> Era Explorer</h3><p>Browse dated releases and projects from the existing LYKN archive. Entries without verified dates stay in the undated group rather than being assigned an invented era.</p>{Object.entries(archive.filter((item)=>["release","solo_release","ost","collaboration","music_video","performance"].includes(item.content_type)).reduce((acc:Record<string,ArchiveEntry[]>,item)=>{const year=item.event_date?item.event_date.slice(0,4):"Date not listed";(acc[year]??=[]).push(item);return acc;},{})).sort(([a],[b])=>a==="Date not listed"?1:b==="Date not listed"?-1:b.localeCompare(a)).map(([year,items])=><div className="fandom-lab-era" key={year}><h4>{year}</h4><div>{items.map((item)=><article key={item.id}><strong>{item.title}</strong><span>{item.member_name||"LYKN"} · {item.content_type.replace("_"," ")}</span>{item.source_url&&<a href={item.source_url} target="_blank" rel="noreferrer">Open source <ExternalLink size={12}/></a>}</article>)}</div></div>)}</section>}

    {!loading && tab==="story" && <section className="fandom-lab-panel fandom-story-panel"><span className="fandom-lab-eyebrow">A CHOOSE-YOUR-PATH MINI ADVENTURE</span><h3><BookOpen/> Story Mode</h3><div className="fandom-story-chapter"><small>CHAPTER {storyStep+1}</small><h4>{story[storyStep].title}</h4><p>{story[storyStep].text}</p><div>{story[storyStep].choices.map((choice)=><button key={choice.label} onClick={()=>setStoryStep(choice.next)}>{choice.label} <Sparkles size={14}/></button>)}</div></div></section>}

    {!loading && tab==="passport" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">YOUR PERSONAL FAN JOURNEY</span><h3><Ticket/> Bias Passport</h3><p>Choose a member and tick off your little discovery missions. Progress is saved only in this browser.</p><div className="fandom-lab-member-picker">{members.map((name)=><button className={bias===name?"active":""} key={name} onClick={()=>setBias(name)}>{name}</button>)}</div><div className="fandom-lab-progress"><span>{passportDone} / {passportTasks.length} missions completed</span><div><i style={{width:(passportDone/passportTasks.length*100)+"%"}}/></div></div><div className="fandom-lab-checklist">{passportTasks.map((task,i)=><label key={task}><input type="checkbox" checked={!!passport[bias+":"+i]} onChange={(event)=>setPassport((current)=>({...current,[bias+":"+i]:event.target.checked}))}/><span>{task}</span></label>)}</div></section>}

    {!loading && tab==="memory" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">THE MOMENTS THAT SHAPED THE JOURNEY</span><h3><Heart/> Memory Lane</h3><p>Milestones and achievements already recorded in the LYKN Universe timeline.</p>{timeline.length===0?<p className="fandom-lab-muted">Timeline entries will appear here as they are added to LYKN Universe.</p>:<div className="fandom-memory-list">{timeline.map((item)=><article key={item.id}><time>{item.event_date??"Date not listed"}</time><div><strong>{item.title}</strong><p>{item.description}</p></div></article>)}</div>}<Link to="/lykn-universe">Explore LYKN Universe <ExternalLink size={13}/></Link></section>}

    {!loading && tab==="crossword" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">A QUICK FANDOM WORD CHALLENGE</span><h3><BookOpen/> LYKN Crossword Challenge</h3><p>Answer each clue using the group and member names. Answers are checked locally; no scores or answers are uploaded.</p><div className="fandom-crossword-clues">{crosswordClues.map((item,i)=><label key={item.clue}><span><b>{i+1}.</b> {item.clue} <small>{item.answer.length} letters</small></span><input value={answers[i]??""} onChange={(event)=>setAnswers((current)=>({...current,[i]:event.target.value.toUpperCase()}))} maxLength={10} placeholder="Your answer"/></label>)}</div><div className="fandom-lab-progress"><span>{checkedAnswers} / {crosswordClues.length} correct</span><div><i style={{width:(checkedAnswers/crosswordClues.length*100)+"%"}}/></div></div><button className="fandom-lab-secondary" onClick={()=>setAnswers({})}><RefreshCw size={14}/> Reset puzzle</button></section>}

    {!loading && tab==="bingo" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">MAKE YOUR OWN FANDOM CARD</span><h3><Trophy/> LYKN Bingo Generator</h3><p>Generate a fresh 5 × 5 challenge card. Mark the moments you've experienced and make a new card whenever you like.</p><button className="fandom-lab-primary" onClick={shuffleBingo}>Generate / shuffle card</button>{bingo.length>0&&<div className="fandom-bingo-grid">{bingo.map((prompt,i)=><button key={i} className={bingoChecked.includes(prompt)?"checked":""} onClick={()=>setBingoChecked((current)=>current.includes(prompt)?current.filter((item)=>item!==prompt):[...current,prompt])}>{prompt==="FREE SPACE"?"✦ FREE SPACE":prompt}</button>)}</div>}</section>}

    {!loading && tab==="watch" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">PLAN A SHARED WATCH SESSION</span><h3><CalendarClock/> Watch Party Planner</h3><p>Create a shareable plan for an external video or livestream. This planner doesn't host or rebroadcast video.</p><div className="fandom-lab-form"><label>Watch party title<input value={watchTitle} onChange={(e)=>setWatchTitle(e.target.value)} maxLength={100}/></label><div className="fandom-lab-form-row"><label>Date<input type="date" value={watchDate} onChange={(e)=>setWatchDate(e.target.value)}/></label><label>Time (IST)<input type="time" value={watchTime} onChange={(e)=>setWatchTime(e.target.value)}/></label></div><label>Video / livestream link<input value={watchUrl} onChange={(e)=>setWatchUrl(e.target.value)} placeholder="https://…"/></label><button className="fandom-lab-primary" onClick={async()=>{if(!watchDate||!watchUrl.startsWith("https://")){setNotice("Add a date and a valid HTTPS video link.");return;}setNotice(await copyText(watchTitle+"\n"+watchDate+" · "+watchTime+" IST\nWatch together: "+watchUrl)?"Watch party details copied. Share them with your group!":"Copy isn't available in this browser.");}}> <Copy size={14}/> Copy watch party invite</button></div></section>}

    {!loading && tab==="playlists" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">SHARE WHAT YOU'RE LISTENING TO</span><h3><Link2/> Playlist Exchange</h3><p>Share Spotify or YouTube Music playlist links with other LYKYOUs. Links stay external; Space doesn't upload or store playlist media.</p><div className="fandom-lab-form"><label>Playlist name<input value={playlistTitle} onChange={(e)=>setPlaylistTitle(e.target.value)} maxLength={100} placeholder="My LYKN favourites"/></label><label>Playlist URL<input value={playlistUrl} onChange={(e)=>setPlaylistUrl(e.target.value)} placeholder="Spotify or YouTube Music link"/></label><label>Why should others listen?<textarea value={playlistNote} onChange={(e)=>setPlaylistNote(e.target.value)} maxLength={400} rows={3}/></label><button className="fandom-lab-primary" onClick={async()=>{const valid=/^https:\/\/(open\.spotify\.com|music\.youtube\.com|youtube\.com)\//i.test(playlistUrl);if(!playlistTitle.trim()||!valid){setNotice("Add a playlist name and a valid Spotify / YouTube Music URL.");return;}setNotice(await copyText(playlistTitle+"\n"+playlistNote+"\n"+playlistUrl)?"Playlist share text copied. Post it in Community!":"Copy isn't available in this browser.");}}><Copy size={14}/> Copy playlist share text</button></div><Link to="/community">Go to Community to share it <ExternalLink size={13}/></Link></section>}

    {!loading && tab==="capsule" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">A NOTE FOR YOUR FUTURE SELF</span><h3><Lock/> LYKYOU Time Capsule</h3><p>Write a message to your future self and choose a reveal date. It is saved locally in this browser, not in your account or Supabase.</p>{capsuleSaved&&!capsuleUnlocked?<div className="fandom-capsule-locked"><Lock/><strong>Your capsule is sealed until {capsuleSaved.revealDate}.</strong><span>Open this Space on the same device after the reveal date.</span></div>:capsuleSaved&&capsuleUnlocked?<div className="fandom-capsule-open"><Sparkles/><strong>Your time capsule is ready</strong><p>{capsuleSaved.text}</p><button className="fandom-lab-secondary" onClick={()=>{localStorage.removeItem("lykyou-space-time-capsule-v1");setCapsuleSaved(null);setCapsuleText("");setCapsuleDate("");}}>Close and clear capsule</button></div>:<div className="fandom-lab-form"><label>Your message<textarea rows={5} maxLength={2000} value={capsuleText} onChange={(e)=>setCapsuleText(e.target.value)} placeholder="What do you want your future self to remember?"/></label><label>Reveal date<input type="date" min={new Date().toISOString().slice(0,10)} value={capsuleDate} onChange={(e)=>setCapsuleDate(e.target.value)}/></label><button className="fandom-lab-primary" onClick={saveCapsule}>Seal my time capsule</button></div>}</section>}

    {!loading && tab==="missions" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">SMALL ACTIONS, BIG FANDOM ENERGY</span><h3><Sparkles/> Fan Project Missions</h3><p>Pick a practical way to support a fan initiative. Project tasks and volunteer coordination live in the Fandom Hub, so progress is managed in one place.</p><div className="fandom-mission-grid"><article><b>01 · Discover</b><strong>Find a project that interests you</strong><Link to="/fan-project-wall">Browse the Fan Project Wall <ExternalLink size={13}/></Link></article><article><b>02 · Contribute</b><strong>Choose a task that fits your skills</strong><Link to="/fandom-hub">Explore Fandom Hub <ExternalLink size={13}/></Link></article><article><b>03 · Celebrate</b><strong>Share progress and thank the team</strong><Link to="/community">Celebrate in Community <ExternalLink size={13}/></Link></article></div></section>}

    {!loading && tab==="global" && <section className="fandom-lab-panel"><span className="fandom-lab-eyebrow">A WORLDWIDE FANDOM</span><h3><Globe2/> Global LYKYOU Board</h3><div className="fandom-global-stat"><strong>{memberCount===null?"—":memberCount}</strong><span>public member profiles</span></div><p>Meet LYKYOUs from around the world through the member directory. A country-by-country map is not enabled yet because location fields are private by default; we'll only add a public country board with an explicit opt-in from each member.</p><Link to="/members">Meet the LYKYOUs <ExternalLink size={13}/></Link></section>}
  </section>;
}
