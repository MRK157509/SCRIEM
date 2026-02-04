import DrawerSection from "./DrawerSection";
import DrawerTabs from "./DrawerTabs";

export default function AlertDrawerContent({ alert }) {
  if (!alert) return null;

  return (
    <DrawerTabs
      tabs={[
        {
          label: "Summary",
          content: (
            <DrawerSection title="Alert Summary">
              <div>Severity: {alert.severity}</div>
              <div>Status: {alert.status}</div>
              <div>Host: {alert.host}</div>
              <div>Title: {alert.title}</div>
            </DrawerSection>
          ),
        },
        {
          label: "Entities",
          content: (
            <DrawerSection title="Entities">
              <div>User: {alert.user || "N/A"}</div>
              <div>IP: {alert.ip || "N/A"}</div>
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
