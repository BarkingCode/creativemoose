/**
 * Centralized pricing configuration.
 * Update prices here and they will reflect across the entire app.
 */

export interface PricingOption {
  id: string;
  label: string;
  price: string;
  priceId: string | undefined;
  credits: number;
  creditType: 'image' | 'video';
}

export const PRICING_OPTIONS: PricingOption[] = [
  // Image Credits
  {
    id: "image_sm",
    label: "5 Generation",
    price: "$2.99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_SM,
    credits: 5,
    creditType: 'image',
  },
  {
    id: "image_md",
    label: "10 Generation",
    price: "$4.99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_MD,
    credits: 10,
    creditType: 'image',
  },
  {
    id: "image_lg",
    label: "25 Generation",
    price: "$9.99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_LG,
    credits: 25,
    creditType: 'image',
  },
  // Video Credits
  {
    id: "video_sm",
    label: "4 Video Generation",
    price: "$4.99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_VIDEO_SM,
    credits: 4,
    creditType: 'video',
  },
  {
    id: "video_md",
    label: "7 Video Generation",
    price: "$7.99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_VIDEO_MD,
    credits: 7,
    creditType: 'video',
  },
  {
    id: "video_lg",
    label: "14 Video Generation",
    price: "$14.99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_VIDEO_LG,
    credits: 14,
    creditType: 'video',
  },
];

/**
 * Get pricing option by ID
 */
export function getPricingOption(id: string): PricingOption | undefined {
  return PRICING_OPTIONS.find((option) => option.id === id);
}

/**
 * Get pricing option by price ID
 */
export function getPricingByPriceId(priceId: string): PricingOption | undefined {
  return PRICING_OPTIONS.find((option) => option.priceId === priceId);
}
