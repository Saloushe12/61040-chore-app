import { useState, useEffect, useRef } from 'react';
import { venuesService } from '../services/venues';
import { useGeolocation } from './useGeolocation';

export const useSuggestedVenues = (radius = 10000) => {
  const { location } = useGeolocation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);
  const lastLocationRef = useRef(null);

  useEffect(() => {
    if (!location) {
      setSuggestions([]);
      setError(null);
      hasLoadedRef.current = false;
      lastLocationRef.current = null;
      return;
    }

    // Check if location actually changed (not just a refetch)
    const locationKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const isNewLocation = lastLocationRef.current !== locationKey;
    lastLocationRef.current = locationKey;

    const fetchSuggestions = async () => {
      // Only show loading if we haven't loaded yet OR location changed significantly
      const shouldShowLoading = !hasLoadedRef.current || isNewLocation;
      if (shouldShowLoading) {
        setLoading(true);
      }
      try {
        const fetchedSuggestions = await venuesService.getSuggestedVenues(
          location.latitude,
          location.longitude,
          radius
        );
        setSuggestions(fetchedSuggestions || []);
        setError(null);
        hasLoadedRef.current = true;
      } catch (err) {
        setError(err.message);
        // Only clear suggestions if this is the first load
        if (!hasLoadedRef.current) {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [location, radius]);

  const refetch = async () => {
    if (!location) {
      return;
    }

    // Don't set loading on refetch - keep existing suggestions visible
    try {
      const fetchedSuggestions = await venuesService.getSuggestedVenues(
        location.latitude,
        location.longitude,
        radius
      );
      setSuggestions(fetchedSuggestions || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      // Don't clear suggestions on refetch error
    }
  };

  return { suggestions, loading, error, refetch };
};

