import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import HomePage from "@/pages/HomePage";
import BookingPage from "@/pages/BookingPage";
import TrackPage from "@/pages/TrackPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import BookingSuccessPage from "@/pages/BookingSuccessPage";

function App() {
  return (
    <div className="App">
      <Toaster position="top-center" richColors closeButton />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/book/success" element={<BookingSuccessPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/track/:jobNumber" element={<TrackPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
