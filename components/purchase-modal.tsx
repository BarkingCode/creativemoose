/**
 * PurchaseModal Component
 *
 * Displays pricing options modal for purchasing generation credits.
 * Shows 3 pricing tiers with radio button selection and Stripe checkout integration.
 */

"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { PRICING_OPTIONS } from "@/lib/pricing";

interface PurchaseModalProps {
  onClose: () => void;
  onPurchaseComplete: () => void;
  defaultCreditType?: 'image' | 'video';
}

export function PurchaseModal({ onClose, onPurchaseComplete, defaultCreditType = 'image' }: PurchaseModalProps) {
  const imageOptions = PRICING_OPTIONS.filter(opt => opt.creditType === 'image');
  const [selectedOption, setSelectedOption] = useState(
    imageOptions[0]?.id || PRICING_OPTIONS[0].id
  );
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    const option = PRICING_OPTIONS.find((o) => o.id === selectedOption);
    if (!option?.priceId) return;

    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: option.priceId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await res.json();

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Failed to start checkout");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-10">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-6">
        {/* Logo */}
        <div className="mx-auto">
          <Logo size={72} />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-black">
            Generate as many images as you like
          </h2>
          <p className="text-sm text-gray-600">
            Each generation gives you 4 image alternatives
          </p>
        </div>

        {/* Pricing Options */}
        <div className="flex flex-col gap-2">
          {imageOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`border rounded-2xl p-4 flex items-center gap-4 transition-colors ${selectedOption === option.id
                ? "bg-red-50 border-red-200"
                : "bg-white border-gray-300 hover:border-gray-400"
                }`}
            >
              {/* Radio Button */}
              <div className="w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center shrink-0">
                {selectedOption === option.id && (
                  <div className="w-4 h-4 rounded-full bg-red-900" />
                )}
              </div>

              {/* Label */}
              <span className="flex-1 text-sm text-black text-left">
                {option.label}
              </span>

              {/* Price */}
              <span className="text-xl font-semibold text-black">
                {option.price}
              </span>
            </button>
          ))}
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="bg-black text-white py-4 px-6 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
        >
          {loading ? "Processing..." : "Purchase"}
        </button>
      </div>
    </div>
  );
}
