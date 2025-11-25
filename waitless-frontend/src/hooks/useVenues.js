import { useState, useEffect } from 'react';
import { venuesService } from '../services/venues';
import { useGeolocation } from './useGeolocation';

export const useVenues = (radius = 5000, tags = null) => {
  const { location } = useGeolocation();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!location) return;

    const fetchVenues = async () => {
      setLoading(true);
      try {
        const fetchedVenues = await venuesService.getNearbyVenues(
          location.latitude,
          location.longitude,
          radius,
          tags
        );
        setVenues(fetchedVenues);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [location, radius, tags]);

  const refetch = async () => {
    if (!location) return;

    setLoading(true);
    try {
      const fetchedVenues = await venuesService.getNearbyVenues(
        location.latitude,
        location.longitude,
        radius,
        tags
      );
      setVenues(fetchedVenues);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { venues, loading, error, refetch };
};
