import { useState } from "react";

export default function DrawerTabs({ tabs }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex border-b border-slate-800 mb-3">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={`px-4 py-2 text-sm ${
              active === idx
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[active].content}</div>
    </div>
  );
}
