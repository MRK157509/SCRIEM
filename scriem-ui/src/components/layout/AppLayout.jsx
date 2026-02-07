import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#070A0F] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        {/* Main */}
        <div className="flex-1 flex flex-col">
          {/* Top header strip (keep simple & stable) */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-6">
            <div className="text-white/80">SOC Overview</div>

            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10">
                ⟳ 30s
              </button>
              <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10">
                🔔
              </button>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
