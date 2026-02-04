import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DrawerSection from "./DrawerSection";
import DrawerTabs from "./DrawerTabs";

function Field({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="text-slate-400 text-xs">{label}</div>
      <div className="text-white/90 text-sm text-right break-words max-w-[70%]">
        {value ?? "N/A"}
      </div>
    </div>
  );
}

function PivotButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "px-3 py-1 text-xs rounded-lg border transition",
        disabled
          ? "bg-slate-800/30 text-slate-500 border-slate-800 cursor-not-allowed"
          : "bg-slate-700/40 text-slate-200 border-slate-600 hover:bg-slate-600/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AlertDrawerContent({ alert }) {
  const nav = useNavigate();
  if (!alert) return null;

  const entities = useMemo(
    () => ({
      user: alert.user || null,
      ip: alert.ip || null,
      host: alert.host || null,
    }),
    [alert]
  );

  const pivotTimeline = (value) => {
    if (!value) return;
    nav(`/timeline?q=${encodeURIComponent(value)}`);
  };

  return (
    <DrawerTabs
      tabs={[
        {
          label: "Summary",
          content: (
            <DrawerSection title="Alert Summary">
              <Field label="Title" value={alert.title} />
              <Field label="Severity" value={alert.severity} />
              <Field label="Status" value={alert.status} />
              <Field label="Host" value={alert.host} />
            </DrawerSection>
          ),
        },
        {
          label: "Entities",
          content: (
            <DrawerSection title="Entities">
              <Field label="User" value={entities.user} />
              <Field label="IP" value={entities.ip} />
              <Field label="Host" value={entities.host} />

              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-2">
                  Pivot (Investigation)
                </div>
                <div className="flex flex-wrap gap-2">
                  <PivotButton
                    onClick={() => pivotTimeline(entities.ip)}
                    disabled={!entities.ip}
                  >
                    Search Timeline (IP)
                  </PivotButton>

                  <PivotButton
                    onClick={() => pivotTimeline(entities.user)}
                    disabled={!entities.user}
                  >
                    Search Timeline (User)
                  </PivotButton>

                  <PivotButton
                    onClick={() => pivotTimeline(entities.host)}
                    disabled={!entities.host}
                  >
                    Search Timeline (Host)
                  </PivotButton>
                </div>
              </div>
            </DrawerSection>
          ),
        },
        {
          label: "Raw",
          content: (
            <DrawerSection title="Raw JSON">
              <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                {JSON.stringify(alert, null, 2)}
              </pre>
            </DrawerSection>
          ),
        },
      ]}
    />
  );
}
