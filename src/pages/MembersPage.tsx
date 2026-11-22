import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Ban, Check, Clock3, Search, UserPlus, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

type Person = { id: string; username: string; display_name: string; bio?: string; bias?: string[]; avatar_url?: string | null };

export default function MembersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, configured } = useAuth();
  const [query, setQuery] = useState(() => searchParams.get("search") ?? "");
  const [members, setMembers] = useState<Person[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRequestsAndFriends() {
    if (!supabase || !user) return;
    const [{ data: requests }, { data: sent }, { data: links }, { data: blocks }] = await Promise.all([
      supabase.from("friend_requests").select("id,sender_id,created_at").eq("recipient_id", user.id).eq("status", "pending"),
      supabase.from("friend_requests").select("recipient_id").eq("sender_id", user.id).eq("status", "pending"),
      supabase.from("friendships").select("user_low,user_high").or(`user_low.eq.${user.id},user_high.eq.${user.id}`),
      supabase.from("blocks").select("blocked_user_id").eq("blocker_id", user.id),
    ]);
    const incomingRows = requests ?? [];
    const friendUserIds = (links ?? []).map((link: any) => link.user_low === user.id ? link.user_high : link.user_low);
    const lookupIds = [...new Set([...incomingRows.map((row: any) => row.sender_id), ...friendUserIds])];
    const { data: profiles } = lookupIds.length
      ? await supabase.from("profiles").select("id,username,display_name,bio,bias,avatar_url").in("id", lookupIds)
      : { data: [] as Person[] };
    const map = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    setIncoming(incomingRows.map((row: any) => ({ ...row, person: map.get(row.sender_id) })));
    setFriends(friendUserIds.map((id: string) => map.get(id)).filter(Boolean) as Person[]);
    setFriendIds(friendUserIds);
    setBlockedIds((blocks ?? []).map((row: any) => row.blocked_user_id));
    setSentIds((sent ?? []).map((row: any) => row.recipient_id));
  }

  async function searchMembers(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    if (!configured || !supabase) {
      setMembers([]);
      setMessage("Member discovery will load after Supabase is connected.");
      return;
    }
    setLoading(true);
    setMessage("");
    const term = query.trim();
    const base = supabase.from("profiles").select("id,username,display_name,bio,bias,avatar_url").limit(30);
    const [byName, byHandle] = await Promise.all([
      term ? base.ilike("display_name", `%${term}%`) : base.order("created_at", { ascending: false }),
      term ? supabase.from("profiles").select("id,username,display_name,bio,bias,avatar_url").ilike("username", `%${term}%`).limit(30) : Promise.resolve({ data: [] as Person[], error: null }),
    ]);
    if (byName.error || byHandle.error) {
      setError((byName.error ?? byHandle.error)?.message ?? "Member search failed.");
      setLoading(false);
      return;
    }
    const unique = new Map<string, Person>();
    [...(byName.data ?? []), ...(byHandle.data ?? [])].forEach((person: any) => {
      if (person.id !== user?.id) unique.set(person.id, person);
    });
    setMembers([...unique.values()]);
    setLoading(false);
  }

  useEffect(() => {
    if (configured) void searchMembers();
    if (user) void loadRequestsAndFriends();
  }, [user?.id, configured]);

  async function blockMember(person: Person) {
    if (!user) { navigate("/login"); return; }
    if (!supabase) return;
    if (!window.confirm(`Block @${person.username}? Their profile and posts will be hidden from you, and yours from them.`)) return;
    const { error: blockError } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_user_id: person.id });
    if (blockError) setError(blockError.message);
    else {
      const low = user.id < person.id ? user.id : person.id;
      const high = user.id < person.id ? person.id : user.id;
      await supabase.from("friendships").delete().eq("user_low", low).eq("user_high", high);
      setBlockedIds((current) => [...current, person.id]);
      setMembers((current) => current.filter((item) => item.id !== person.id));
      setMessage(`@${person.username} has been blocked.`);
    }
  }
  async function unblockMember(id: string) {
    if (!supabase || !user) return;
    const { error: unblockError } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_user_id", id);
    if (unblockError) setError(unblockError.message);
    else { setBlockedIds((current) => current.filter((value) => value !== id)); setMessage("Member unblocked."); }
  }

  async function sendRequest(person: Person) {
    if (!user) { navigate("/login"); return; }
    if (!supabase) return;
    setBusyId(person.id);
    setError("");
    setMessage("");
    const { error: requestError } = await supabase.rpc("send_friend_request", { p_recipient_id: person.id });
    if (requestError) setError(requestError.message);
    else {
      setSentIds((current) => [...current, person.id]);
      setMessage(`Friend request sent to @${person.username}.`);
    }
    setBusyId("");
  }

  async function respond(requestId: string, accept: boolean) {
    if (!supabase) return;
    setBusyId(requestId);
    const { error: responseError } = await supabase.rpc("respond_friend_request", { p_request_id: requestId, p_accept: accept });
    if (responseError) setError(responseError.message);
    else {
      setMessage(accept ? "Friend request accepted." : "Friend request declined.");
      await loadRequestsAndFriends();
    }
    setBusyId("");
  }

  return (
    <div className="members-page">
      <header className="members-heading"><div><div className="eyebrow">FIND YOUR PEOPLE</div><h2>Meet the LYKYOUs</h2><p>Discover fans who share your bias, music favourites and fandom interests.</p></div><div className="members-icon"><Users size={25}/></div></header>
      {error && <div className="auth-message error">{error}</div>}
      {message && <div className="auth-message success">{message}</div>}
      <form className="member-search-form" onSubmit={searchMembers}><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by display name or username…"/><button className="button-primary" type="submit">Search</button></form>
      {!configured && <div className="member-empty">Member discovery is a preview until the Supabase database is connected.</div>}
      {loading ? <div className="member-empty">Finding LYKYOUs…</div> : <div className="member-results">{members.map((person) => {
        const isFriend = friendIds.includes(person.id);
        const isSent = sentIds.includes(person.id);
        return <article className="member-result" key={person.id}><button className="member-result-avatar member-result-profile-link" onClick={()=>navigate("/members/"+encodeURIComponent(person.username))} aria-label={"View "+person.display_name+" profile"}>{person.avatar_url?<img src={person.avatar_url} alt=""/>:person.display_name.slice(0,1).toUpperCase()}</button><button className="member-result-info member-result-profile-link" onClick={()=>navigate("/members/"+encodeURIComponent(person.username))}><strong>{person.display_name}</strong><span>@{person.username}</span><p>{person.bio || (person.bias?.length ? `Bias: ${person.bias.join(", ")}` : "A LYKYOU in the galaxy.")}</p><small>View profile <ArrowRight size={12}/></small></button><div className="member-result-actions"><button className="member-action" disabled={isFriend || isSent || busyId === person.id} onClick={() => void sendRequest(person)}>{isFriend ? <><Check size={14}/> Friends</> : isSent ? <><Clock3 size={14}/> Requested</> : <><UserPlus size={14}/> Add friend</>}</button>{user && <button className="member-block-action" onClick={()=>void blockMember(person)}><Ban size={14}/> Block</button>}</div></article>;
      })}</div>}
      {user && blockedIds.length>0 && <section className="member-list-panel blocked-members"><div className="member-panel-heading"><h3>Blocked members</h3><span>{blockedIds.length}</span></div><p className="member-empty small">Blocked profiles are hidden while the block is active. You can unblock an account here.</p>{blockedIds.map((id)=><div className="member-mini-row" key={id}><div><strong>Hidden member</strong><span>Account ID ending · {id.slice(-6)}</span></div><button onClick={()=>void unblockMember(id)}>Unblock</button></div>)}</section>}
      {user && <div className="member-columns">
        <section className="member-list-panel"><div className="member-panel-heading"><h3>Friend requests</h3><span>{incoming.length}</span></div>{incoming.length === 0 ? <p className="member-empty small">No new requests right now.</p> : incoming.map((request) => <div className="member-mini-row" key={request.id}><div><strong>{request.person?.display_name ?? "LYKYOU"}</strong><span>@{request.person?.username ?? "member"}</span></div><button onClick={() => void respond(request.id,true)} disabled={busyId === request.id}>Accept</button><button className="subtle" onClick={() => void respond(request.id,false)} disabled={busyId === request.id}>Decline</button></div>)}</section>
        <section className="member-list-panel"><div className="member-panel-heading"><h3>My friends</h3><span>{friends.length}</span></div>{friends.length === 0 ? <p className="member-empty small">Your accepted friends will appear here.</p> : friends.map((friend) => <div className="member-mini-row" key={friend.id}><div><strong>{friend.display_name}</strong><span>@{friend.username}</span></div><Check size={15}/></div>)}</section>
      </div>}
    </div>
  );
}
