/**
 * Sign In Page
 *
 * Public page for user sign-in.
 */

import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
