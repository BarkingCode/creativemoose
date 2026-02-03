/**
 * useCredits Hook
 *
 * Manages credit fetching and state for authenticated users.
 * Fetches image credits, free credits, and total generations from the API.
 */

import { useState, useEffect } from "react";

export function useCredits(isSignedIn: boolean) {
  const [credits, setCredits] = useState<number | null>(null);
  const [freeCredits, setFreeCredits] = useState<number>(0);
  const [videoCredits, setVideoCredits] = useState<number | null>(null);
  const [videoFreeCredits, setVideoFreeCredits] = useState<number>(0);
  const [totalGens, setTotalGens] = useState<number>(0);
  const [totalVideoGens, setTotalVideoGens] = useState<number>(0);

  const fetchCredits = async () => {
    if (isSignedIn) {
      try {
        const res = await fetch("/api/credits");
        const data = await res.json();
        setCredits(data.image_credits);
        setFreeCredits(data.free_credits);
        setVideoCredits(data.video_credits);
        setVideoFreeCredits(data.video_free_credits);
        setTotalGens(data.total_gens);
        setTotalVideoGens(data.total_video_gens);
      } catch (err) {
        console.error("Failed to fetch credits:", err);
      }
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [isSignedIn]);

  return {
    credits,
    freeCredits,
    videoCredits,
    videoFreeCredits,
    totalGens,
    totalVideoGens,
    fetchCredits,
  };
}
