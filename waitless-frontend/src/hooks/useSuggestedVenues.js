import { useState, useEffect } from 'react';
import { venuesService } from '../services/venues';
import { useGeolocation } from './useGeolocation';

export const useSuggestedVenues = (radius = 10000) => {
  const { location } = useGeolocation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!location) {
      setSuggestions([]);
      setError(null);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
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
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [location, radius]);

  const refetch = async () => {
    if (!location) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return { suggestions, loading, error, refetch };
};

