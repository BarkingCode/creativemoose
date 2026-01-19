/**
 * Sign Up Page
 *
 * Public page for user registration.
 */

import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
