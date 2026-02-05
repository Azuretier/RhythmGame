import { useEffect, useState } from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    /* Storing user's device details in a variable */
    const details = navigator.userAgent;

    /* Creating a regular expression 
    containing some mobile devices keywords 
    to search it in details string */
    const regexp = /android|iphone|kindle|ipad/i;

    /* Using test() method to search regexp in details
    it returns boolean value */
    const isMobileDevice = regexp.test(details);

    setIsMobile(isMobileDevice);
  }, []);

  return isMobile;
}
