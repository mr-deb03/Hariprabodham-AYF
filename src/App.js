import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Parampara from "./pages/Parampara";
import EventsPage from "./pages/Events";
import Smruti from "./pages/Smruti";
import Contact from "./pages/Contact";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/parampara" element={<Parampara />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/smruti" element={<Smruti />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  );
}

export default App;
