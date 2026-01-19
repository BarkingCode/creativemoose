/**
 * Tabs Layout
 *
 * Layout wrapper for authenticated tab-based navigation.
 * Includes bottom TabBar and handles common authenticated UI.
 *
 * This layout is used for:
 * - /home (public feed)
 * - /generate (camera/create)
 * - /gallery (user's images)
 */

import { TabBar } from "@/components/tab-bar";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col bg-[#0f0a0a]">
      {/* Main content area - leaves room for tab bar */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom Tab Navigation */}
      <TabBar />
    </div>
  );
}
