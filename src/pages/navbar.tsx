import { Link } from "react-router-dom";
import "./navbar.css";

export default function Navbar() {
  return (
    <aside className="navbar">
      <h2>Parts Tracker</h2>

      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <a href="/parts">Parts</a>
        <a href="/assets">Assets</a>
        <a href="/scan">Scan Barcode</a>
        <a href="/purchases">Purchases</a>
        <a href="/locations">Locations</a> 
      </nav>

      <div className="profile">
          Profile
      </div>
    </aside>
  );
}
