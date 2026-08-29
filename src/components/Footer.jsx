import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-khurchi-ink text-khurchi-bg mt-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-khurchi-accent text-khurchi-ink font-display font-bold flex items-center justify-center">K</span>
            <span className="font-display text-2xl">Khurchi<span className="text-khurchi-accent">.com</span></span>
          </div>
          <p className="mt-6 text-khurchi-bg/70 max-w-md leading-relaxed">
            Mumbai&apos;s Chair Care Network. Professional repair, upholstery and maintenance for every kind of chair — brought right to your door.
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-khurchi-bg/50">Service Team · Mumbai · Thane · Navi Mumbai</p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-khurchi-bg/50 mb-4">Explore</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/#how" className="hover:text-khurchi-accent transition-colors">How It Works</Link></li>
            <li><Link to="/#services" className="hover:text-khurchi-accent transition-colors">Services</Link></li>
            <li><Link to="/track" className="hover:text-khurchi-accent transition-colors">Track Request</Link></li>
            <li><Link to="/book" className="hover:text-khurchi-accent transition-colors">Book a Service</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-khurchi-bg/50 mb-4">Contact</h4>
          <ul className="space-y-3 text-sm text-khurchi-bg/80">
            <li>info@khurchi.com</li>
            <li>Service Team, Mumbai</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-khurchi-bg/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-khurchi-bg/50">
          <span>© {new Date().getFullYear()} Khurchi.com — All rights reserved.</span>
          <Link to="/admin/login" data-testid="footer-admin-link" className="hover:text-khurchi-accent">Service Executive Portal →</Link>
        </div>
      </div>
    </footer>
  );
}
