import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV = [
  { label: "How It Works", href: "/#how" },
  { label: "Services", href: "/#services" },
  { label: "Track Request", href: "/track" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (href) => {
    setOpen(false);
    if (href.startsWith("/#")) {
      if (loc.pathname !== "/") { nav("/"); setTimeout(() => document.querySelector(href.slice(1))?.scrollIntoView({ behavior: "smooth" }), 60); }
      else document.querySelector(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    } else nav(href);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,backdrop-filter,border-color,padding] duration-300 ${scrolled ? "bg-khurchi-bg/85 backdrop-blur-xl border-b border-khurchi-border py-3" : "bg-transparent py-5"}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-12">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-lg bg-khurchi-brand text-khurchi-bg font-display font-bold flex items-center justify-center text-lg">K</span>
          <span className="font-display text-xl tracking-tight text-khurchi-ink">Khurchi<span className="text-khurchi-accent">.com</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <button key={n.href} onClick={() => go(n.href)} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-khurchi-ink/80 hover:text-khurchi-brand transition-colors">
              {n.label}
            </button>
          ))}
          <button onClick={() => go("/book")} data-testid="nav-book-cta" className="bg-khurchi-brand text-khurchi-bg rounded-full px-6 py-2.5 text-sm font-medium hover:bg-khurchi-brandDark hover:-translate-y-0.5 hover:shadow-lg transition-[background-color,transform,box-shadow] duration-200">
            Book a Service
          </button>
        </nav>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle" aria-label="Menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden bg-khurchi-bg border-t border-khurchi-border">
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV.map((n) => (
                <button key={n.href} onClick={() => go(n.href)} className="text-left text-khurchi-ink py-2 border-b border-khurchi-border/60" data-testid={`nav-mobile-${n.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  {n.label}
                </button>
              ))}
              <button onClick={() => go("/book")} data-testid="nav-mobile-book-cta" className="mt-2 bg-khurchi-brand text-khurchi-bg rounded-full py-3 font-medium">
                Book a Service
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
