import Navbar from "../components/Navbar.tsx";
 
interface Props{
    children: React.ReactNode;
}
 
export default function AppLayout({children}:Props){
 
    return(
 
        <div className="layout d-flex min-vh-100">
            <Navbar/>
            <div className="content d-flex flex-column flex-grow-1 min-w-0">
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
