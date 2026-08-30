import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { LogOut, Search as SearchIcon, RefreshCw, Loader2, X, Phone, Mail, MapPin, User, ImageIcon } from "lucide-react";
import { api, setAuthToken, getAuthToken, errMessage } from "@/lib/api";

const STATUSES = ["Request Received", "Service Review", "Team Dispatched", "In Progress", "Completed", "Cancelled"];
const AREAS = ["", "South Mumbai", "Andheri West", "Andheri East", "Bandra West", "Bandra East", "Powai", "Malad", "Borivali", "Dadar", "Lower Parel", "Worli", "Thane West", "Thane East", "Navi Mumbai", "Vashi", "Kharghar", "Kalyan", "Dombivli", "Ulhasnagar"];

const statusColor = (s) => ({
  "Request Received": "bg-khurchi-bg2 text-khurchi-brand",
  "Service Review": "bg-khurchi-accent/15 text-khurchi-accentDark",
  "Team Dispatched": "bg-blue-100 text-blue-700",
  "In Progress": "bg-yellow-100 text-yellow-800",
  "Completed": "bg-emerald-100 text-emerald-700",
  "Cancelled": "bg-khurchi-error/10 text-khurchi-error",
}[s] || "bg-khurchi-bg2 text-khurchi-mute");

export default function AdminDashboardPage() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, by_status: {} });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    if (!getAuthToken()) { nav("/admin/login"); return; }
    setLoading(true);
    try {
      const params = {};
      if (q.trim()) params.search = q.trim();
      if (status) params.status = status;
      if (area) params.area = area;
      const [r, s] = await Promise.all([
        api.get("/admin/bookings", { params }),
        api.get("/admin/bookings/stats"),
      ]);
      setItems(r.data.items || []);
      setStats(s.data);
    } catch (e) {
      if (e?.response?.status === 401) { setAuthToken(null); nav("/admin/login"); return; }
      toast.error("Could not load requests");
    } finally { setLoading(false); }
  }, [q, status, area, nav]);

  useEffect(() => { load(); }, [load]);

  const logout = () => { setAuthToken(null); nav("/admin/login"); };

  const applyPatch = async (job, patch) => {
    try {
      const r = await api.patch(`/admin/bookings/${job}`, patch);
      setItems((prev) => prev.map((x) => x.job_number === job ? r.data : x));
      if (detail?.job_number === job) setDetail(r.data);
      toast.success("Updated");
      const s = await api.get("/admin/bookings/stats"); setStats(s.data);
    } catch (e) { toast.error(errMessage(e, "Update failed")); }
  };

  return (
    <div className="min-h-screen bg-khurchi-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-khurchi-bg/85 backdrop-blur-xl border-b border-khurchi-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-khurchi-brand text-khurchi-bg font-display font-bold flex items-center justify-center">K</span>
            <div>
              <div className="font-display text-lg leading-none">Khurchi<span className="text-khurchi-accent">.com</span></div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-khurchi-mute">Service Executive Portal</div>
            </div>
          </div>
          <button onClick={logout} data-testid="admin-logout" className="inline-flex items-center gap-2 text-sm text-khurchi-mute hover:text-khurchi-error transition-colors"><LogOut className="w-4 h-4" /> Sign out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Requests" value={stats.total} />
          <StatCard label="Today" value={stats.today} />
          <StatCard label="In Progress" value={stats.by_status?.["In Progress"] || 0} />
          <StatCard label="Completed" value={stats.by_status?.["Completed"] || 0} />
        </div>

        {/* Filters */}
        <div className="mt-8 bg-white border border-khurchi-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-khurchi-mute" />
            <input data-testid="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search job #, name, phone, email…" className="w-full bg-khurchi-bg2 border border-khurchi-border rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-khurchi-brand text-sm" />
          </div>
          <select data-testid="filter-status" value={status} onChange={(e) => setStatus(e.target.value)} className="bg-khurchi-bg2 border border-khurchi-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-khurchi-brand">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select data-testid="filter-area" value={area} onChange={(e) => setArea(e.target.value)} className="bg-khurchi-bg2 border border-khurchi-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-khurchi-brand">
            {AREAS.map((a) => <option key={a || "all"} value={a}>{a || "All areas"}</option>)}
          </select>
          <button onClick={load} data-testid="admin-refresh" className="inline-flex items-center gap-2 border border-khurchi-border rounded-full px-4 py-2.5 text-sm hover:bg-khurchi-bg2"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        {/* Table */}
        <div className="mt-6 bg-white border border-khurchi-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-khurchi-bg2 text-xs uppercase tracking-[0.15em] text-khurchi-mute">
                <tr>
                  <th className="text-left px-5 py-3">Job #</th>
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-5 py-3">Chair</th>
                  <th className="text-left px-5 py-3">Area</th>
                  <th className="text-left px-5 py-3">When</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-khurchi-mute"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</td></tr>
                )}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-khurchi-mute">No requests match your filters.</td></tr>
                )}
                {items.map((b) => (
                  <tr key={b.job_number} className="border-t border-khurchi-border hover:bg-khurchi-bg2/40" data-testid={`row-${b.job_number}`}>
                    <td className="px-5 py-4 font-medium text-khurchi-ink">{b.job_number}</td>
                    <td className="px-5 py-4">
                      <div className="text-khurchi-ink">{b.customer_name}</div>
                      <div className="text-xs text-khurchi-mute">{b.customer_phone}</div>
                    </td>
                    <td className="px-5 py-4 text-khurchi-mute">{b.chair_type}</td>
                    <td className="px-5 py-4 text-khurchi-mute">{b.service_area}</td>
                    <td className="px-5 py-4 text-khurchi-mute">{b.preferred_date} · {b.preferred_time}</td>
                    <td className="px-5 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(b.status)}`}>{b.status}</span></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => setDetail(b)} data-testid={`view-${b.job_number}`} className="text-khurchi-brand hover:underline text-sm font-medium">View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Detail Drawer */}
      <AnimatePresence>
        {detail && <DetailDrawer key={detail.job_number} booking={detail} onClose={() => setDetail(null)} onPatch={applyPatch} />}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-khurchi-border rounded-2xl p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">{label}</div>
      <div className="mt-2 font-display text-3xl text-khurchi-ink">{value}</div>
    </div>
  );
}

function DetailDrawer({ booking, onClose, onPatch }) {
  const [status, setStatus] = useState(booking.status);
  const [tech, setTech] = useState(booking.assigned_technician_name || "");
  const [notes, setNotes] = useState(booking.internal_notes || "");
  const [cost, setCost] = useState(booking.estimated_cost ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const patch = {};
    if (status !== booking.status) patch.status = status;
    if (tech !== (booking.assigned_technician_name || "")) patch.assigned_technician_name = tech;
    if (notes !== (booking.internal_notes || "")) patch.internal_notes = notes;
    if (String(cost) !== String(booking.estimated_cost ?? "")) patch.estimated_cost = cost === "" ? null : Number(cost);
    if (Object.keys(patch).length === 0) { setSaving(false); toast.info("Nothing changed"); return; }
    await onPatch(booking.job_number, patch);
    setSaving(false);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-khurchi-ink/40 z-40" onClick={onClose} />
      <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }} className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-khurchi-bg z-50 overflow-y-auto" data-testid="admin-drawer">
        <div className="sticky top-0 bg-khurchi-bg/90 backdrop-blur-xl border-b border-khurchi-border p-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Request</div>
            <div className="font-display text-2xl text-khurchi-ink">{booking.job_number}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-khurchi-bg2 rounded-full" data-testid="drawer-close"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-8">
          <section className="bg-white border border-khurchi-border rounded-2xl p-6 space-y-3">
            <Row icon={<User className="w-4 h-4" />} label="Name" value={booking.customer_name} />
            <Row icon={<Phone className="w-4 h-4" />} label="Phone" value={booking.customer_phone} />
            <Row icon={<Mail className="w-4 h-4" />} label="Email" value={booking.customer_email || "—"} />
            <Row icon={<MapPin className="w-4 h-4" />} label="Area" value={booking.service_area} />
            <Row label="Address" value={booking.address} />
          </section>

          <section className="bg-white border border-khurchi-border rounded-2xl p-6 space-y-3">
            <Row label="Chair Type" value={booking.chair_type} />
            <Row label="Issue" value={booking.issue_description} />
            <Row label="Tags" value={(booking.issue_tags || []).join(", ") || "—"} />
            <Row label="Preferred" value={`${booking.preferred_date} · ${booking.preferred_time}`} />
            <Row label="Created" value={new Date(booking.created_at).toLocaleString()} />
          </section>

          {(booking.photos_count > 0 || booking.photos?.length > 0) && (
            <section className="bg-white border border-khurchi-border rounded-2xl p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute mb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-khurchi-brand" /> Attached Photos</div>
              <p className="text-sm text-khurchi-ink">
                <span className="font-semibold">{booking.photos_count || booking.photos?.length} customer photo(s)</span> attached & delivered via notification email to the field operations team.
              </p>
            </section>
          )}

          <section className="bg-white border border-khurchi-border rounded-2xl p-6 space-y-4">
            <div className="font-display text-xl">Operations</div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Status</label>
              <select data-testid="drawer-status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full bg-khurchi-bg2 border border-khurchi-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-khurchi-brand">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Assigned Technician</label>
              <input data-testid="drawer-tech" value={tech} onChange={(e) => setTech(e.target.value)} className="mt-2 w-full bg-khurchi-bg2 border border-khurchi-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-khurchi-brand" placeholder="e.g. Suresh K." />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Estimated Cost (₹)</label>
              <input data-testid="drawer-cost" type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className="mt-2 w-full bg-khurchi-bg2 border border-khurchi-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-khurchi-brand" placeholder="0" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-khurchi-mute">Internal Notes</label>
              <textarea data-testid="drawer-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 w-full bg-khurchi-bg2 border border-khurchi-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-khurchi-brand" placeholder="Not visible to customer" />
            </div>
            <button onClick={save} disabled={saving} data-testid="drawer-save" className="w-full inline-flex items-center justify-center gap-2 bg-khurchi-brand text-khurchi-bg rounded-full py-3 font-medium hover:bg-khurchi-brandDark disabled:opacity-60 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </button>
          </section>

          {booking.history?.length > 0 && (
            <section className="bg-white border border-khurchi-border rounded-2xl p-6">
              <div className="font-display text-xl mb-4">Audit history</div>
              <div className="space-y-3">
                {booking.history.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-khurchi-brand mt-2" />
                    <div>
                      <div className="text-khurchi-ink">{h.status}</div>
                      <div className="text-xs text-khurchi-mute">{new Date(h.at).toLocaleString()} · by {h.by}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </motion.aside>
    </>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="flex gap-3">
      <div className="w-32 text-xs uppercase tracking-[0.2em] text-khurchi-mute pt-1 flex items-center gap-2">{icon}{label}</div>
      <div className="flex-1 text-khurchi-ink">{value}</div>
    </div>
  );
}
