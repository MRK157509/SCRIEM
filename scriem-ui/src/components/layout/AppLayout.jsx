import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { isLoggedIn } from "../../lib/auth";

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    // allow login page without auth
    if (path === "/login") return;

    if (!isLoggedIn()) {
      nav("/login", { replace: true });
    }
  }, [nav, location.pathname]);

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_28%),linear-gradient(180deg,rgba(7,16,31,0.95),rgba(4,7,15,0.99))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:80px_80px]" />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <main className="flex-1 min-w-0 p-4 sm:p-5 lg:p-6">
            <div className="mx-auto w-full max-w-[1680px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
