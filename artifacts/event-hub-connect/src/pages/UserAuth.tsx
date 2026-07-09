import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCw, CheckCircle2, Orbit } from "lucide-react";
import { useAppAuth } from "@/context/AuthContext";

const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&display=swap');

.liquid-glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.35);
}
`;

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#02040A" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#02040A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center px-6 py-16 relative overflow-hidden bg-[#02040A] font-body selection:bg-white/30 selection:text-white"
    >
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* Ambient background, matching the landing page's cinematic tone */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A1230] via-[#050814] to-[#02040A]" />
      <div
        className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute bottom-[-10rem] right-[-6rem] w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
      />

      <Link
        to="/"
        className="liquid-glass absolute top-6 left-6 w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 z-20"
      >
        <Orbit className="w-5 h-5 text-white" />
      </Link>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

export default function UserAuth() {
  const navigate = useNavigate();
  const { isLoggedIn, sendOTP, verifyOTP } = useAppAuth();
  const [step, setStep] = useState<"roll" | "register" | "otp">("roll");
  const [roll, setRoll] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = [
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  async function handleSendOTP(withRegistration = false) {
    if (!roll.trim()) { setError("Please enter your roll number."); return; }
    if (withRegistration && (!fullName.trim() || !email.trim())) {
      setError("Please enter your name and email to register.");
      return;
    }
    setError(""); setLoading(true);
    const result = await sendOTP(roll, withRegistration ? email : undefined, withRegistration ? fullName : undefined);
    setLoading(false);
    if (!result.success) {
      if (result.needsRegistration) {
        setStep("register");
        return;
      }
      setError(result.error || "Could not send OTP.");
      return;
    }
    setSuccessMsg(result.message || "OTP sent to your registered email.");
    setStep("otp");
    setTimeout(() => otpRefs[0].current?.focus(), 120);
  }

  function handleOTPChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < 5) otpRefs[i + 1].current?.focus();
    if (val && i === 5) {
      const code = [...next].join("");
      if (code.length === 6) setTimeout(() => handleVerify([...next]), 100);
    }
  }

  function handleOTPKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  }

  async function handleVerify(digits?: string[]) {
    const code = (digits || otp).join("");
    if (code.length < 6) { setError("Enter all 6 digits."); return; }
    setError(""); setLoading(true);
    const result = await verifyOTP(roll, code);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Incorrect OTP.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
      return;
    }
    navigate("/");
  }

  function handleBack() {
    setStep("roll"); setOtp(["", "", "", "", "", ""]); setError(""); setSuccessMsg("");
  }

  return (
    <AuthShell>
      <div className="liquid-glass rounded-[28px] p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="liquid-glass w-14 h-14 rounded-2xl flex items-center justify-center mb-5">
            <Orbit className="w-6 h-6 text-white" />
          </div>
          <span className="font-body text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">Student Portal</span>
          <h1 className="font-heading italic text-4xl sm:text-[2.75rem] text-white tracking-tight leading-[1.05]">
            {step === "otp" ? "Enter your code" : step === "register" ? "Complete your profile" : "Welcome back"}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {step === "roll" && (
            <motion.div key="roll" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22 }}>
              <p className="font-body text-white/50 text-sm leading-relaxed text-center mb-8">
                Enter your roll number and we'll send a one-time code to your registered email.
              </p>
              <div className="mb-5">
                <label className="block font-body text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-[0.2em]">Roll Number</label>
                <input
                  value={roll}
                  onChange={(e) => { setRoll(e.target.value.toUpperCase()); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP(false)}
                  placeholder="Ex: 24N81A6758"
                  autoFocus
                  className="w-full px-5 py-4 rounded-2xl font-body text-sm font-semibold text-white placeholder-white/25 focus:outline-none transition-all tracking-widest uppercase bg-white/[0.04] border border-white/10 focus:border-white/30 focus:bg-white/[0.07]"
                />
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 font-body text-rose-300 text-xs font-medium mb-5 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
                    <span className="w-4 h-4 rounded-full bg-rose-400 text-[#02040A] flex items-center justify-center text-[9px] font-black shrink-0">!</span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => handleSendOTP(false)}
                disabled={loading || !roll.trim()}
                className="w-full bg-white text-[#02040A] font-body font-semibold text-sm py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 hover:bg-white/90 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? <Spinner /> : <><span>Send OTP</span> <ArrowRight size={16} strokeWidth={2.5} /></>}
              </button>
              <p className="text-center font-body text-[11px] text-white/30 mt-6 leading-relaxed">
                First time here? We'll ask for your name and email to register.
                <br />Your data is secured and never shared.
              </p>
            </motion.div>
          )}

          {step === "register" && (
            <motion.div key="register" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22 }}>
              <p className="font-body text-white/50 text-sm leading-relaxed text-center mb-8">
                Roll number <span className="text-white font-semibold">{roll}</span> isn't registered yet. Tell us who you are.
              </p>
              <div className="mb-4">
                <label className="block font-body text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-[0.2em]">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(""); }}
                  placeholder="Your full name"
                  autoFocus
                  className="w-full px-5 py-4 rounded-2xl font-body text-sm font-medium text-white placeholder-white/25 focus:outline-none transition-all bg-white/[0.04] border border-white/10 focus:border-white/30 focus:bg-white/[0.07]"
                />
              </div>
              <div className="mb-5">
                <label className="block font-body text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-[0.2em]">Email</label>
                <input
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP(true)}
                  placeholder="you@example.com"
                  type="email"
                  className="w-full px-5 py-4 rounded-2xl font-body text-sm font-medium text-white placeholder-white/25 focus:outline-none transition-all bg-white/[0.04] border border-white/10 focus:border-white/30 focus:bg-white/[0.07]"
                />
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 font-body text-rose-300 text-xs font-medium mb-5 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
                    <span className="w-4 h-4 rounded-full bg-rose-400 text-[#02040A] flex items-center justify-center text-[9px] font-black shrink-0">!</span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => handleSendOTP(true)}
                disabled={loading}
                className="w-full bg-white text-[#02040A] font-body font-semibold text-sm py-4 rounded-2xl flex items-center justify-center gap-2.5 mb-3 transition-all duration-300 hover:bg-white/90 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? <Spinner /> : <><span>Register &amp; Send OTP</span> <ArrowRight size={16} strokeWidth={2.5} /></>}
              </button>
              <button onClick={handleBack} className="w-full py-3.5 rounded-2xl border border-white/10 text-white/50 font-body font-medium text-sm flex items-center justify-center gap-2 hover:border-white/30 hover:text-white transition-all">
                <RefreshCw size={14} /> Change Roll Number
              </button>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22 }}>
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10">
                  <CheckCircle2 size={12} className="text-emerald-300" />
                  <span className="font-body text-emerald-300 text-[11px] font-semibold tracking-wide">OTP SENT</span>
                </div>
              </div>
              {successMsg ? (
                <p className="font-body text-white/50 text-sm leading-relaxed text-center mb-8">{successMsg}</p>
              ) : (
                <p className="font-body text-white/50 text-sm text-center mb-8">
                  Enter the 6-digit code sent for <span className="text-white font-semibold">{roll}</span>
                </p>
              )}
              <div className="flex gap-2.5 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPChange(i, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-heading font-bold rounded-2xl focus:outline-none transition-all text-white bg-white/[0.04] border border-white/10 focus:border-white/30 focus:bg-white/[0.08]"
                  />
                ))}
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 font-body text-rose-300 text-xs font-medium mb-5 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
                    <span className="w-4 h-4 rounded-full bg-rose-400 text-[#02040A] flex items-center justify-center text-[9px] font-black shrink-0">!</span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => handleVerify()}
                disabled={loading || otp.join("").length < 6}
                className="w-full bg-white text-[#02040A] font-body font-semibold text-sm py-4 rounded-2xl flex items-center justify-center gap-2.5 mb-3 transition-all duration-300 hover:bg-white/90 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? <Spinner /> : <><span>Verify &amp; Login</span> <ArrowRight size={16} strokeWidth={2.5} /></>}
              </button>
              <button onClick={handleBack} className="w-full py-3.5 rounded-2xl border border-white/10 text-white/50 font-body font-medium text-sm flex items-center justify-center gap-2 hover:border-white/30 hover:text-white transition-all">
                <RefreshCw size={14} /> Change Roll Number
              </button>
              <p className="text-center font-body text-[11px] text-white/30 mt-4">Didn't receive it? Check spam, or go back and re-send.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-2 mt-8">
          {(["roll", "otp"] as const).map((s) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: step === s || (s === "roll" && step === "register") ? "28px" : "8px",
                background: step === s || (s === "roll" && step === "register") ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="text-center mt-6 space-y-2">
        <p className="font-body text-[11px] text-white/30">
          Powered by <span className="font-semibold text-white/60">DataNauts</span> · Student Portal
        </p>
        <Link to="/" className="inline-flex items-center gap-1.5 font-body text-[11px] font-medium text-white/40 hover:text-white transition-colors">
          ← Back to home
        </Link>
      </div>
    </AuthShell>
  );
}
