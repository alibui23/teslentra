import Navbar from "./navbar.tsx";
import Topbar from "./topbar.tsx";
import "./layout.css";
 
interface Props{
    children: React.ReactNode;
}
 
export default function Layout({children}:Props){
 
    return(
 
        <div className="layout">
            <Navbar/>
            <div className="content">
                <Topbar/>
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
