import ThemeToggle from "../../theme/ThemeToggle.tsx";
 
export default function Login() {
    return (
        <div className="login-page min-vh-100">
            <div className="login-theme-toggle">
                <ThemeToggle compact />
            </div>

            <div className="login-card card border-0 shadow-sm max-w-sm">
                <img
                    src="/teslentra-shield.svg"
                    alt="Teslentra"
                    className="logo" />
                <h3>Teslentra</h3>
                
                <p> Sign in to your account. </p>
                
                <button className="login-button btn btn-dark">
                    Sign in with Microsoft
                </button> 
            </div>
        </div>
    );
}
