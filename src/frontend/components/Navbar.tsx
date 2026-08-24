import { useState } from "react";
import { Barcode, Boxes, ChevronLeft, ChevronRight, LayoutDashboard, MapPin, Menu, Package, ShoppingCart, UserRound, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import ThemeToggle from "../theme/ThemeToggle.tsx";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/parts", label: "Parts", icon: Package },
  { to: "/assets", label: "Assets", icon: Boxes },
  { to: "/barcode", label: "Scan Barcode", icon: Barcode, preview: true },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart, preview: true },
  { to: "/locations", label: "Locations", icon: MapPin },
];

export default function Navbar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("teslentra-sidebar-collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    setCollapsed((current) => {
      localStorage.setItem("teslentra-sidebar-collapsed", String(!current));
      return !current;
    });
  }

  return (
    <>
      <button type="button" className="mobile-nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
      <div className="global-theme-control"><ThemeToggle compact /></div>
      {mobileOpen && <button type="button" className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`app-sidebar${collapsed ? " app-sidebar--collapsed" : ""}${mobileOpen ? " app-sidebar--mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-mark"><img src="/teslentra-shield.svg" alt="Teslentra" /></span>
          <span className="sidebar-brand-text">Teslentra</span>
          <button type="button" className="mobile-nav-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <nav className="nav nav-pills flex-column gap-1" aria-label="Main navigation">
          {items.map(({ to, label, icon: Icon, preview }) => (
            <NavLink to={to} key={to} className={({ isActive }) => `${isActive ? "active" : ""}${preview ? " nav-item--preview" : ""}`} onClick={() => setMobileOpen(false)} title={preview ? `${label} page is still being established` : collapsed ? label : undefined}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span>
              {preview && <small>Coming soon</small>}
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-footer">
          <div className="profile"><UserRound size={18} /><span>Profile</span></div>
          <button type="button" className="sidebar-collapse-button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}<span>{collapsed ? "Expand" : "Collapse"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
