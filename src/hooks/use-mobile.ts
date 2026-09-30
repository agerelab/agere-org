import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/** true below the `md` breakpoint (768px). SSR-safe: false until mounted. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener?.("change", onChange);
    onChange();
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return !!isMobile;
}
