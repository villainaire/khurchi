import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Loader2, CheckCircle2, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, errMessage } from "@/lib/api";
import { toast } from "sonner";

const STAGES = ["Request Received", "Service Review", "Team Dispatched", "In Progress", "Completed"];

export default function TrackPage() {
  const { jobNumber } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState(jobNumber || "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [lastSearched, setLastSearched] = useState("");
  const [err, setErr] = useState("");

  const doSearch = async (num) => {
    const clean = (num || "").replace(/\s+/g, "").toUpperCase();
    if (!clean || clean === lastSearched) return;
    setLastSearched(clean);
    setLoading(true); setErr(""); setData(null);
    try {
      const r = await api.get(`/track/${encodeURIComponent(clean)}`);
      setData(r.data);
    } catch (e) {
      const status = e?.response?.status;
      const friendly = status === 404 ? "Request not found. Please check the number." : errMessage(e, "Something went wrong. Please try again.");
      setErr(friendly);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (jobNumber) { setQ(jobNumber.toUpperCase()); doSearch(jobNumber); } }, [jobNumber]);

  const onSubmit = (e) => {
    e.preventDefault();
    const clean = q.replace(/\s+/g, "").toUpperCase();
    if (!clean) { toast.error("Enter a job number"); return; }
    if (clean !== jobNumber) nav(`/track/${clean}`, { replace: true });
    doSearch(clean);
  };

  const currentIdx = data ? Math.max(0, STAGES.indexOf(data.status)) : -1;
  const isCancelled = data?.status === "Cancelled";

  return (
    <div className="min-h-screen bg-khurchi-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 lg:px-12 pt-32 pb-24">
        <div className="text-xs uppercase tracking-[0.2em] text-khurchi-accent">Track Request</div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl text-khurchi-ink tracking-tight">Where is my chair care?</h1>
        <p className="mt-4 text-khurchi-mute text-lg max-w-2xl">Enter your Khurchi.com request number to see the current status of your service.</p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col sm:flex-row gap-3">
          <input data-testid="track-input" value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} placeholder="KHR-2026-000001" className="flex-1 bg-white border border-khurchi-border rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-khurchi-brand text-khurchi-ink placeholder:text-khurchi-mute/60 uppercase" />
          <button type="submit" data-testid="track-submit" className="inline-flex items-center justify-center gap-2 bg-khurchi-brand text-khurchi-bg rounded-full px-8 py-4 font-medium hover:bg-khurchi-brandDark transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Track
          </button>
        </form>

        {err && <div className="mt-6 p-4 rounded-2xl bg-white border border-khurchi-error/30 text-khurchi-error" data-testid="track-error">{err}</div>}

        {data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-10 bg-white border border-khurchi-border rounded-3xl p-8 lg:p-10" data-testid="track-result">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Request</div>
                <div className="font-display text-3xl text-khurchi-ink mt-1">{data.job_number}</div>
                <div className="mt-2 text-sm text-khurchi-mute">{data.chair_type} · {data.area}</div>
              </div>
              <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${isCancelled ? "bg-khurchi-error/10 text-khurchi-error" : "bg-khurchi-brand/10 text-khurchi-brand"}`}>
                {data.status}
              </div>
            </div>

            <div className="mt-10">
              {isCancelled ? (
                <div className="text-khurchi-error">This request has been cancelled.</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-khurchi-border" />
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(currentIdx / (STAGES.length - 1)) * 100}%` }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }} className="absolute left-4 top-4 w-px bg-khurchi-brand" />
                  <div className="space-y-8">
                    {STAGES.map((s, i) => {
                      const done = i <= currentIdx;
                      const active = i === currentIdx;
                      return (
                        <motion.div key={s} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-6 relative">
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${done ? "bg-khurchi-brand border-khurchi-brand text-khurchi-bg" : "bg-white border-khurchi-border text-khurchi-mute"}`}>
                            {done ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
                            {active && !isCancelled && <span className="absolute inset-0 rounded-full bg-khurchi-brand/30 animate-ping" />}
                          </div>
                          <div className="pt-1">
                            <div className={`font-display text-xl ${done ? "text-khurchi-ink" : "text-khurchi-mute"}`}>{s}</div>
                            {active && <div className="mt-1 text-sm text-khurchi-brand font-medium">In progress now</div>}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 grid sm:grid-cols-2 gap-4">
              <Info label="Preferred Date" value={data.preferred_date} />
              <Info label="Preferred Time" value={data.preferred_time} />
              <Info label="Booked On" value={new Date(data.created_at).toLocaleString()} />
              <Info label="Last Update" value={new Date(data.updated_at).toLocaleString()} />
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="p-4 rounded-2xl bg-khurchi-bg2">
      <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">{label}</div>
      <div className="mt-1 text-khurchi-ink font-medium">{value}</div>
    </div>
  );
}
