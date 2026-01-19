"use client";

/**
 * User Button
 *
 * Displays user avatar and dropdown menu.
 * - Shows user avatar or initials
 * - Dropdown with profile info and sign out
 * - Falls back to sign-in button if not authenticated
 */

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function UserButton() {
  const { user, isLoading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-card animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link href="/sign-in">
        <Button variant="outline" size="sm">
          Sign in
        </Button>
      </Link>
    );
  }

  const email = user.email || "";
  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden hover:border-white/50 transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="User avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white text-sm font-medium">{initials}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          <div className="p-4 border-b border-border">
            <p className="text-white font-medium truncate">{email}</p>
            <p className="text-muted-foreground text-sm">
              Signed in
            </p>
          </div>

          <div className="p-2">
            <button
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full px-4 py-2 text-left text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sign In Button
 *
 * Simple button that links to sign-in page.
 * Used as replacement for Clerk's SignInButton.
 */
export function SignInButton({ children }: { children?: React.ReactNode }) {
  return (
    <Link href="/sign-in">
      {children || (
        <Button variant="outline" size="sm">
          Sign in
        </Button>
      )}
    </Link>
  );
}
