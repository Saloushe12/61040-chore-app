import React, { useEffect, useRef, useState } from 'react';
import { calculateDistance, formatDistance } from '../../utils/distance';
import './VenueDetailGoogleMap.css';

const VenueDetailGoogleMap = ({ venue, userLocation }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [venueMarker, setVenueMarker] = useState(null);
  const [userMarker, setUserMarker] = useState(null);
  const [distance, setDistance] = useState(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Check if Google Maps is loaded
  const checkGoogleMapsReady = () => {
    return window.google && 
           window.google.maps && 
           window.google.maps.Map &&
           typeof window.google.maps.Map === 'function';
  };

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setMapError('Google Maps API key not configured');
      return;
    }

    // Check if already loaded
    if (checkGoogleMapsReady()) {
      setMapsLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (checkGoogleMapsReady()) {
          clearInterval(checkInterval);
          setMapsLoaded(true);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Load script
    const callbackName = 'initVenueDetailMap_' + Date.now();
    window[callbackName] = () => {
      const checkInterval = setInterval(() => {
        if (checkGoogleMapsReady()) {
          clearInterval(checkInterval);
          setMapsLoaded(true);
          delete window[callbackName];
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!checkGoogleMapsReady()) {
          setMapError('Google Maps failed to load');
        }
        delete window[callbackName];
      }, 10000);
    };
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      setMapError('Failed to load Google Maps');
      delete window[callbackName];
    };
    
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map || !mapsLoaded || !venue?.location?.lat || !venue?.location?.lon) return;
    
    if (!checkGoogleMapsReady()) return;

    const venueLat = venue.location.lat;
    const venueLng = venue.location.lon;

    // Calculate center (venue or midpoint between venue and user)
    let center = { lat: venueLat, lng: venueLng };
    let zoom = 15;

    if (userLocation) {
      // Center between venue and user
      center = {
        lat: (venueLat + userLocation.latitude) / 2,
        lng: (venueLng + userLocation.longitude) / 2
      };
      
      // Calculate distance
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        venueLat,
        venueLng
      );
      setDistance(dist);

      // Adjust zoom based on distance
      if (dist < 500) zoom = 16;
      else if (dist < 2000) zoom = 15;
      else if (dist < 5000) zoom = 14;
      else zoom = 13;
    }

    try {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry',
            stylers: [{ color: '#1a1d3a' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#e2e8f0' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#0a0e27' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#0a0e27' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#252945' }]
          }
        ]
      });

      setMap(googleMap);

      // Create venue marker
      const marker = new window.google.maps.Marker({
        position: { lat: venueLat, lng: venueLng },
        map: googleMap,
        title: venue.name,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        animation: window.google.maps.Animation.DROP
      });

      // Info window for venue
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #1a1d3a; font-weight: 700; font-size: 16px; padding: 4px;">
            ${venue.name}
          </div>
          <div style="color: #6b7280; font-size: 14px; padding: 4px;">
            ${venue.address || ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMap, marker);
      });

      setVenueMarker(marker);

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map');
    }
  }, [mapsLoaded, venue]);

  // Add user marker
  useEffect(() => {
    if (!map || !userLocation) return;

    const pos = {
      lat: userLocation.latitude,
      lng: userLocation.longitude
    };

    if (userMarker) {
      userMarker.setPosition(pos);
    } else {
      const marker = new window.google.maps.Marker({
        position: pos,
        map: map,
        title: 'Your Location',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        animation: window.google.maps.Animation.DROP
      });
      setUserMarker(marker);
    }

    // Update distance
    if (venue?.location?.lat && venue?.location?.lon) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        venue.location.lat,
        venue.location.lon
      );
      setDistance(dist);
    }
  }, [map, userLocation, venue, userMarker]);

  // Fit bounds to show both venue and user
  useEffect(() => {
    if (!map || !venueMarker || !userMarker) return;

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(venueMarker.getPosition());
    bounds.extend(userMarker.getPosition());
    map.fitBounds(bounds);
    
    // Add padding
    const padding = 50;
    map.fitBounds(bounds, padding);
  }, [map, venueMarker, userMarker]);

  if (mapError) {
    return (
      <div className="venue-detail-map">
        <div className="map-error">
          <p>{mapError}</p>
          <p className="error-hint">Please configure REACT_APP_GOOGLE_MAPS_API_KEY in your .env file</p>
        </div>
      </div>
    );
  }

  if (!venue?.location?.lat || !venue?.location?.lon) {
    return (
      <div className="venue-detail-map">
        <div className="map-placeholder">
          <p>Location data unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="venue-detail-map">
      <div className="map-header">
        <h3>📍 Location</h3>
        {distance && (
          <div className="distance-display">
            <span className="distance-value">{formatDistance(distance)}</span>
            <span className="distance-label">away</span>
          </div>
        )}
      </div>
      <div ref={mapRef} className="map-container" />
    </div>
  );
};

export default VenueDetailGoogleMap;

