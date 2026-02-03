/**
 * Logo Component
 *
 * Displays the app logo image from the public folder.
 * Can be used throughout the app with customizable size.
 */

import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 72, className = "" }: LogoProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/logo.webp"
        alt="PhotoApp Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
