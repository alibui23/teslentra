import "./login.css";
 
export default function Login() {
    return (
        <div className="login-page">
            <div className="login-card">
                <img
                    src="/logo.png"
                    alt="Parts Tracker"
                    className="logo" />
                <h1>Parts Tracker</h1>
                
                <p> Sign in to your account. </p>
                
                <button className="login-button">
                    Sign in with Microsoft
                </button> 
            </div>
        </div>
    );
}
