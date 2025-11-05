"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import CircularGallery from "@/components/CircularGallery";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

/**
 * Landing Page Component
 *
 * Clean, minimalist landing page with:
 * - Fixed background CircularGallery with draggable images
 * - Transparent header with logo and CTA
 * - Bottom CTA card for user sign-up
 *
 * Redirects authenticated users to /generate automatically
 */
export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Redirect signed-in users to /generate
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/generate");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-gray-900">Loading...</div>
      </div>
    );
  }

  // Don't render landing page for signed-in users (they'll be redirected)
  if (isSignedIn) {
    return null;
  }

  // Prepare gallery items from /public/images/home
  const galleryItems = [
    { image: "/images/home/IMG_9037.jpg", text: "Example 1" },
    { image: "/images/home/IMG_9038.jpg", text: "Example 2" },
    { image: "/images/home/IMG_9039.jpg", text: "Example 3" },
    { image: "/images/home/IMG_9049.jpg", text: "Example 4" },
    { image: "/images/home/IMG_9050.jpg", text: "Example 5" },
  ];

  return (
    <div className="relative h-screen w-screen bg-white overflow-hidden">
      {/* Fixed Background Gallery */}
      <div className="fixed inset-0 z-0">
        <CircularGallery
          items={galleryItems}
          heading="Transform Your Photos with AI"
          description="Create stunning AI-generated profile images with Canadian-themed presets. Drag and explore the gallery below."
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-6 py-3 rounded-full border border-gray-200 bg-white/80 backdrop-blur-md shadow-sm pointer-events-auto">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image
                src="/logo.webp"
                alt="PhotoApp Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
            </div>

            {/* Sign In Button */}
            <SignInButton mode="modal" forceRedirectUrl="/generate">
              <Button
                className="rounded-full bg-black text-white hover:bg-gray-800"
              >
                Get Started
              </Button>
            </SignInButton>
          </div>
        </div>
      </header>

      {/* Bottom CTA Section */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-6 pointer-events-none">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-200 p-8 text-center pointer-events-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Ready to Create?
            </h2>
            <p className="text-gray-600 mb-6 text-sm md:text-base">
              Start generating beautiful AI photos in seconds
            </p>
            <SignInButton mode="modal" forceRedirectUrl="/generate">
              <Button
                size="lg"
                className="text-base md:text-lg px-8 py-6 bg-black text-white hover:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Now - It's Free
              </Button>
            </SignInButton>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
