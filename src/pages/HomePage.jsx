import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkle, Wrench, MapPin, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } };
const item = { hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] } } };

const SERVICES = [
  { title: "Chair Repair", desc: "End-to-end structural repair for wobbly frames, cracks and broken joints.", tag: "01" },
  { title: "Upholstery Repair", desc: "Reweaves, patchwork and complete recovers with premium fabrics and leatherette.", tag: "02" },
  { title: "Wheel Replacement", desc: "Smooth-rolling caster swaps that stop the drag on your floors.", tag: "03" },
  { title: "Hydraulic Repair", desc: "Fix the sink. New gas cylinders sized for your chair and body weight.", tag: "04" },
  { title: "Mechanism Repair", desc: "Tilt, recline and lock mechanisms restored to factory feel.", tag: "05" },
  { title: "General Maintenance", desc: "Preventive care, cleaning and tune-ups so your chair lasts years longer.", tag: "06" },
];

const STEPS = [
  { n: "01", title: "Tell Us the Problem", body: "Share your chair details and what needs attention. Photos help our team prepare." },
  { n: "02", title: "We Take It From Here", body: "Our service team reviews the request, plans the visit, and confirms a slot." },
  { n: "03", title: "Get It Fixed", body: "A Khurchi.com service executive arrives at your doorstep and restores your chair." },
];

const DIAGNOSTICS = [
  { id: "cylinder", top: "58%", left: "50%", label: "Gas Cylinder", problem: "Chair sinks when you sit", why: "The hydraulic gas cylinder has lost pressure and needs replacement." },
  { id: "wheel", top: "88%", left: "24%", label: "Casters / Wheels", problem: "Wheels stuck or broken", why: "Casters wear out or collect debris. A quick swap restores smooth movement." },
  { id: "seat", top: "44%", left: "50%", label: "Seat & Upholstery", problem: "Torn or sagging upholstery", why: "Foam and fabric age. We re-cushion and re-cover in your preferred material." },
  { id: "mech", top: "62%", left: "34%", label: "Tilt Mechanism", problem: "Recline is stiff or broken", why: "Springs and levers can jam. We rebuild the tilt to factory feel." },
  { id: "arm", top: "40%", left: "82%", label: "Armrest", problem: "Loose or wobbly arms", why: "Bolts loosen with use. We re-secure and reinforce the arm assembly." },
];

export default function HomePage() {
  const [active, setActive] = useState(null);

  return (
    <div className="min-h-screen bg-khurchi-bg overflow-hidden">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center pt-28 pb-16 px-6 lg:px-12">
        <div className="grain-overlay absolute inset-0" />
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-khurchi-brand/8 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] rounded-full bg-khurchi-accent/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center w-full">
          <motion.div variants={container} initial="hidden" animate="show" className="lg:col-span-7">
            <motion.div variants={item} className="inline-flex items-center gap-2 border border-khurchi-border bg-white px-4 py-2 rounded-full text-xs font-medium text-khurchi-brand">
              <MapPin className="w-3.5 h-3.5" /> Mumbai&apos;s Chair Care Network
            </motion.div>
            <motion.h1 variants={item} className="mt-8 font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-khurchi-ink">
              Your Chair<br />Deserves <span className="underline-brush italic">Better Care.</span>
            </motion.h1>
            <motion.p variants={item} className="mt-8 text-lg text-khurchi-mute max-w-xl leading-relaxed">
              Broken chair? Damaged upholstery? Loose wheels? Tell us what needs attention and our service team will take it from there.
            </motion.p>
            <motion.div variants={item} className="mt-10 flex flex-wrap gap-4">
              <Link to="/book" data-testid="hero-book-cta" className="group inline-flex items-center gap-2 bg-khurchi-brand text-khurchi-bg rounded-full px-8 py-4 font-medium hover:bg-khurchi-brandDark hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(44,76,59,0.28)] transition-[background-color,transform,box-shadow] duration-200">
                Book a Service <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/track" data-testid="hero-track-cta" className="inline-flex items-center gap-2 border border-khurchi-brand text-khurchi-brand rounded-full px-8 py-4 font-medium hover:bg-khurchi-brand hover:text-khurchi-bg transition-colors duration-200">
                <Search className="w-4 h-4" /> Track Your Request
              </Link>
            </motion.div>
            <motion.div variants={item} className="mt-12 flex flex-wrap gap-6 text-sm text-khurchi-mute">
              {["Professional Service Team", "Easy Booking", "Doorstep Service"].map((t) => (
                <div key={t} className="flex items-center gap-2"><Sparkle className="w-4 h-4 text-khurchi-accent" /> {t}</div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }} className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-khurchi-bg2 border border-khurchi-border">
              <img src="https://images.unsplash.com/photo-1580480055273-228ff5388ef8?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80" alt="Premium office chair" className="w-full h-full object-cover" />
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-6 left-6 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/60 shadow-lg">
                <div className="text-[10px] uppercase tracking-[0.2em] text-khurchi-mute">Job Number</div>
                <div className="font-display text-lg text-khurchi-ink">KHR-2026-000123</div>
              </motion.div>
              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-6 right-6 bg-khurchi-brand text-khurchi-bg rounded-2xl px-4 py-3 shadow-xl">
                <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">Status</div>
                <div className="font-medium">Team Dispatched</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-24 lg:py-32 px-6 lg:px-12 bg-khurchi-bg2">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-khurchi-accent font-medium">How It Works</div>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl text-khurchi-ink tracking-tight">Three steps. One promise.</h2>
            <p className="mt-6 text-khurchi-mute text-lg">From your first message to a chair that feels new — the Khurchi.com service team handles everything.</p>
          </motion.div>

          <div className="relative mt-16 grid md:grid-cols-3 gap-8">
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }} className="hidden md:block absolute top-14 left-[10%] right-[10%] h-px bg-khurchi-brand/25 origin-left" />
            {STEPS.map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: i * 0.15 }} className="relative bg-white border border-khurchi-border rounded-2xl p-8">
                <div className="w-8 h-8 rounded-full bg-khurchi-brand text-khurchi-bg flex items-center justify-center font-display text-sm mb-6">{i + 1}</div>
                <div className="font-display text-6xl text-khurchi-accent/20 absolute top-4 right-6 select-none">{s.n}</div>
                <h3 className="font-display text-2xl text-khurchi-ink">{s.title}</h3>
                <p className="mt-3 text-khurchi-mute leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 lg:py-32 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-2xl">
              <div className="text-xs uppercase tracking-[0.2em] text-khurchi-accent font-medium">Services</div>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl text-khurchi-ink tracking-tight">Care for every kind of chair.</h2>
            </motion.div>
            <Link to="/book" className="inline-flex items-center gap-2 text-khurchi-brand font-medium hover:gap-3 transition-[gap]">Start a request <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <motion.div key={s.title} data-testid={`service-card-${s.title.toLowerCase().replace(/\s+/g, "-")}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay: i * 0.05 }} whileHover={{ y: -6 }} className="group bg-white p-8 rounded-2xl border border-khurchi-border hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-shadow duration-300 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-khurchi-bg2 text-khurchi-brand flex items-center justify-center group-hover:bg-khurchi-brand group-hover:text-khurchi-bg transition-colors duration-300">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <span className="font-display text-2xl text-khurchi-accent/30">{s.tag}</span>
                </div>
                <h3 className="mt-8 font-display text-2xl text-khurchi-ink">{s.title}</h3>
                <p className="mt-3 text-khurchi-mute leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DIAGNOSTICS */}
      <section className="py-24 lg:py-32 px-6 lg:px-12 bg-khurchi-ink text-khurchi-bg relative overflow-hidden">
        <div className="grain-overlay opacity-15" />
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-khurchi-accent font-medium">Common Chair Problems</div>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight">Point at the problem.</h2>
            <p className="mt-6 text-khurchi-bg/70 text-lg">Hover or tap any part of the chair to learn what usually goes wrong and how we fix it.</p>
          </div>
          <div className="mt-16 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 relative aspect-[4/5] max-w-lg mx-auto w-full bg-khurchi-bg/5 rounded-3xl border border-khurchi-bg/10 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1580480055273-228ff5388ef8?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80" alt="Office chair diagnostics" className="w-full h-full object-cover opacity-70" />
              {DIAGNOSTICS.map((d) => (
                <button key={d.id} data-testid={`diag-hotspot-${d.id}`} onMouseEnter={() => setActive(d.id)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === d.id ? null : d.id)} style={{ top: d.top, left: d.left }} className={`absolute -translate-x-1/2 -translate-y-1/2 group`}>
                  <motion.span animate={{ scale: active === d.id ? 1.4 : 1 }} className={`block w-4 h-4 rounded-full ring-4 ring-khurchi-accent/25 ${active === d.id ? "bg-khurchi-accent" : "bg-khurchi-bg"}`} />
                  <span className="absolute inset-0 rounded-full animate-ping bg-khurchi-accent/40" />
                </button>
              ))}
            </div>
            <div className="lg:col-span-5 space-y-3">
              {DIAGNOSTICS.map((d) => (
                <motion.div key={d.id} onMouseEnter={() => setActive(d.id)} onMouseLeave={() => setActive(null)} whileHover={{ x: 6 }} className={`p-5 rounded-2xl border cursor-pointer ${active === d.id ? "bg-khurchi-bg text-khurchi-ink border-khurchi-accent" : "bg-transparent text-khurchi-bg border-khurchi-bg/15"}`}>
                  <div className={`text-xs uppercase tracking-[0.2em] ${active === d.id ? "text-khurchi-accent" : "text-khurchi-bg/50"}`}>{d.label}</div>
                  <div className="mt-1 font-display text-xl">{d.problem}</div>
                  {active === d.id && <div className="mt-2 text-sm opacity-80">{d.why}</div>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 lg:py-32 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-khurchi-accent">We Take It From Here</div>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl text-khurchi-ink tracking-tight">Ready to give your chair a second life?</h2>
          <p className="mt-6 text-khurchi-mute text-lg max-w-2xl mx-auto">Submit a service request in under two minutes. Our team will review the details and coordinate the visit.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/book" className="bg-khurchi-brand text-khurchi-bg rounded-full px-8 py-4 font-medium hover:bg-khurchi-brandDark hover:-translate-y-0.5 transition-[background-color,transform] duration-200">Book a Service</Link>
            <Link to="/track" className="border border-khurchi-brand text-khurchi-brand rounded-full px-8 py-4 font-medium hover:bg-khurchi-brand hover:text-khurchi-bg transition-colors duration-200">Track Your Request</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
