import "./topbar.css";
 
export default function Topbar(){
 
    return( // Search and log out button
        <header className="topbar">
            <input
                placeholder="Search.."/> 
                <a href="/login"> Log out </a>
        </header>
    );
} 