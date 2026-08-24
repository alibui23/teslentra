import { useEffect, useMemo, useState } from "react";
import { Box, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, MapPin, Package, RefreshCw, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "../../layouts/AppLayout.tsx";
import Topbar from "../../components/Topbar.tsx";
import { API_ORIGIN as API_URL } from "../../config/api.ts";

type DashboardData = {
  summary: { totalParts: number; totalAssets: number; availableAssets: number; activeCheckouts: number; overdueCheckouts: number; openPurchases: number; componentUnits: number; totalLocations: number };
  recentActivity: Array<{ event_id: string; event_type: string; occurred_at: string; record_id: number; reference: string; description: string }>;
  checkoutEvents: Array<{ checkout_id: number; asset_id: number; equipment_number: string; out_at: string | null; due_at: string | null; returned_at: string | null }>;
};

const emptyData: DashboardData = { summary: { totalParts: 0, totalAssets: 0, availableAssets: 0, activeCheckouts: 0, overdueCheckouts: 0, openPurchases: 0, componentUnits: 0, totalLocations: 0 }, recentActivity: [], checkoutEvents: [] };

function dateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, divisor] of ranges) if (Math.abs(seconds) >= divisor) return formatter.format(Math.round(seconds / divisor), unit);
  return "just now";
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/dashboard`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load dashboard data.");
      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [month]);

  const eventsByDate = useMemo(() => {
    const result = new Map<string, Array<{ id: string; label: string; assetId: number; kind: string }>>();
    data.checkoutEvents.forEach((event) => {
      const datedEvents: Array<[string | null, string, string]> = [[event.out_at, "checked out", "out"], [event.due_at, "due", "due"], [event.returned_at, "checked in", "in"]];
      datedEvents.forEach(([date, label, kind]) => {
        if (!date) return;
        const key = dateKey(date);
        const items = result.get(key) ?? [];
        items.push({ id: `${event.checkout_id}-${kind}`, label: `${event.equipment_number} ${label}`, assetId: event.asset_id, kind });
        result.set(key, items);
      });
    });
    return result;
  }, [data.checkoutEvents]);

  const cards = [
    { label: "Parts", value: data.summary.totalParts, note: `${data.summary.componentUnits} component units`, to: "/parts", icon: Package },
    { label: "Assets", value: data.summary.totalAssets, note: `${data.summary.availableAssets} available`, to: "/assets", icon: Box },
    { label: "Active checkouts", value: data.summary.activeCheckouts, note: data.summary.overdueCheckouts ? `${data.summary.overdueCheckouts} overdue` : "Nothing overdue", to: "/assets", icon: ClipboardCheck },
    { label: "Open purchases", value: data.summary.openPurchases, note: `${data.summary.totalLocations} locations (Coming soon)`, to: "/purchases", icon: ShoppingCart },
  ];

  return (
    <AppLayout>
      <div className="dashboard-page">
        <header className="dashboard-header"><div><p className="page-eyebrow">Inventory overview</p><h1>Dashboard</h1><p>Live inventory, movement, and checkout activity from your database.</p></div><div className="dashboard-header-tools"><Topbar /><button type="button" className="dashboard-refresh" onClick={() => void loadDashboard()} disabled={loading}><RefreshCw size={17} className={loading ? "spin" : ""} /> Refresh</button></div></header>
        {error && <div className="dashboard-error" role="alert">{error}</div>}
        <div className="dashboard-summary-grid">
          {cards.map(({ label, value, note, to, icon: Icon }) => <Link to={to} className="dashboard-summary-card" key={label}><span className="dashboard-card-icon"><Icon size={20} /></span><div><span>{label}</span><strong>{loading ? "—" : value}</strong><small>{note}</small></div></Link>)}
        </div>
        <div className="dashboard-grid">
          <section className="dashboard-panel dashboard-calendar-panel">
            <div className="dashboard-panel-heading"><div><CalendarDays size={20} /><div><h2>Checkout calendar</h2><p>Checkout, due, and return dates</p></div></div><div className="calendar-controls"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button></div></div>
            <div className="calendar-grid calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">{calendarDays.map((day) => { const key = dateKey(day); const events = eventsByDate.get(key) ?? []; const outside = day.getMonth() !== month.getMonth(); const today = key === dateKey(new Date()); return <div className={`calendar-day${outside ? " calendar-day--outside" : ""}${today ? " calendar-day--today" : ""}`} key={key}><span className="calendar-date">{day.getDate()}</span><div className="calendar-events">{events.slice(0, 3).map((event) => <Link to={`/assets/${event.assetId}`} className={`calendar-event calendar-event--${event.kind}`} key={event.id} title={event.label}>{event.label}</Link>)}{events.length > 3 && <small>+{events.length - 3} more</small>}</div></div>; })}</div>
          </section>
          <section className="dashboard-panel recent-activity-panel">
            <div className="dashboard-panel-heading"><div><RefreshCw size={20} /><div><h2>Recent activity</h2><p>Latest inventory changes</p></div></div></div>
            <div className="activity-list">{data.recentActivity.length === 0 ? <p className="empty-detail">No activity is available yet.</p> : data.recentActivity.map((activity) => { const isPartEvent = activity.event_type.startsWith("part") || activity.event_type.startsWith("component"); const isAssetEvent = activity.event_type.includes("asset"); const wasDeleted = activity.event_type.endsWith("deleted"); const target = isPartEvent ? wasDeleted ? "/parts" : `/parts/${activity.record_id}` : isAssetEvent ? wasDeleted ? "/assets" : `/assets/${activity.record_id}` : "/purchases"; return <Link to={target} className="activity-row" key={activity.event_id}><span className={`activity-dot activity-dot--${activity.event_type}`} /><div><strong>{activity.reference}</strong><p>{activity.description}</p></div><time>{relativeTime(activity.occurred_at)}</time></Link>; })}</div>
          </section>
        </div>
        <Link to="/locations" className="dashboard-location-link"><MapPin size={17} /> Browse all {data.summary.totalLocations} storage locations</Link>
      </div>
    </AppLayout>
  );
}
