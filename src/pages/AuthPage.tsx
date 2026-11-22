import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import "./auth.css";

type AuthMode = "login" | "signup" | "forgot" | "reset";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { configured, user, loading } = useAuth();
  const mode: AuthMode = location.pathname === "/signup" ? "signup"
    : location.pathname === "/forgot-password" ? "forgot"
    : location.pathname === "/reset-password" ? "reset" : "login";
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const titles: Record<AuthMode, string> = {
    login: "Welcome back, LYKYOU",
    signup: "Find your place here",
    forgot: "Reset your password",
    reset: "Choose a new password",
  };
  const descriptions: Record<AuthMode, string> = {
    login: "Sign in to pick up where your fandom left off.",
    signup: "Create one account for your LYKYOU Space journey.",
    forgot: "We'll send a password reset link to your email.",
    reset: "Use a strong password you haven't used elsewhere.",
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!configured || !supabase) {
      setError("Accounts are not connected on this preview yet. No account information has been stored.");
      return;
    }
    if (mode === "signup") {
      if (!/^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())) {
        setError("Username must be 3–24 characters using lowercase letters, numbers or underscores.");
        return;
      }
      if (password.length < 10) {
        setError("Use a password with at least 10 characters.");
        return;
      }
    }
    if (mode === "login" && !password) {
      setError("Enter your password.");
      return;
    }
    if (mode === "reset" && password.length < 10) {
      setError("Use a password with at least 10 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data: existingProfile, error: usernameLookupError } = await supabase.from("profiles").select("id").eq("username", username.trim().toLowerCase()).maybeSingle();
        if (usernameLookupError) throw usernameLookupError;
        if (existingProfile) { setError("That username is already taken. Please choose another."); return; }
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/community`, data: { display_name: displayName.trim(), username: username.trim().toLowerCase() } },
        });
        if (authError) throw authError;
        if (data.session) navigate("/community");
        else setMessage("Account created. Check your email for the confirmation link before signing in.");
      } else if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        navigate("/community");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (authError) throw authError;
        setMessage("If an account exists for that email, a password reset link has been sent.");
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Password updated. You can continue to your community space.");
        setPassword("");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="auth-page"><div className="auth-card"><Sparkles size={25}/><p>Preparing your space…</p></div></main>;
  if (user && mode !== "reset") {
    return <main className="auth-page"><section className="auth-card">
      <div className="auth-brand"><span className="auth-mark">L✦</span><span>LYKYOU <b>SPACE</b></span></div>
      <div className="auth-kicker">YOU'RE SIGNED IN</div><h1>Welcome back.</h1>
      <p>Your account is already connected to this session.</p>
      <button className="auth-submit" onClick={() => navigate("/community")}>Continue to Community <ArrowRight size={17}/></button>
    </section></main>;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-back" to="/"><ArrowLeft size={15}/> Back to LYKYOU Space</Link>
        <div className="auth-brand"><span className="auth-mark">L✦</span><span>LYKYOU <b>SPACE</b></span></div>
        <div className="auth-kicker">YOUR PEOPLE. YOUR SPACE. YOUR LYKN UNIVERSE.</div>
        <h1>{titles[mode]}</h1>
        <p className="auth-description">{descriptions[mode]}</p>

        {!configured && (
          <div className="auth-config-note">
            <strong>Preview mode</strong>
            <span>Supabase sign-in is not configured for this preview. Registration and login will work after the project URL and public anon key are added to the hosting environment.</span>
          </div>
        )}
        {error && <div className="auth-message error" role="alert">{error}</div>}
        {message && <div className="auth-message success" role="status">{message}</div>}

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && <>
            <label>Display name
              <span className="auth-input"><UserRound size={17}/><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} placeholder="How should we call you?" required /></span>
            </label>
            <label>Username
              <span className="auth-input"><span className="at-sign">@</span><input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" placeholder="your_unique_username" required /></span>
            </label>
          </>}
          {mode !== "reset" && <label>Email address
            <span className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></span>
          </label>}
          {mode !== "forgot" && <label>{mode === "reset" ? "New password" : "Password"}
            <span className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === "login" ? 1 : 10} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Your password" : "At least 10 characters"} required /></span>
          </label>}
          {mode === "login" && <div className="auth-form-meta"><Link to="/forgot-password">Forgot password?</Link></div>}
          <button className="auth-submit" type="submit" disabled={busy || !configured}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Sign in"}
            {!busy && <ArrowRight size={17}/>}
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? <>New to the space? <Link to="/signup">Create an account</Link></>
            : mode === "signup" ? <>Already a LYKYOU? <Link to="/login">Sign in</Link></>
            : <>Remembered it? <Link to="/login">Back to sign in</Link></>}
        </div>
        <div className="auth-foot">Independent fan community · Not affiliated with LYKN or GMMTV</div>
      </section>
    </main>
  );
}
