import {Outlet,useNavigate} from "react-router-dom";
// import Login from "@pc/pages/Login";
import {useUserStore} from "@pc/store/useUserStore.ts";
import {useEffect} from "react";

function App() {
    const { isAuthenticated, error } = useUserStore()
    const navigate = useNavigate()

    useEffect(() => {
        if (!isAuthenticated && error) {
            navigate('/login')
            useUserStore.setState({ error: null })
        }
    }, [isAuthenticated, error, navigate])
    return (
        <div className="min-h-screen">
            <Outlet />
        </div>
    )
}

export default App
