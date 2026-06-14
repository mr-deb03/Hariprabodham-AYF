import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/*
 * On route change: scroll to the hash target if present (cross-page #anchor
 * links like "/#events"), otherwise jump to the top of the new page.
 */
export default function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
