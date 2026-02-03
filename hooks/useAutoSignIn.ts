/**
 * useAutoSignIn Hook
 *
 * Automatically opens the sign-in dialog when unauthenticated users land on the page.
 * Only triggers when Clerk has finished loading and the component is mounted.
 */

import { useEffect } from "react";

export function useAutoSignIn(
  isLoaded: boolean,
  isSignedIn: boolean,
  isMounted: boolean
) {
  useEffect(() => {
    if (isLoaded && !isSignedIn && isMounted) {
      const signInButton = document.querySelector(
        "[data-clerk-sign-in]"
      ) as HTMLButtonElement;
      if (signInButton) {
        signInButton.click();
      }
    }
  }, [isLoaded, isSignedIn, isMounted]);
}
