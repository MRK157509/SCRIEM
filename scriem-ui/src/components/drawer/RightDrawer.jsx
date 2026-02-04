import { useEffect } from "react";

export default function RightDrawer({
  isOpen,
  onClose,
  title,
  severity,
  children,
}) {
  // 4.6.3: Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // 4.6.3: ESC closes the drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const severityBadgeClass = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "critical") return "bg-red-600/20 text-red-400 border-red-500/30";
    if (s === "high") return "bg-orange-600/20 text-orange-400 border-orange-500/30";
    if (s === "medium") return "bg-yellow-600/20 text-yellow-400 border-yellow-500/30";
    if (s === "low") return "bg-green-600/20 text-green-400 border-green-500/30";
    return "bg-slate-700/40 text-slate-300 border-slate-600/60";
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 border-l border-slate-800 bg-slate-950/95 shadow-2xl"
        style={{ width: "35%" }}
      >
        {/* Header (keeps your 4.6.2 actions) */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">{title}</h2>

              {severity && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-md font-medium border ${severityBadgeClass(
                    severity
                  )}`}
                >
                  {severity}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl leading-none"
              aria-label="Close drawer"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* SOC Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1 text-xs rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition">
              Triage
            </button>

            <button className="px-3 py-1 text-xs rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition">
              Close
            </button>

            <button className="px-3 py-1 text-xs rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition">
              Escalate
            </button>

            <button className="px-3 py-1 text-xs rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition">
              Create Case
            </button>

            <button className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-300 border border-slate-600 hover:bg-slate-600/40 transition">
              Copy IOC
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-88px)] overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}
