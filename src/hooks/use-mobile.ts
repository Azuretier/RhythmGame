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
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
