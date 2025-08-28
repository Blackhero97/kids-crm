// App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import ChildPage from "./components/ChildPage";
import ChildForm from "./components/ChildForm"; // ✅ Import qildik
import "./App.css";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/child/:qr_code" element={<ChildPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
