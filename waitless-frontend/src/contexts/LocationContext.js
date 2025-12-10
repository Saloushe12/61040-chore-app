import React, { createContext, useState, useEffect } from 'react';

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    let watchId;
    let fallbackAttempted = false;

    // On production/HTTPS, start with lower accuracy for faster response
    // On localhost, try high accuracy first
    const isProduction = window.location.protocol === 'https:' || 
                         !window.location.hostname.includes('localhost');
    
    const initialOptions = {
      enableHighAccuracy: !isProduction, // Start with lower accuracy on production
      timeout: isProduction ? 30000 : 20000, // 30s on production, 20s on local
      maximumAge: isProduction ? 300000 : 60000 // 5 min cache on production, 1 min on local
    };

    const successCallback = (position) => {
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      
      // Only update if location changed significantly (more than ~10 meters)
      setLocation(prev => {
        if (!prev) return newLocation;
        const latDiff = Math.abs(prev.latitude - newLocation.latitude);
        const lonDiff = Math.abs(prev.longitude - newLocation.longitude);
        // ~10 meters threshold (roughly 0.0001 degrees)
        if (latDiff > 0.0001 || lonDiff > 0.0001) {
          return newLocation;
        }
        return prev; // Return previous to avoid unnecessary re-renders
      });
      setError(null);
      setLoading(false);
    };

    const errorCallback = (err) => {
      // Ignore network location provider errors (403 from Google's location service)
      // These are just warnings from browser fallback mechanisms and don't affect functionality
      if (err.message && err.message.includes('googleapis.com')) {
        console.log('Ignoring network location provider error (browser fallback mechanism)');
        // Don't set error, let it continue trying
        return;
      }

      // If we haven't tried fallback yet and we're using high accuracy, try lower accuracy
      if (!fallbackAttempted && initialOptions.enableHighAccuracy && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
        console.log('High accuracy failed, trying with lower accuracy...');
        fallbackAttempted = true;
        navigator.geolocation.clearWatch(watchId);
        
        // Fallback to lower accuracy with longer timeout
        const fallbackOptions = {
          enableHighAccuracy: false,
          timeout: 30000, // 30 seconds for fallback
          maximumAge: 600000 // Allow cached position up to 10 minutes
        };
        
        watchId = navigator.geolocation.watchPosition(
          successCallback,
          (fallbackErr) => {
            // Ignore network location provider errors in fallback too
            if (fallbackErr.message && fallbackErr.message.includes('googleapis.com')) {
              console.log('Ignoring network location provider error in fallback');
              return;
            }

            // Provide more user-friendly error messages
            let errorMessage = '';
            if (fallbackErr.code === fallbackErr.TIMEOUT) {
              errorMessage = 'Location access is taking longer than expected. Please ensure location services are enabled and try refreshing the page.';
            } else if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            } else if (fallbackErr.code === fallbackErr.POSITION_UNAVAILABLE) {
              errorMessage = 'Location unavailable. Please check your device location settings.';
            } else {
              errorMessage = fallbackErr.message || 'Unable to get your location.';
            }
            setError(errorMessage);
            setLoading(false);
          },
          fallbackOptions
        );
      } else {
        // Provide more user-friendly error messages
        let errorMessage = '';
        if (err.code === err.TIMEOUT) {
          errorMessage = 'Location access is taking longer than expected. Please ensure location services are enabled and try refreshing the page.';
        } else if (err.code === err.PERMISSION_DENIED) {
          errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMessage = 'Location unavailable. Please check your device location settings.';
        } else {
          errorMessage = err.message || 'Unable to get your location.';
        }
        setError(errorMessage);
        setLoading(false);
      }
    };

    watchId = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      initialOptions
    );

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return (
    <LocationContext.Provider value={{ location, error, loading }}>
      {children}
    </LocationContext.Provider>
  );
};
