import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Custom hook for browser fingerprinting via FingerprintJS.
 * Returns { fingerprint, loading, error }
 */
export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function getFingerprint() {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (!cancelled) {
          setFingerprint(result.visitorId);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Fingerprint error:', err);
          setError('Failed to generate device fingerprint');
          setLoading(false);
        }
      }
    }

    getFingerprint();

    return () => {
      cancelled = true;
    };
  }, []);

  return { fingerprint, loading, error };
}
