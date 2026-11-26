import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Globe2, Sparkles, Users, Bug, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./beta-page.css";

const biasOptions = ["WILLIAM", "LEGO", "NUT", "HONG", "TUI", "OT5"];
const interestOptions = [
  "Community & discussions", "Bias communities", "Games & challenges",
  "Events & meetups", "Fan projects & campaigns", "LYKN updates & archive",
  "Music & streaming activities",
];

export default function BetaPage() {
  const [form, setForm] = useState({
    display_name: "", email: "", social_handle: "", country: "", fan_duration: "",
    bias: [] as string[], interests: [] as string[], device: "Mobile",
    availability: "A few times a week", prior_testing: false, reason: "",
    feedback_comfort: false, confidentiality: false, email_consent: false,
  });
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const update = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "bias" | "interests", value: string) => update(key, form[key].includes(value) ? form[key].filter((item) => item !== value) : [...form[key], value]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (trap) return;
    if (!supabase) { setError("The application form is temporarily unavailable. Please try again later."); return; }
    if (!form.bias.length || !form.interests.length) { setError("Please choose at least one bias option and one area of interest."); return; }
    if (!form.feedback_comfort || !form.confidentiality) { setError("Please confirm the feedback and beta confidentiality requirements."); return; }
    if (form.reason.trim().length < 20) { setError("Please tell us a little more (at least 20 characters)."); return; }
    setBusy(true);
    try {
      const { error: insertError } = await supabase.from("beta_applications").insert({
        ...form,
        display_name: form.display_name.trim(),
        email: form.email.trim().toLowerCase(),
        social_handle: form.social_handle.trim(),
        country: form.country.trim(),
        reason: form.reason.trim(),
      });
      if (insertError) {
        if (insertError.code === "23505") throw new Error("An application has already been submitted with this email address. If you need to update it, contact the LYKYOU Space team.");
        throw insertError;
      }
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't submit your application. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="beta-page">
    <div className="beta-shell">
      <Link className="beta-back" to="/"><ArrowLeft size={15}/> Back to LYKYOU Space</Link>
      <header className="beta-hero">
        <div className="beta-brand"><span className="beta-mark">L✦</span> LYKYOU <b>SPACE</b></div>
        <div className="beta-kicker"><Sparkles size={13}/> YOUR PEOPLE. YOUR SPACE. YOUR LYKN UNIVERSE.</div>
        <h1>Your universe<br/><span>is almost ready.</span></h1>
        <p className="beta-lead">A global space for LYKYOUs to connect, share fandom moments, discover activities and find their people. We're getting ready to open the doors.</p>
        <div className="beta-status"><span className="beta-status-dot"/> COMING SOON <i/> CLOSED BETA APPLICATIONS</div>
      </header>

      <section className="beta-intro-grid">
        <article className="beta-info-card"><Users/><h2>Meet your people</h2><p>Find LYKYOUs across countries, connect around your bias and join fandom conversations.</p></article>
        <article className="beta-info-card"><Sparkles/><h2>Explore the Space</h2><p>Try games, challenges, fan projects, events, music spaces and more.</p></article>
        <article className="beta-info-card"><Bug/><h2>Help shape the launch</h2><p>Test what works, report what doesn't and share honest ideas before public opening.</p></article>
      </section>

      {sent ? <section className="beta-success" role="status">
        <CheckCircle2 size={38}/><div className="beta-kicker">APPLICATION RECEIVED</div>
        <h2>You're on our beta list!</h2>
        <p>Thank you for applying to test LYKYOU Space. Our team will review applications and contact selected testers using the email address you provided. If selected, create your regular LYKYOU Space account with this same email address; an admin will then activate your private Beta Testing Zone.</p>
        <p className="beta-small">Submitting an application does not guarantee selection. Please keep an eye on your inbox.</p>
        <Link className="beta-submit" to="/">Return to LYKYOU Space <ArrowRight size={16}/></Link>
      </section> : <section className="beta-form-card" id="beta-application">
        <div className="beta-form-heading"><div className="beta-kicker">BE PART OF THE FIRST CREW</div><h2>Apply for beta access</h2><p>We're selecting a limited group of LYKYOUs for the closed beta. Fill in the details below so we can choose a mix of fans, devices and time zones.</p></div>
        {error && <div className="beta-error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <div className="beta-form-grid">
            <label>Display name<input required maxLength={60} value={form.display_name} onChange={(e)=>update("display_name",e.target.value)} placeholder="What should we call you?"/></label>
            <label>Email address<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e)=>update("email",e.target.value)} placeholder="you@example.com"/></label>
            <label>Social handle<input required maxLength={80} value={form.social_handle} onChange={(e)=>update("social_handle",e.target.value)} placeholder="@username / platform"/></label>
            <label>Country<input required maxLength={80} value={form.country} onChange={(e)=>update("country",e.target.value)} placeholder="Your country"/></label>
            <label>How long have you been a LYKN fan?<select required value={form.fan_duration} onChange={(e)=>update("fan_duration",e.target.value)}><option value="">Choose one</option><option>Under 3 months</option><option>3–12 months</option><option>1–2 years</option><option>2+ years</option><option>Prefer not to say</option></select></label>
            <label>Which device will you mainly use?<select value={form.device} onChange={(e)=>update("device",e.target.value)}><option>Mobile</option><option>Desktop</option><option>Both</option></select></label>
            <label>How often can you test?<select value={form.availability} onChange={(e)=>update("availability",e.target.value)}><option>Most days</option><option>A few times a week</option><option>Once a week</option><option>Weekends only</option><option>Flexible / not sure</option></select></label>
            <label className="beta-check-label"><input type="checkbox" checked={form.prior_testing} onChange={(e)=>update("prior_testing",e.target.checked)}/> I've participated in beta testing before</label>
          </div>

          <fieldset><legend>Who's your bias? <small>Select all that apply</small></legend><div className="beta-choice-grid">{biasOptions.map((item)=><label key={item} className={form.bias.includes(item)?"chosen":""}><input type="checkbox" checked={form.bias.includes(item)} onChange={()=>toggle("bias",item)}/>{item}</label>)}</div></fieldset>
          <fieldset><legend>Which parts of LYKYOU Space interest you? <small>Select all that apply</small></legend><div className="beta-interest-grid">{interestOptions.map((item)=><label key={item} className={form.interests.includes(item)?"chosen":""}><input type="checkbox" checked={form.interests.includes(item)} onChange={()=>toggle("interests",item)}/>{item}</label>)}</div></fieldset>

          <label className="beta-textarea-label">Why would you like to become a beta tester?<textarea required minLength={20} maxLength={1200} rows={5} value={form.reason} onChange={(e)=>update("reason",e.target.value)} placeholder="Tell us what you'd enjoy testing and how you could help…"/></label>

          <div className="beta-consents">
            <label><input type="checkbox" checked={form.feedback_comfort} onChange={(e)=>update("feedback_comfort",e.target.checked)}/> I'm comfortable reporting bugs, testing features and sharing honest feedback. <b>*</b></label>
            <label><input type="checkbox" checked={form.confidentiality} onChange={(e)=>update("confidentiality",e.target.checked)}/> I agree not to share private beta links, screenshots or access details publicly before the team approves them. <b>*</b></label>
            <label><input type="checkbox" checked={form.email_consent} onChange={(e)=>update("email_consent",e.target.checked)}/> I agree to receive beta application and testing updates by email.</label>
          </div>
          <label className="beta-honeypot" aria-hidden="true">Leave this field empty<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e)=>setTrap(e.target.value)}/></label>
          <div className="beta-privacy"><ShieldCheck size={16}/><span>Your application details will only be used by the LYKYOU Space team to review beta applications and contact applicants. Your application is separate from creating a LYKYOU Space member account. Application details are private and are visible only to authorised admins reviewing the beta.</span></div>
          <button className="beta-submit" type="submit" disabled={busy}>{busy?"Submitting application…":"Submit beta application"} {!busy&&<ArrowRight size={17}/>}</button>
          <p className="beta-required">* Required confirmations. Applying does not guarantee selection. The beta is limited and selected applicants will be contacted by email.</p>
        </form>
      </section>}

      <footer className="beta-footer"><Globe2 size={14}/> An independent, unofficial fan community created by LYKN India Fanclub. Not affiliated with LYKN, GMMTV or their management.</footer>
    </div>
  </main>;
}
