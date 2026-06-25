import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";

// Code-split the secondary pages so the landing page ships less JS upfront.
const About = lazy(() => import("./pages/About"));
const Parampara = lazy(() => import("./pages/Parampara"));
const EventsPage = lazy(() => import("./pages/Events"));
const Media = lazy(() => import("./pages/Media"));
const Smruti = lazy(() => import("./pages/Smruti"));
const Contact = lazy(() => import("./pages/Contact"));

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/parampara" element={<Parampara />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/media" element={<Media />} />
        <Route path="/smruti" element={<Smruti />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  );
}

export default App;
