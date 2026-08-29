import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { api, setAuthToken, errMessage } from "@/lib/api";

export default function AdminLoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/admin/login", { email, password: pw });
      setAuthToken(r.data.token);
      toast.success("Welcome back");
      nav("/admin");
    } catch (err) {
      toast.error(errMessage(err, "Login failed"));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-khurchi-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-khurchi-brand/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-khurchi-accent/10 blur-3xl" />
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-khurchi-mute hover:text-khurchi-brand mb-6"><ArrowLeft className="w-4 h-4" /> Back to Khurchi.com</Link>
        <div className="bg-white border border-khurchi-border rounded-3xl p-8 lg:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          <div className="w-12 h-12 rounded-2xl bg-khurchi-brand text-khurchi-bg flex items-center justify-center"><Lock className="w-5 h-5" /></div>
          <div className="text-xs uppercase tracking-[0.2em] text-khurchi-accent mt-6">Service Executive Portal</div>
          <h1 className="mt-2 font-display text-3xl text-khurchi-ink">Team login</h1>
          <p className="mt-2 text-sm text-khurchi-mute">Authorised operations access only.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Email</label>
              <input data-testid="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full bg-white border border-khurchi-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-khurchi-brand" placeholder="info@khurchi.com" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Password</label>
              <input data-testid="admin-password" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} className="mt-2 w-full bg-white border border-khurchi-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-khurchi-brand" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} data-testid="admin-login-btn" className="w-full inline-flex items-center justify-center gap-2 bg-khurchi-brand text-khurchi-bg rounded-full py-3.5 font-medium hover:bg-khurchi-brandDark disabled:opacity-60 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
