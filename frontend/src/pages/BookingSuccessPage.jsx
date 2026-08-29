import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Copy, Calendar, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function BookingSuccessPage() {
  const { state } = useLocation();
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (!state?.job_number) nav("/book", { replace: true }); }, [state, nav]);

  if (!state?.job_number) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(state.job_number);
    setCopied(true); toast.success("Copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-khurchi-bg">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 lg:px-12 pt-32 pb-24">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} className="w-24 h-24 mx-auto rounded-full bg-khurchi-brand text-khurchi-bg flex items-center justify-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 220 }}>
            <CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />
          </motion.div>
        </motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 font-display text-4xl sm:text-5xl text-khurchi-ink text-center tracking-tight">Request received.</motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 text-center text-khurchi-mute text-lg">
          Thank you, {state.customer_name}. Our service team will review the details and coordinate the next steps.
        </motion.p>

        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="mt-10 bg-white border border-khurchi-border rounded-3xl p-8">
          <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Your Request Number</div>
          <div className="mt-2 flex items-center justify-between gap-4 flex-wrap">
            <div className="font-display text-3xl sm:text-4xl text-khurchi-ink" data-testid="success-job-number">{state.job_number}</div>
            <button onClick={copy} data-testid="copy-job-number" className="inline-flex items-center gap-2 border border-khurchi-brand text-khurchi-brand rounded-full px-5 py-2.5 text-sm font-medium hover:bg-khurchi-brand hover:text-khurchi-bg transition-colors">
              <Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-khurchi-bg2">
              <Calendar className="w-5 h-5 text-khurchi-brand" />
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Preferred Date</div>
                <div className="font-medium text-khurchi-ink">{state.preferred_date}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-khurchi-bg2">
              <Clock className="w-5 h-5 text-khurchi-brand" />
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Preferred Time</div>
                <div className="font-medium text-khurchi-ink">{state.preferred_time}</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link to={`/track/${state.job_number}`} data-testid="track-my-request" className="bg-khurchi-brand text-khurchi-bg rounded-full px-8 py-4 font-medium hover:bg-khurchi-brandDark transition-colors">Track Your Request</Link>
          <Link to="/book" data-testid="book-another" className="border border-khurchi-brand text-khurchi-brand rounded-full px-8 py-4 font-medium hover:bg-khurchi-brand hover:text-khurchi-bg transition-colors">Book Another Service</Link>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
