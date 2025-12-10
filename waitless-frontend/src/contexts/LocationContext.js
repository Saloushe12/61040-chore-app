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

    // First try with high accuracy, then fallback to lower accuracy if it times out
    let watchId;

    const options = {
      enableHighAccuracy: true,
      timeout: 20000, // Increased to 20 seconds for production
      maximumAge: 60000 // Allow cached position up to 1 minute
    };

    const successCallback = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      setError(null);
      setLoading(false);
    };

    const errorCallback = (err) => {
      // If high accuracy times out, try with lower accuracy
      if (err.code === err.TIMEOUT && options.enableHighAccuracy) {
        console.log('High accuracy timeout, trying with lower accuracy...');
        navigator.geolocation.clearWatch(watchId);
        
        // Fallback to lower accuracy
        const fallbackOptions = {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000 // Allow cached position up to 5 minutes
        };
        
        watchId = navigator.geolocation.watchPosition(
          successCallback,
          (fallbackErr) => {
            // Provide more user-friendly error messages
            let errorMessage = 'Location access timed out. ';
            if (fallbackErr.code === fallbackErr.TIMEOUT) {
              errorMessage += 'Please check your location settings and try refreshing the page.';
            } else if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
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
        let errorMessage = 'Location error: ';
        if (err.code === err.TIMEOUT) {
          errorMessage += 'Timeout expired. Please enable location access and try refreshing the page.';
        } else if (err.code === err.PERMISSION_DENIED) {
          errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMessage = 'Location unavailable. Please check your device location settings.';
        } else {
          errorMessage += err.message || 'Unable to get your location.';
        }
        setError(errorMessage);
        setLoading(false);
      }
    };

    watchId = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      options
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <LocationContext.Provider value={{ location, error, loading }}>
      {children}
    </LocationContext.Provider>
  );
};
