import { useState, useEffect } from 'react';
import { venuesService } from '../services/venues';
import { useGeolocation } from './useGeolocation';

export const useVenues = (radius = 5000, tags = null) => {
  const { location } = useGeolocation();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!location) {
      // If no location, try to fetch all venues with a default location
      const fetchVenues = async () => {
        setLoading(true);
        try {
          // Use a default location (0, 0) with a very large radius to get all venues
          const fetchedVenues = await venuesService.getNearbyVenues(
            0,
            0,
            20000000, // Very large radius (20,000 km) to get all venues
            tags
          );
          setVenues(fetchedVenues || []);
          setError(null);
        } catch (err) {
          // If that fails, just set empty array
          setVenues([]);
          setError(null);
        } finally {
          setLoading(false);
        }
      };
      fetchVenues();
      return;
    }

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
    setLoading(true);
    try {
      let fetchedVenues;
      if (location) {
        fetchedVenues = await venuesService.getNearbyVenues(
          location.latitude,
          location.longitude,
          radius,
          tags
        );
      } else {
        // If no location, use default location with large radius
        fetchedVenues = await venuesService.getNearbyVenues(
          0,
          0,
          20000000,
          tags
        );
      }
      
      setVenues(fetchedVenues || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addVenue = (newVenue) => {
    // Add venue to the list if it doesn't already exist
    setVenues(prevVenues => {
      const exists = prevVenues.some(v => v._id === newVenue._id);
      if (exists) {
        // Update existing venue
        return prevVenues.map(v => v._id === newVenue._id ? newVenue : v);
      }
      // Add new venue at the beginning of the list
      // Ensure it has metrics (empty object if not provided)
      const venueWithMetrics = {
        ...newVenue,
        metrics: newVenue.metrics || {}
      };
      return [venueWithMetrics, ...prevVenues];
    });
  };

  return { venues, loading, error, refetch, addVenue };
};
