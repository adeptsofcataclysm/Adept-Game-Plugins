import { useEffect, useState } from "react";

/** Match Node-Script wheel page: hide side mallet, use tap button instead. */
export function useIsMobile(breakpoint = 600): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}
