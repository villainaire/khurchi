import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Upload, X, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, errMessage } from "@/lib/api";

const TAGS = ["Chair is sinking", "Broken wheel", "Torn upholstery", "Hydraulic issue", "Tilt mechanism issue", "Loose or damaged parts", "Other"];

export default function BookingPage() {
  const nav = useNavigate();
  const [meta, setMeta] = useState({ chair_types: [], time_slots: [], areas: [] });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "",
    chair_type: "", issue_description: "", issue_tags: [],
    service_area: "", address: "",
    preferred_date: "", preferred_time: "",
    photos: [],
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get("/meta").then((r) => setMeta(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleTag = (t) => {
    setForm((p) => ({ ...p, issue_tags: p.issue_tags.includes(t) ? p.issue_tags.filter((x) => x !== t) : [...p.issue_tags, t] }));
  };

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim() || form.customer_name.trim().length < 2) e.customer_name = "Please enter your full name";
    if (!/^\d{10,15}$/.test(form.customer_phone.replace(/\D/g, ""))) e.customer_phone = "Enter a valid phone number";
    if (form.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email)) e.customer_email = "Enter a valid email";
    if (!form.chair_type) e.chair_type = "Select a chair type";
    if (!form.issue_description.trim() || form.issue_description.trim().length < 5) e.issue_description = "Describe the issue briefly";
    if (!form.service_area.trim()) e.service_area = "Select your area";
    if (!form.address.trim() || form.address.trim().length < 5) e.address = "Enter your complete address";
    if (!form.preferred_date) e.preferred_date = "Pick a preferred date";
    else {
      const d = new Date(form.preferred_date);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (d < today) e.preferred_date = "Date cannot be in the past";
    }
    if (!form.preferred_time) e.preferred_time = "Pick a preferred time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onUpload = async (ev) => {
    const files = Array.from(ev.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (form.photos.length >= 5) { toast.warning("You can upload up to 5 photos"); break; }
        const fd = new FormData();
        fd.append("file", file);
        const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setForm((p) => ({ ...p, photos: [...p.photos, r.data.path] }));
      }
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(errMessage(e, "Upload failed"));
    } finally { setUploading(false); ev.target.value = ""; }
  };

  const removePhoto = (p) => setForm((prev) => ({ ...prev, photos: prev.photos.filter((x) => x !== p) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error("Please fix the highlighted fields"); return; }
    setSubmitting(true);
    try {
      const r = await api.post("/bookings", form);
      toast.success("Request received");
      nav("/book/success", { state: r.data });
    } catch (err) {
      toast.error(errMessage(err, "Could not submit your request. Please try again."));
    } finally { setSubmitting(false); }
  };

  const inputCls = (k) => `w-full bg-white border rounded-xl px-4 py-3 text-khurchi-ink focus:outline-none focus:ring-2 focus:ring-khurchi-brand focus:border-transparent transition-shadow duration-200 placeholder:text-khurchi-mute/60 ${errors[k] ? "border-khurchi-error" : "border-khurchi-border"}`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-khurchi-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 lg:px-12 pt-32 pb-24">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-khurchi-mute hover:text-khurchi-brand mb-8" data-testid="back-btn"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="text-xs uppercase tracking-[0.2em] text-khurchi-accent">Book a Service</div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl text-khurchi-ink tracking-tight">Tell us about your chair.</h1>
        <p className="mt-4 text-khurchi-mute text-lg max-w-2xl">Fill in a few details and our service team will take it from here.</p>

        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-12 bg-white border border-khurchi-border rounded-3xl p-8 lg:p-12 space-y-10">
          {/* Customer */}
          <section>
            <h2 className="font-display text-2xl text-khurchi-ink">Your details</h2>
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <Field label="Full Name" err={errors.customer_name}>
                <input data-testid="input-name" className={inputCls("customer_name")} value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Rajesh Verma" />
              </Field>
              <Field label="Mobile Number" err={errors.customer_phone}>
                <input data-testid="input-phone" className={inputCls("customer_phone")} value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} placeholder="98XXXXXXXX" />
              </Field>
              <Field label="Email (optional)" err={errors.customer_email} full>
                <input data-testid="input-email" className={inputCls("customer_email")} value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} placeholder="you@email.com" />
              </Field>
            </div>
          </section>

          {/* Chair */}
          <section>
            <h2 className="font-display text-2xl text-khurchi-ink">Chair & issue</h2>
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <Field label="Chair Type" err={errors.chair_type}>
                <select data-testid="select-chair-type" className={inputCls("chair_type")} value={form.chair_type} onChange={(e) => set("chair_type", e.target.value)}>
                  <option value="">Select chair type</option>
                  {(meta.chair_types || []).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Preferred Time" err={errors.preferred_time}>
                <select data-testid="select-time" className={inputCls("preferred_time")} value={form.preferred_time} onChange={(e) => set("preferred_time", e.target.value)}>
                  <option value="">Select time slot</option>
                  {(meta.time_slots || []).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="What's the issue?" err={errors.issue_description} full>
                <textarea data-testid="input-issue" rows={4} className={inputCls("issue_description")} value={form.issue_description} onChange={(e) => set("issue_description", e.target.value)} placeholder="Describe what's wrong. The more we know, the better prepared we come." />
              </Field>
              <div className="md:col-span-2">
                <div className="text-xs uppercase tracking-[0.2em] text-khurchi-mute mb-3">Quick diagnostic tags</div>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((t) => (
                    <button type="button" key={t} onClick={() => toggleTag(t)} data-testid={`tag-${t.toLowerCase().replace(/\s+/g, "-")}`} className={`px-4 py-2 rounded-full text-sm border transition-colors duration-200 ${form.issue_tags.includes(t) ? "bg-khurchi-brand text-khurchi-bg border-khurchi-brand" : "bg-khurchi-bg2 text-khurchi-ink border-khurchi-border hover:border-khurchi-brand"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <h2 className="font-display text-2xl text-khurchi-ink">Where should we visit?</h2>
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <Field label="Area / Locality" err={errors.service_area}>
                <select data-testid="select-area" className={inputCls("service_area")} value={form.service_area} onChange={(e) => set("service_area", e.target.value)}>
                  <option value="">Select your area</option>
                  {(meta.areas || []).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Preferred Date" err={errors.preferred_date}>
                <input data-testid="input-date" type="date" min={today} className={inputCls("preferred_date")} value={form.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />
              </Field>
              <Field label="Complete Address" err={errors.address} full>
                <textarea data-testid="input-address" rows={3} className={inputCls("address")} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Flat, Building, Street, Landmark, Pincode" />
              </Field>
            </div>
          </section>

          {/* Photos */}
          <section>
            <h2 className="font-display text-2xl text-khurchi-ink">Photos (optional)</h2>
            <p className="text-sm text-khurchi-mute mt-1">Up to 5 images. Helps our team prepare the right parts.</p>
            <div className="mt-4 flex flex-wrap gap-4">
              {form.photos.map((p) => (
                <div key={p} className="relative w-28 h-28 rounded-xl overflow-hidden border border-khurchi-border">
                  <img src={`${api.defaults.baseURL}/files/${p}`} alt="upload" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(p)} className="absolute top-1 right-1 bg-khurchi-ink/80 text-khurchi-bg rounded-full p-1"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {form.photos.length < 5 && (
                <label className="w-28 h-28 rounded-xl border-2 border-dashed border-khurchi-border flex flex-col items-center justify-center text-khurchi-mute hover:border-khurchi-brand hover:text-khurchi-brand cursor-pointer transition-colors" data-testid="upload-photo">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-xs mt-2">Upload</span></>}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
                </label>
              )}
            </div>
          </section>

          <button type="submit" disabled={submitting} data-testid="submit-booking" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-khurchi-brand text-khurchi-bg rounded-full px-10 py-4 font-medium hover:bg-khurchi-brandDark disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Request <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </motion.form>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, err, full, children }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-xs uppercase tracking-[0.2em] text-khurchi-mute font-medium">{label}</label>
      <div className="mt-2">{children}</div>
      {err && <div className="mt-1.5 text-xs text-khurchi-error">{err}</div>}
    </div>
  );
}
