export default function DrawerSection({ title, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-2">{title}</h3>
      <div className="text-sm text-slate-200">{children}</div>
    </div>
  );
}
