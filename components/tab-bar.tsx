/**
 * TabBar Component
 *
 * Bottom navigation bar for signed-in users.
 * Three tabs: Home (feed), Create (+), Gallery.
 *
 * Features:
 * - Fixed bottom position with safe area padding
 * - Active tab indicator with animation
 * - Center Create button with prominent styling
 * - Glass morphism background
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Plus, Image as ImageIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  name: string;
  href: string;
  icon: React.ComponentType<LucideProps>;
  isCenter?: boolean;
}

const tabs: TabItem[] = [
  {
    name: "Home",
    href: "/home",
    icon: Home,
  },
  {
    name: "Create",
    href: "/generate",
    icon: Plus,
    isCenter: true,
  },
  {
    name: "Gallery",
    href: "/gallery",
    icon: ImageIcon,
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
      <div className="max-w-lg mx-auto">
        <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl mb-4 px-2 py-2 flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href === "/home" && pathname === "/") ||
              (tab.href !== "/" && pathname.startsWith(tab.href));

            if (tab.isCenter) {
              // Center Create button - special styling
              return (
                <Link key={tab.name} href={tab.href} className="relative">
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center",
                      "bg-white text-black shadow-lg shadow-white/20",
                      "transition-all duration-200"
                    )}
                  >
                    <tab.icon className="w-7 h-7" strokeWidth={2.5} />
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link key={tab.name} href={tab.href} className="relative flex-1">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-4 rounded-xl",
                    "transition-all duration-200",
                    isActive ? "text-white" : "text-white/50 hover:text-white/70"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 bg-white/10 rounded-xl"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}

                  <tab.icon
                    className={cn(
                      "w-6 h-6 relative z-10",
                      isActive && "text-white"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs mt-1 font-medium relative z-10",
                      isActive ? "text-white" : "text-white/50"
                    )}
                  >
                    {tab.name}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/**
 * Compact TabBar variant (icon only)
 */
export function TabBarCompact() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
      <div className="max-w-sm mx-auto">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full mb-4 px-4 py-3 flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href === "/home" && pathname === "/") ||
              (tab.href !== "/" && pathname.startsWith(tab.href));

            if (tab.isCenter) {
              return (
                <Link key={tab.name} href={tab.href}>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
                  >
                    <tab.icon className="w-6 h-6" strokeWidth={2.5} />
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link key={tab.name} href={tab.href}>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    "transition-colors duration-200",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/70"
                  )}
                >
                  <tab.icon className="w-6 h-6" />
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
