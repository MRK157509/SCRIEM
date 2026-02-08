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
    <div className="min-h-screen bg-[#05070b] text-white">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <main className="flex-1 min-w-0 p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
