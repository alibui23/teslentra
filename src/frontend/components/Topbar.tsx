import { useMemo, useState } from "react";
import { Boxes, LayoutDashboard, MapPin, Package, Search } from "lucide-react";
import { Link } from "react-router-dom";

const destinations = [
  { label: "Dashboard", description: "Inventory overview and calendar", to: "/dashboard", icon: LayoutDashboard },
  { label: "Parts", description: "Browse parts and assemblies", to: "/parts", icon: Package },
  { label: "Assets", description: "Browse physical assets and custody", to: "/assets", icon: Boxes },
  { label: "Locations", description: "Open the storage hierarchy", to: "/locations", icon: MapPin },
];

export default function Topbar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return destinations.filter((item) => !normalized || `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <div className="dashboard-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <Search size={17} aria-hidden="true" />
      <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Go to a page…" aria-label="Search pages" aria-expanded={open} />
      {open && <div className="dashboard-search-results" role="listbox">
        {matches.map(({ label, description, to, icon: Icon }) => <Link to={to} key={to} onClick={() => setOpen(false)}><Icon size={17} /><span><strong>{label}</strong><small>{description}</small></span></Link>)}
        {matches.length === 0 && <p>No matching pages</p>}
      </div>}
    </div>
  );
}
