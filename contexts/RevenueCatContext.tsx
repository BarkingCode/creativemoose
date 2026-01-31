/**
 * RevenueCat Context
 *
 * Provides RevenueCat SDK integration for in-app purchases.
 * - Initializes SDK with platform-specific API keys
 * - Manages offerings and packages
 * - Handles purchase flow with Supabase credit sync
 * - Provides hooks for purchase state management
 *
 * iOS 26 Beta Compatibility:
 * - RevenueCat SDK may crash on iOS 26 beta due to URLSession bug
 * - See: https://community.revenuecat.com/sdks-51/exc-breakpoint-crash-xcode-26-ios-26-at-purchases-configure-6506
 * - This context handles SDK initialization failure gracefully
 * - Use `isAvailable` to check if purchases are available before showing purchase UI
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  PurchasesError,
  LOG_LEVEL
} from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { supabase, Credits } from '../lib/supabase';

// Track if RevenueCat SDK is available (may fail on iOS 26 beta)
let revenueCatAvailable = true;

// Product ID to credits mapping
const PRODUCT_CREDITS: Record<string, number> = {
  'five_token_ios': 5,
  'ten_token_ios': 10,
  'twentyfive_token_ios': 25,
};

interface RevenueCatContextType {
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  isPurchasing: boolean;
  error: string | null;
  credits: Credits | null;
  isLoadingCredits: boolean;
  isAvailable: boolean; // Whether RevenueCat SDK is available (may be false on iOS 26 beta)
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

interface RevenueCatProviderProps {
  children: ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  const { user, session } = useAuth();
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [sdkAvailable, setSdkAvailable] = useState(true); // Tracks if SDK initialized successfully

  // Track initialization attempts to prevent infinite retries
  const initAttempted = useRef(false);

  // Initialize RevenueCat SDK with defensive error handling for iOS 26 beta compatibility
  useEffect(() => {
    // Prevent multiple initialization attempts
    if (initAttempted.current) return;
    initAttempted.current = true;

    const initializeRevenueCat = async () => {
      const apiKey = Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

      if (!apiKey) {
        console.warn('[RevenueCat] API key not configured');
        setIsLoading(false);
        return;
      }

      try {
        // Set log level for debugging (remove in production)
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        // Configure SDK - this can crash on iOS 26 beta due to URLSession bug
        // See: https://community.revenuecat.com/sdks-51/exc-breakpoint-crash-xcode-26-ios-26-at-purchases-configure-6506
        console.log('[RevenueCat] Configuring SDK...');
        await Purchases.configure({ apiKey });
        console.log('[RevenueCat] SDK configured successfully');

        setIsConfigured(true);
        revenueCatAvailable = true;
        setSdkAvailable(true);

        // Fetch initial offerings (also wrapped for safety)
        try {
          await fetchOfferings();
        } catch (offeringsErr) {
          console.warn('[RevenueCat] Failed to fetch offerings:', offeringsErr);
          // Non-fatal - continue without offerings
        }

        // Fetch customer info
        try {
          const info = await Purchases.getCustomerInfo();
          setCustomerInfo(info);
        } catch (infoErr) {
          console.warn('[RevenueCat] Failed to get customer info:', infoErr);
          // Non-fatal - continue without customer info
        }
      } catch (err: any) {
        // Graceful degradation - app still works without purchases
        console.error('[RevenueCat] Failed to initialize SDK:', err);
        console.warn('[RevenueCat] Purchases will be unavailable. This may be due to iOS 26 beta incompatibility.');
        revenueCatAvailable = false;
        setSdkAvailable(false);
        setError('Purchases temporarily unavailable');
        // Don't crash the app - just disable purchase functionality
      } finally {
        setIsLoading(false);
      }
    };

    // Delay initialization slightly to allow React Native bridge to fully initialize
    // This can help avoid race conditions on app startup
    const timer = setTimeout(initializeRevenueCat, 100);
    return () => clearTimeout(timer);
  }, []);

  // Update RevenueCat user ID when auth state changes
  useEffect(() => {
    const updateRevenueCatUser = async () => {
      // Skip if SDK not available or not configured
      if (!revenueCatAvailable || !isConfigured) return;

      try {
        if (user?.id) {
          // Login to RevenueCat with Supabase user ID
          const { customerInfo: info } = await Purchases.logIn(user.id);
          setCustomerInfo(info);
        } else {
          // Only logout if currently logged in (not anonymous)
          const currentInfo = await Purchases.getCustomerInfo();
          const isAnonymous = currentInfo.originalAppUserId.startsWith('$RCAnonymousID:');
          if (!isAnonymous) {
            const info = await Purchases.logOut();
            setCustomerInfo(info);
          }
        }
      } catch (err) {
        console.warn('[RevenueCat] Failed to update user:', err);
        // Non-fatal - don't crash if this fails
      }
    };

    updateRevenueCatUser();
  }, [user?.id, isConfigured]);

  // Listen for customer info updates
  useEffect(() => {
    // Skip if SDK not available or not configured
    if (!revenueCatAvailable || !isConfigured) return;

    const updateListener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };

    try {
      Purchases.addCustomerInfoUpdateListener(updateListener);
    } catch (err) {
      console.warn('[RevenueCat] Failed to add listener:', err);
      return;
    }

    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(updateListener);
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, [isConfigured]);

  const fetchOfferings = async () => {
    // Skip if SDK not available
    if (!revenueCatAvailable) return;

    try {
      const allOfferings = await Purchases.getOfferings();

      // Debug logging for TestFlight troubleshooting
      console.log('[RevenueCat] All offerings:', JSON.stringify({
        current: allOfferings.current?.identifier,
        all: Object.keys(allOfferings.all || {}),
      }));
      console.log('[RevenueCat] Current offering identifier:', allOfferings.current?.identifier);
      console.log('[RevenueCat] Available packages count:', allOfferings.current?.availablePackages?.length || 0);

      if (allOfferings.current?.availablePackages?.length) {
        allOfferings.current.availablePackages.forEach((pkg, i) => {
          console.log(`[RevenueCat] Package ${i}:`, {
            identifier: pkg.identifier,
            productId: pkg.product.identifier,
            price: pkg.product.priceString,
          });
        });
      } else {
        console.warn('[RevenueCat] No packages available in current offering');
      }

      setOfferings(allOfferings.current);
    } catch (err) {
      console.warn('[RevenueCat] Failed to fetch offerings:', err);
      // Non-fatal - continue without offerings
    }
  };

  const refreshOfferings = useCallback(async () => {
    // Skip if SDK not available
    if (!revenueCatAvailable || !isConfigured) return;

    setIsLoading(true);
    await fetchOfferings();
    setIsLoading(false);
  }, [isConfigured]);

  // Fetch credits from Supabase
  const refreshCredits = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingCredits(true);
    try {
      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error('[refreshCredits] Error fetching credits:', error);
        // If no row exists, user may need their credits row created
        if (error.code === 'PGRST116') {
          console.warn('[refreshCredits] No credits row found for user - may need to run migration or create row');
        }
        return;
      }

      if (data) {
        console.log('[refreshCredits] Credits loaded:', {
          free: data.free_credits,
          paid: data.image_credits,
          total: data.free_credits + data.image_credits,
        });
        setCredits(data);
      }
    } catch (err) {
      console.error('[refreshCredits] Failed to fetch credits:', err);
    } finally {
      setIsLoadingCredits(false);
    }
  }, [user?.id]);

  // Fetch credits when user changes
  useEffect(() => {
    if (user?.id) {
      refreshCredits();
    } else {
      setCredits(null);
    }
  }, [user?.id, refreshCredits]);

  // Sync purchased credits to Supabase
  const syncCreditsToSupabase = async (productId: string): Promise<boolean> => {
    if (!user?.id || !session?.access_token) {
      console.error('No user session for credit sync');
      return false;
    }

    const creditsToAdd = PRODUCT_CREDITS[productId];
    if (!creditsToAdd) {
      console.error('Unknown product ID:', productId);
      return false;
    }

    try {
      // Call Supabase function to add credits
      const { data, error } = await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_credits: creditsToAdd,
      });

      if (error) {
        console.error('Failed to sync credits:', error);
        return false;
      }

      // Check if the RPC returned success (data should be true)
      if (data === false) {
        console.error('add_credits RPC returned false - user may not have credits row');
        return false;
      }

      console.log('Credits synced successfully:', { userId: user.id, creditsAdded: creditsToAdd });
      return true;
    } catch (err) {
      console.error('Error syncing credits to Supabase:', err);
      return false;
    }
  };

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to make a purchase.');
      return false;
    }

    // Check if RevenueCat SDK is available (may be unavailable on iOS 26 beta)
    if (!revenueCatAvailable || !isConfigured) {
      Alert.alert(
        'Purchases Unavailable',
        'In-app purchases are temporarily unavailable. This may be due to a beta iOS version. Please try again later or contact support.',
        [{ text: 'OK' }]
      );
      return false;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);

      // Extract product ID from the package
      const productId = pkg.product.identifier;

      // Sync credits to Supabase
      const synced = await syncCreditsToSupabase(productId);

      if (synced) {
        // Refresh credits to update UI
        await refreshCredits();
      } else {
        // Purchase succeeded but credit sync failed
        // The webhook should handle this as a backup
        Alert.alert(
          'Purchase Successful',
          'Your credits are being processed. They should appear shortly.'
        );
      }

      return true;
    } catch (err) {
      const purchaseError = err as PurchasesError;

      // User cancelled - not an error
      if (purchaseError.userCancelled) {
        return false;
      }

      console.error('Purchase failed:', purchaseError);
      setError(purchaseError.message || 'Purchase failed');
      Alert.alert('Purchase Failed', purchaseError.message || 'Please try again.');
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [user, isConfigured, refreshCredits]);

  const restorePurchases = useCallback(async () => {
    // Check if RevenueCat SDK is available
    if (!revenueCatAvailable || !isConfigured) {
      Alert.alert(
        'Purchases Unavailable',
        'In-app purchases are temporarily unavailable. Please try again later.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      Alert.alert('Success', 'Purchases restored successfully.');
    } catch (err) {
      const purchaseError = err as PurchasesError;
      console.error('[RevenueCat] Failed to restore purchases:', purchaseError);
      setError(purchaseError.message || 'Failed to restore purchases');
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  const value: RevenueCatContextType = {
    offerings,
    customerInfo,
    isLoading,
    isPurchasing,
    error,
    credits,
    isLoadingCredits,
    isAvailable: sdkAvailable && isConfigured,
    purchasePackage,
    restorePurchases,
    refreshOfferings,
    refreshCredits,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  return context;
}
