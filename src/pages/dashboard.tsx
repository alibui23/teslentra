import Layout from "./layout.tsx";
import "./dashboard.css";

export default function Dashboard() {
    return (
        <Layout>
            <h2>Dashboard</h2>
            <p>Welcome to Parts Tracker</p>

            {/* Data will be added later */}
            {/*Parts */} 
            <div className="summary-cards">
                <div className="summary-card">
                    <h3> Parts </h3>
                    <strong> 1 </strong>
                    <p> 5 low-stock items </p>
                </div>

            {/* Assets */}
                <div className="summary-card">
                    <h3> Assets </h3>
                    <strong> 2 </strong>
                    <p> 62 available </p>
                </div>

            {/* Purchases */} 
              <div className="summary-card">
                    <h3> Purchases </h3>
                    <strong> 3 </strong>
                    <p> 6 awaiting delivery </p>
                </div>

            {/* Checkouts */}
                <div className="summary-card">
                    <h3> Checkouts</h3>
                    <strong> 4 </strong>
                    <p> 3 due this week </p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-details">
                <div className="dashboard-card recent-activity">
                    <h2> Recent Activity </h2>

                    <div className="activity-item">
                        <div>
                            <strong> Part added </strong>
                            <p> Example Part was added to inventory </p>
                        </div>
                        <span> 10 minutes ago </span>
                    </div>

                    <div className="activity-item">
                        <div>
                            <strong> Asset checked out </strong>
                            <p> Diagnostic Scanner was checked out </p>
                        </div>
                        <span> 1 hour ago </span>
                    </div>

                    <div className="activity-item">
                        <div>
                            <strong> Purchase received </strong>
                            <p> Purchase order #PO-1042 was received.</p>
                        </div>
                        <span> 3 hours ago </span>
                    </div>
                </div>

                {/* Activity Overview */}
                <div className="dashboard-card overview">
                    <h2>Overview</h2>

                    <div className="overview-item">
                        <span> Available parts </span>
                        <strong> 230 </strong>
                    </div>

                    <div className="overview-item">
                        <span> Low stock </span>
                        <strong> 18 </strong>
                    </div>

                    <div className="overview-item">
                        <span>Assets in use</span>
                        <strong> 14 </strong>
                    </div>

                    <div className="overview-item">
                        <span> Open purchases </span>
                        <strong> 6 </strong>
                    </div>
                </div>
            </div>
        </Layout>
    );
}