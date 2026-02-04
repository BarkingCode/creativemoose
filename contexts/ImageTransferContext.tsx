/**
 * Image Transfer Context
 *
 * Passes large base64 image data between generate and results screens.
 * Uses React Context instead of module-level variables (which reset during
 * Metro Fast Refresh) or URL params (which silently drop large payloads).
 *
 * The provider lives in app/(app)/_layout.tsx, wrapping both screens so
 * state survives router.replace() navigation.
 */

import React, { createContext, useContext, useState, useCallback } from "react";

interface ImageTransferContextType {
  pendingImageBase64: string | null;
  setPendingImage: (base64: string) => void;
  clearPendingImage: () => void;
}

const ImageTransferContext = createContext<ImageTransferContextType | undefined>(
  undefined
);

export function ImageTransferProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(
    null
  );

  const setPendingImage = useCallback((base64: string) => {
    setPendingImageBase64(base64);
  }, []);

  const clearPendingImage = useCallback(() => {
    setPendingImageBase64(null);
  }, []);

  return (
    <ImageTransferContext.Provider
      value={{ pendingImageBase64, setPendingImage, clearPendingImage }}
    >
      {children}
    </ImageTransferContext.Provider>
  );
}

export function useImageTransfer() {
  const context = useContext(ImageTransferContext);
  if (!context) {
    throw new Error(
      "useImageTransfer must be used within an ImageTransferProvider"
    );
  }
  return context;
}
