/**
 * RevenueCat Context
 *
 * Provides RevenueCat SDK integration for in-app purchases.
 * - Initializes SDK with platform-specific API keys
 * - Manages offerings and packages
 * - Handles purchase flow with Supabase credit sync
 * - Provides hooks for purchase state management
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  PurchasesError,
  LOG_LEVEL
} from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

// Product ID to credits mapping
const PRODUCT_CREDITS: Record<string, number> = {
  'photoapp_5_credits': 5,
  'photoapp_10_credits': 10,
  'photoapp_25_credits': 25,
};

interface RevenueCatContextType {
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  isPurchasing: boolean;
  error: string | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
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

  // Initialize RevenueCat SDK
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        // Set log level for debugging (remove in production)
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey = Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
          : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

        if (!apiKey) {
          console.warn('RevenueCat API key not configured');
          setIsLoading(false);
          return;
        }

        await Purchases.configure({ apiKey });
        setIsConfigured(true);

        // Fetch initial offerings
        await fetchOfferings();

        // Fetch customer info
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
      } catch (err) {
        console.error('Failed to initialize RevenueCat:', err);
        setError('Failed to initialize purchases');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, []);

  // Update RevenueCat user ID when auth state changes
  useEffect(() => {
    const updateRevenueCatUser = async () => {
      if (!isConfigured) return;

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
        console.error('Failed to update RevenueCat user:', err);
      }
    };

    updateRevenueCatUser();
  }, [user?.id, isConfigured]);

  // Listen for customer info updates
  useEffect(() => {
    if (!isConfigured) return;

    const updateListener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };

    Purchases.addCustomerInfoUpdateListener(updateListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(updateListener);
    };
  }, [isConfigured]);

  const fetchOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      setOfferings(offerings.current);
    } catch (err) {
      console.error('Failed to fetch offerings:', err);
      setError('Failed to load purchase options');
    }
  };

  const refreshOfferings = useCallback(async () => {
    setIsLoading(true);
    await fetchOfferings();
    setIsLoading(false);
  }, []);

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
      const { error } = await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_amount: creditsToAdd,
      });

      if (error) {
        console.error('Failed to sync credits:', error);
        return false;
      }

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

    setIsPurchasing(true);
    setError(null);

    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);

      // Extract product ID from the package
      const productId = pkg.product.identifier;

      // Sync credits to Supabase
      const synced = await syncCreditsToSupabase(productId);

      if (!synced) {
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
  }, [user]);

  const restorePurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      Alert.alert('Success', 'Purchases restored successfully.');
    } catch (err) {
      const purchaseError = err as PurchasesError;
      console.error('Failed to restore purchases:', purchaseError);
      setError(purchaseError.message || 'Failed to restore purchases');
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: RevenueCatContextType = {
    offerings,
    customerInfo,
    isLoading,
    isPurchasing,
    error,
    purchasePackage,
    restorePurchases,
    refreshOfferings,
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
