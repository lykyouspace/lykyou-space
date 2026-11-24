import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Headphones, Music2, Play, RefreshCw, Trophy, Vote, Disc3, Info } from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import "./music-hub.css";

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: any) => void;
    __spotifyIframeAPI?: any;
  }
}

type MusicTrack = { track_uri: string; title: string; artist: string; artwork_url: string | null; spotify_url?: string; play_count?: number; vote_count?: number; rank_no?: number };
const SPOTIFY_PLAYLIST = "https://open.spotify.com/playlist/14wIpQfJrUSpDjOAbk0Egj";
const SPOTIFY_URI = "spotify:playlist:14wIpQfJrUSpDjOAbk0Egj";

function istToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function mondayOf(dateText: string) {
  const date = new Date(dateText + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
function spotifyTrackId(uri: string) { return uri.startsWith("spotify:track:") ? uri.split(":").pop() ?? "" : ""; }

export default function MusicHubPage() {
  const { user } = useAuth();
  const [pool, setPool] = useState<MusicTrack[]>([]);
  const [rankings, setRankings] = useState<MusicTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<MusicTrack[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastPlayed, setLastPlayed] = useState("");
  const [query, setQuery] = useState("");
  const controllerRef = useRef<any>(null);
  const countedRef = useRef<Set<string>>(new Set());
  const playerHostRef = useRef<HTMLDivElement>(null);
  const today = istToday();
  const weekStart = mondayOf(today);

  const refresh = useCallback(async () => {
    if (!supabase || !user) { setPool([]); setRankings([]); setRecentTracks([]); setLoading(false); return; }
    setLoading(true);
    const [poolResult, rankingResult, tracksResult, voteResult] = await Promise.all([
      supabase.rpc("get_weekly_music_pool"),
      supabase.rpc("get_weekly_music_results", { p_week_start: weekStart }),
      supabase.from("music_tracks").select("track_uri,title,artist,artwork_url,spotify_url,created_at").order("created_at", { ascending: false }).limit(60),
      supabase.from("music_weekly_votes").select("track_uri").eq("user_id", user.id).eq("vote_date", today).maybeSingle(),
    ]);
    if (poolResult.error) setError(poolResult.error.message);
    else setPool((poolResult.data ?? []) as MusicTrack[]);
    if (rankingResult.error) setError(rankingResult.error.message);
    else setRankings((rankingResult.data ?? []) as MusicTrack[]);
    if (tracksResult.error) setError(tracksResult.error.message);
    else setRecentTracks((tracksResult.data ?? []) as MusicTrack[]);
    if (voteResult.error && !voteResult.error.message.toLowerCase().includes("0 rows")) setError(voteResult.error.message);
    setMyVote(voteResult.data?.track_uri ?? null);
    setLoading(false);
  }, [user?.id, today, weekStart]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const client = supabase;
    if (!playerHostRef.current) return;
    let alive = true;
    let embed: any = null;
    const setup = (api: any) => {
      if (!alive || !playerHostRef.current || controllerRef.current) return;
      api.createController(playerHostRef.current, { uri: SPOTIFY_URI, width: "100%", height: "352" }, (created: any) => {
        if (!alive) { created.destroy?.(); return; }
        embed = created;
        controllerRef.current = created;
        created.addListener("playback_update", async (event: any) => {
          const data = event?.data;
          const uri = String(data?.playingURI ?? "");
          if (!uri.startsWith("spotify:track:") || data?.isPaused || data?.isBuffering || Number(data?.position ?? 0) < 30000 || countedRef.current.has(uri) || !user || !client) return;
          countedRef.current.add(uri);
          const id = spotifyTrackId(uri);
          const trackUrl = "https://open.spotify.com/track/" + id;
          let title = "LYKN track";
          let artist = "LYKN";
          let artwork: string | null = null;
          try {
            const response = await fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent(trackUrl));
            if (response.ok) {
              const metadata = await response.json();
              title = String(metadata.title ?? title).slice(0, 180);
              artist = String(metadata.author_name ?? artist).slice(0, 120);
              artwork = typeof metadata.thumbnail_url === "string" ? metadata.thumbnail_url : null;
            }
          } catch { /* Listening can still be recorded with a safe fallback title. */ }
          const { error: listenError } = await client.rpc("record_music_listen", {
            p_track_uri: uri, p_title: title, p_artist: artist, p_artwork_url: artwork,
          });
          if (listenError) setError(listenError.message);
          else {
            setLastPlayed(title);
            setMessage("Your listen was counted after 30 seconds of playback. One eligible play per song, per member, per day.");
            void refresh();
          }
        });
      });
    };
    window.onSpotifyIframeApiReady = (api: any) => { window.__spotifyIframeAPI = api; setup(api); };
    if (window.__spotifyIframeAPI) setup(window.__spotifyIframeAPI);
    let script = document.querySelector<HTMLScriptElement>('script[data-spotify-iframe-api="true"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      script.dataset.spotifyIframeApi = "true";
      document.body.appendChild(script);
    }
    return () => {
      alive = false;
      try { embed?.destroy?.(); } catch { /* Ignore teardown errors from a removed embed. */ }
      controllerRef.current = null;
    };
  }, [user?.id, refresh]);

  async function castVote(trackUri: string) {
    if (!supabase || !user || myVote || voting) return;
    setVoting(true); setError(""); setMessage("");
    const { error: voteError } = await supabase.from("music_weekly_votes").insert({
      user_id: user.id, week_start: weekStart, vote_date: today, track_uri: trackUri,
    });
    if (voteError) setError(voteError.code === "23505" ? "Your daily vote has already been submitted. Votes are final." : voteError.message);
    else {
      setMyVote(trackUri);
      setMessage("Your vote is final. Thanks for taking part in this week's LYKYOU ranking!");
      await refresh();
    }
    setVoting(false);
  }

  const filteredTracks = useMemo(() => recentTracks.filter((track) => (track.title + " " + track.artist).toLowerCase().includes(query.toLowerCase())), [recentTracks, query]);

  return <section className="music-hub-page">
    <header className="music-hub-hero">
      <div className="music-hub-hero-copy">
        <span className="music-hub-eyebrow">LISTEN · DISCOVER · CELEBRATE</span>
        <h2>LYKYOU <em>Music Library</em></h2>
        <p>Your LYKN listening corner — explore the playlist, discover songs and help shape the weekly fan chart.</p>
        <a href={SPOTIFY_PLAYLIST} target="_blank" rel="noreferrer">Open Spotify playlist <ExternalLink size={14}/></a>
      </div>
      <div className="music-hub-hero-art"><Disc3 size={112}/><span>✦</span></div>
    </header>

    <div className="music-hub-grid">
      <section className="music-panel music-player-panel">
        <div className="music-panel-heading"><div><span className="music-hub-eyebrow">YOUR SPACE PLAYER</span><h3><Headphones size={19}/> LYKN on Spotify</h3></div><span className="music-live-pill">EMBEDDED PLAYER</span></div>
        <div className="spotify-player-frame" ref={playerHostRef}><div className="music-player-loading"><Music2/> Loading Spotify player…</div></div>
        <p className="music-player-note">Playback is provided by Spotify. Sign-in or availability may depend on Spotify's own requirements and your region.</p>
        {lastPlayed && <p className="music-listen-feedback"><Play size={14}/> Last counted: <strong>{lastPlayed}</strong></p>}
      </section>

      <section className="music-panel music-rules-panel">
        <span className="music-hub-eyebrow">HOW THE WEEKLY CHART WORKS</span>
        <h3><Trophy size={20}/> LYKYOU Weekly Rankings</h3>
        <ol className="music-rules-list">
          <li><b>Automatic selection:</b> the five songs with the most eligible Space plays in the previous week enter the new voting round.</li>
          <li><b>Eligible plays:</b> a play counts after at least 30 seconds in the embedded player. Each member can contribute one play per song per day.</li>
          <li><b>Daily vote:</b> each signed-in member gets one vote per day from the five selected songs.</li>
          <li><b>Final submission:</b> votes cannot be changed or withdrawn.</li>
          <li><b>Weekly winner:</b> the song with the most votes at the end of the week wins. A fresh round starts every Monday (IST).</li>
        </ol>
        <p className="music-disclaimer"><Info size={14}/> Play counts measure listening activity recorded inside LYKYOU Space, not official Spotify or YouTube streaming figures.</p>
      </section>
    </div>

    <section className="music-panel music-voting-panel">
      <div className="music-panel-heading"><div><span className="music-hub-eyebrow">THIS WEEK · {weekStart}</span><h3><Vote size={19}/> Vote for your favourite</h3></div><button className="music-refresh-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14}/> Refresh</button></div>
      {!user ? <div className="music-empty-state">Sign in to listen with play tracking and take part in the daily vote.</div> : loading ? <div className="music-empty-state">Loading this week's songs…</div> : pool.length === 0 ? <div className="music-empty-state"><Music2 size={25}/><b>The first Top 5 is still being built.</b><span>Listen to songs in the embedded player. The five most-played eligible tracks from a completed week will automatically become the next voting pool.</span></div> : <>
        {myVote && <div className="music-vote-confirmation">You've already voted today. Your vote is final; you can vote again after the daily reset.</div>}
        <div className="music-pool-list">{pool.map((track) => <article className={"music-pool-track " + (myVote === track.track_uri ? "selected" : "")} key={track.track_uri}>
          <div className="music-track-art">{track.artwork_url ? <img src={track.artwork_url} alt=""/> : <Music2/>}</div>
          <div className="music-track-info"><strong>{track.title}</strong><span>{track.artist}</span><small>{track.play_count ?? 0} eligible Space plays last week</small></div>
          <button className="music-vote-button" onClick={() => void castVote(track.track_uri)} disabled={!user || !!myVote || voting}>{myVote === track.track_uri ? "Your vote" : "Vote"}</button>
        </article>)}</div>
      </>}
      {message && <p className="music-status-message">{message}</p>}
      {error && <p className="music-error-message">{error}</p>}
    </section>

    <section className="music-panel music-chart-panel">
      <div className="music-panel-heading"><div><span className="music-hub-eyebrow">LIVE VOTE TOTALS</span><h3><Trophy size={19}/> This week's chart</h3></div></div>
      {!user ? <div className="music-empty-state">Sign in to view the weekly community chart.</div> : rankings.length === 0 ? <div className="music-empty-state">No votes have been recorded for this week yet. Be among the first to vote!</div> : <div className="music-chart-list">{rankings.map((track) => <article key={track.track_uri} className="music-chart-row"><span className="music-chart-rank">#{track.rank_no}</span><div className="music-track-info"><strong>{track.title}</strong><span>{track.artist}</span></div><b>{track.vote_count} {track.vote_count === 1 ? "vote" : "votes"}</b></article>)}</div>}
    </section>

    <section className="music-panel music-library-panel">
      <div className="music-panel-heading"><div><span className="music-hub-eyebrow">TRACKS HEARD IN SPACE</span><h3><Music2 size={19}/> Music Library activity</h3></div></div>
      <input className="music-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracks played in Space…"/>
      {!user ? <div className="music-empty-state">Sign in to build your listening history.</div> : filteredTracks.length === 0 ? <div className="music-empty-state">Tracks appear here after eligible listening activity is recorded.</div> : <div className="music-library-list">{filteredTracks.map((track) => <article className="music-library-track" key={track.track_uri}><div className="music-track-art">{track.artwork_url ? <img src={track.artwork_url} alt=""/> : <Music2/>}</div><div className="music-track-info"><strong>{track.title}</strong><span>{track.artist}</span></div><a href={track.spotify_url ?? ("https://open.spotify.com/track/" + spotifyTrackId(track.track_uri))} target="_blank" rel="noreferrer" aria-label={"Open " + track.title + " on Spotify"}><ExternalLink size={15}/></a></article>)}</div>}
    </section>

    <section className="music-panel music-platform-panel">
      <span className="music-hub-eyebrow">STREAMING RESOURCE CENTRE</span><h3>Choose where you listen</h3>
      <p>Your Spotify playlist is connected as the initial Space player. YouTube Music will be added as a second embedded option when its playlist is ready. Apple Music and other platform links remain available as external destinations.</p>
      <div className="music-link-grid">
        <a href={SPOTIFY_PLAYLIST} target="_blank" rel="noreferrer">Spotify playlist <ExternalLink size={14}/></a>
        <a href="https://music.youtube.com/search?q=LYKN" target="_blank" rel="noreferrer">YouTube Music search <ExternalLink size={14}/></a>
        <a href="https://music.apple.com/search?term=LYKN" target="_blank" rel="noreferrer">Apple Music search <ExternalLink size={14}/></a>
      </div>
      <div className="music-official-links">
        <span className="music-hub-eyebrow">LYKN OFFICIAL CHANNELS</span>
        <div className="music-link-grid">
          <a href="https://www.youtube.com/@LYKN.Official" target="_blank" rel="noreferrer">YouTube <ExternalLink size={13}/></a>
          <a href="https://www.instagram.com/lykn_official" target="_blank" rel="noreferrer">Instagram <ExternalLink size={13}/></a>
          <a href="https://x.com/LYKNofficial" target="_blank" rel="noreferrer">X <ExternalLink size={13}/></a>
          <a href="https://www.tiktok.com/@lyknofficial" target="_blank" rel="noreferrer">TikTok <ExternalLink size={13}/></a>
          <a href="https://www.facebook.com/p/LYKN-100091274537769/?locale=th_TH" target="_blank" rel="noreferrer">Facebook <ExternalLink size={13}/></a>
          <a href="https://www.gmm-tv.com/contents/8Oved/" target="_blank" rel="noreferrer">GMMTV official content <ExternalLink size={13}/></a>
        </div>
      </div>
      <small>LYKYOU Space is an independent fan community. These are external official destinations; the Space is not affiliated with LYKN or GMMTV.</small>
    </section>
  </section>;
}
