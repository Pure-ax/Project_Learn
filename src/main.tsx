import { createRoot } from 'react-dom/client'
import { RouterProvider} from "react-router-dom";
import router from "@pc/router";
import './index.css'
// import App from './App'

createRoot(document.getElementById('root')!).render(
    <RouterProvider router={router}></RouterProvider>
)