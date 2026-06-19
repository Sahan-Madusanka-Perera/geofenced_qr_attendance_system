import { useState, useCallback } from 'react';

/**
 * Custom hook wrapping navigator.geolocation.
 * Returns { latitude, longitude, accuracy, error, loading, getPosition }
 */
export function useGeolocation() {
  const [position, setPosition] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser';
        setError(err);
        reject(new Error(err));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const data = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setPosition(data);
          setLoading(false);
          resolve(data);
        },
        (err) => {
          let message = 'Failed to get location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable GPS and allow location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              message = 'Location unavailable. Please ensure GPS is turned on.';
              break;
            case err.TIMEOUT:
              message = 'Location request timed out. Please try again.';
              break;
          }
          setError(message);
          setLoading(false);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    ...position,
    error,
    loading,
    getPosition,
  };
}
