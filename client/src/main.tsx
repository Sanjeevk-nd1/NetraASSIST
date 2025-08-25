import { ToastContainer } from "react-toastify";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
<ToastContainer position="top-right" autoClose={3000} />
