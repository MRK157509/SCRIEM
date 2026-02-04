import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";

import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Timeline from "./pages/Timeline";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/timeline" element={<Timeline />} />

          {/* Optional placeholders for later */}
          <Route path="/cases" element={<div className="text-white/70">Cases (Coming Soon)</div>} />
          <Route path="/settings" element={<div className="text-white/70">Settings (Coming Soon)</div>} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
