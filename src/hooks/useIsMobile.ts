import { useEffect, useState } from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      /* Check user agent for mobile device keywords */
      const userAgent = navigator.userAgent;
      const mobileRegex = /android|iphone|kindle|ipad|mobile/i;
      const isMobileUserAgent = mobileRegex.test(userAgent);

      /* Also check screen width - typical mobile breakpoint is 768px */
      const isMobileWidth = window.innerWidth <= 768;

      /* Only consider it mobile if BOTH user agent matches AND screen is small */
      /* This prevents desktop browsers with touch screens from showing mobile UI */
      setIsMobile(isMobileUserAgent && isMobileWidth);
    };

    checkMobile();

    /* Re-check on resize in case of orientation change or window resize */
    /* Debounced to prevent layout flickering during continuous resize */
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedCheck = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(checkMobile, 150);
    };

    window.addEventListener('resize', debouncedCheck);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', debouncedCheck);
    };
  }, []);

  return isMobile;
}
