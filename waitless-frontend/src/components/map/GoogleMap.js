import React, { useEffect, useRef, useState, useCallback } from 'react';
import './GoogleMap.css';

// Note: This example requires that you consent to location sharing when
// prompted by your browser. If you see the error "The Geolocation service
// failed.", it means you probably did not give permission for the browser to
// locate you.
const GoogleMap = ({ venues, onVenueClick, userLocation }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [userMarker, setUserMarker] = useState(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [locationPermissionRequested, setLocationPermissionRequested] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const requestLocationPermissionRef = useRef(null);

  // Helper function to check if Google Maps is fully loaded
  const checkGoogleMapsReady = () => {
    return window.google && 
           window.google.maps && 
           window.google.maps.Map &&
           typeof window.google.maps.Map === 'function';
  };

  // Function to request location permission
  const requestLocationPermission = useCallback((googleMap, infoWin) => {
    console.log('Requesting location permission...');
    
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      setShowLocationPrompt(true);
      setLocationPermissionStatus('denied');
      return;
    }

    // Request location permission - this will trigger browser permission prompt
    // Using getCurrentPosition will show the browser's native permission dialog
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Center map on user location
        if (googleMap) {
          googleMap.setCenter(pos);
          googleMap.setZoom(14);
        }

        // Show location found message briefly
        if (infoWin) {
          infoWin.setPosition(pos);
          infoWin.setContent('📍 Location found!');
          infoWin.open(googleMap);
          // Close info window after 3 seconds
          setTimeout(() => {
            infoWin.close();
          }, 3000);
        }

        // Create or update user marker
        if (googleMap) {
          setUserMarker((prevMarker) => {
            if (prevMarker) {
              prevMarker.setPosition(pos);
              return prevMarker;
            } else {
              const marker = new window.google.maps.Marker({
                position: pos,
                map: googleMap,
                title: 'Current Location',
                label: {
                  text: 'Current Location',
                  color: '#1e40af',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  className: 'current-location-label'
                },
                icon: {
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                },
              });
              return marker;
            }
          });
        }

        setShowLocationPrompt(false);
        setLocationPermissionStatus('granted');
      },
      (error) => {
        // Permission denied or error
        console.log('Location permission error:', error);
        setLocationPermissionStatus('denied');
        
        if (error.code === error.PERMISSION_DENIED) {
          setShowLocationPrompt(true);
          // Show a message that location access was denied
          if (infoWin && googleMap) {
            infoWin.setPosition(googleMap.getCenter());
            infoWin.setContent(
              '<div style="padding: 8px;"><p style="margin: 0 0 8px 0; font-weight: 500;">Location access denied</p><p style="margin: 0; font-size: 14px;">Please enable location permissions in your browser settings to see your location on the map.</p></div>'
            );
            infoWin.open(googleMap);
          }
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setShowLocationPrompt(true);
          if (infoWin && googleMap) {
            infoWin.setPosition(googleMap.getCenter());
            infoWin.setContent('Location information is unavailable.');
            infoWin.open(googleMap);
          }
        } else if (error.code === error.TIMEOUT) {
          setShowLocationPrompt(true);
          if (infoWin && googleMap) {
            infoWin.setPosition(googleMap.getCenter());
            infoWin.setContent('Location request timed out. Please try again.');
            infoWin.open(googleMap);
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, []);

  // Store the function in a ref so it's accessible everywhere
  useEffect(() => {
    requestLocationPermissionRef.current = requestLocationPermission;
  }, [requestLocationPermission]);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('REACT_APP_GOOGLE_MAPS_API_KEY is not set. Google Maps will not load.');
      return;
    }

    // Check if Google Maps is already fully loaded
    if (checkGoogleMapsReady()) {
      setMapsLoaded(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to be ready
      const checkInterval = setInterval(() => {
        if (checkGoogleMapsReady()) {
          clearInterval(checkInterval);
          setMapsLoaded(true);
        }
      }, 100);
      
      // Also listen for load event
      existingScript.addEventListener('load', () => {
        const loadCheckInterval = setInterval(() => {
          if (checkGoogleMapsReady()) {
            clearInterval(loadCheckInterval);
            setMapsLoaded(true);
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(loadCheckInterval);
          if (!checkGoogleMapsReady()) {
            console.error('Google Maps failed to load after script load event');
          }
        }, 10000);
      });
      
      return () => clearInterval(checkInterval);
    }

    // Load the script with callback
    const callbackName = 'initGoogleMap_' + Date.now();
    window[callbackName] = () => {
      // Wait a bit for everything to be ready
      const checkInterval = setInterval(() => {
        if (checkGoogleMapsReady()) {
          clearInterval(checkInterval);
          setMapsLoaded(true);
          delete window[callbackName];
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!checkGoogleMapsReady()) {
          console.error('Google Maps failed to initialize after callback');
          setMapError('Google Maps failed to initialize. Please refresh the page.');
        }
        delete window[callbackName];
      }, 10000);
    };
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setMapError('Failed to load Google Maps. Please check your API key.');
      delete window[callbackName];
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts (optional)
      // Note: Usually we want to keep it loaded for other components
    };
  }, []);

  // Initialize map (only once when maps are loaded)
  useEffect(() => {
    if (!mapRef.current || map || !mapsLoaded) return;
    
    // Double-check that Google Maps is ready before initializing
    if (!checkGoogleMapsReady()) {
      console.warn('Google Maps not ready yet, waiting...');
      return;
    }

    // Default center (can be overridden by user location)
    const defaultCenter = { lat: -34.397, lng: 150.644 };
    
    // Use user location if available, otherwise use default
    const center = userLocation 
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : defaultCenter;

    try {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: userLocation ? 14 : 6,
      });

      const infoWin = new window.google.maps.InfoWindow();
      setMap(googleMap);
      setInfoWindow(infoWin);

      // Show location prompt banner when map loads
      // Browsers require user gesture to show permission prompt, so we show a banner first
      if (navigator.geolocation && !locationPermissionRequested) {
        // Always show prompt banner initially (will be hidden if permission already granted)
        setShowLocationPrompt(true);
        setLocationPermissionStatus('prompt');
        setLocationPermissionRequested(true);
        
        // Check permission status if available (non-blocking)
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            if (result.state === 'granted') {
              // Already granted, request location immediately and hide prompt
              setShowLocationPrompt(false);
              requestLocationPermission(googleMap, infoWin);
            } else if (result.state === 'denied') {
              // Permission was denied, update status
              setLocationPermissionStatus('denied');
            }
            // If 'prompt', keep the banner showing
          }).catch(() => {
            // Permissions API not supported or failed, keep prompt showing
            console.log('Permissions API not available');
          });
        }
      }

    // Add location button
    const locationButton = document.createElement('button');
    locationButton.textContent = 'Pan to Current Location';
    locationButton.classList.add('custom-map-control-button');
    googleMap.controls[window.google.maps.ControlPosition.TOP_CENTER].push(locationButton);

    const handleLocationError = (browserHasGeolocation, infoWindow, pos) => {
      infoWindow.setPosition(pos);
      infoWindow.setContent(
        browserHasGeolocation
          ? 'Error: The Geolocation service failed.'
          : 'Error: Your browser doesn\'t support geolocation.'
      );
      infoWindow.open(googleMap);
    };

    locationButton.addEventListener('click', () => {
      // Request location again when button is clicked
      requestLocationPermission(googleMap, infoWin);
    });
    } catch (error) {
      console.error('Error initializing Google Map:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded]);

  // Update map center when user location changes (only if map is already initialized)
  useEffect(() => {
    if (map && userLocation && !userMarker) {
      const pos = {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      };
      map.setCenter(pos);
      map.setZoom(14);

      // Create user marker
      const marker = new window.google.maps.Marker({
        position: pos,
        map: map,
        title: 'Current Location',
        label: {
          text: 'Current Location',
          color: '#1e40af',
          fontSize: '12px',
          fontWeight: 'bold',
          className: 'current-location-label'
        },
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        },
      });
      setUserMarker(marker);
    } else if (map && userLocation && userMarker) {
      // Update existing marker position
      const pos = {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      };
      userMarker.setPosition(pos);
    }
  }, [map, userLocation, userMarker]);

  // Add venue markers
  useEffect(() => {
    if (!map || !venues || venues.length === 0) return;

    // Clear existing markers
    markers.forEach((m) => m.setMap(null));

    const getCrowdColor = (density) => {
      const colors = {
        low: 'green',
        medium: 'yellow',
        high: 'red',
      };
      return colors[density] || 'gray';
    };

    // Create bounds to fit all venues
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidVenues = false;

    // Create new markers for venues
    const newMarkers = venues
      .filter((venue) => {
        // Filter out venues with invalid coordinates
        return (
          venue.location &&
          venue.location.coordinates &&
          Array.isArray(venue.location.coordinates) &&
          venue.location.coordinates.length >= 2 &&
          typeof venue.location.coordinates[0] === 'number' &&
          typeof venue.location.coordinates[1] === 'number' &&
          !isNaN(venue.location.coordinates[0]) &&
          !isNaN(venue.location.coordinates[1])
        );
      })
      .map((venue) => {
        const position = {
          lat: venue.location.coordinates[1],
          lng: venue.location.coordinates[0],
        };

        // Add to bounds
        bounds.extend(position);
        hasValidVenues = true;

        const marker = new window.google.maps.Marker({
          position: position,
          map: map,
          title: venue.name,
          label: {
            text: venue.name,
            color: '#1e40af',
            fontSize: '11px',
            fontWeight: '500',
            className: 'venue-marker-label'
          },
          icon: {
            url: `http://maps.google.com/mapfiles/ms/icons/${getCrowdColor(venue.metrics?.crowdDensity)}-dot.png`,
          },
        });

        // Create info window content
        const infoContent = `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${venue.name}</h3>
            ${venue.address ? `<p style="margin: 4px 0; color: #6b7280; font-size: 13px;">📍 ${venue.address}</p>` : ''}
            ${venue.metrics?.avgWait !== null && venue.metrics?.avgWait !== undefined
              ? `<p style="margin: 4px 0;">⏱ ${Math.round(venue.metrics.avgWait)} min wait</p>`
              : ''}
            ${venue.metrics?.crowdDensity
              ? `<p style="margin: 4px 0;">👥 ${venue.metrics.crowdDensity} crowd</p>`
              : ''}
            ${venue.currentStatus
              ? `<p style="margin: 4px 0; color: ${venue.currentStatus === 'open' ? '#10b981' : '#ef4444'};">
                  ${venue.currentStatus === 'open' ? '🟢 Open' : venue.currentStatus === 'closed' ? '🔴 Closed' : '🟡 Door Hold'}
                </p>`
              : ''}
          </div>
        `;

        marker.addListener('click', () => {
          if (infoWindow) {
            infoWindow.setContent(infoContent);
            infoWindow.open(map, marker);
          }
          if (onVenueClick) {
            onVenueClick(venue);
          }
        });

        return marker;
      });

    setMarkers(newMarkers);

    // Fit map bounds to show all venues (and user location if available)
    if (hasValidVenues && newMarkers.length > 0) {
      // Add user location to bounds if available
      if (userLocation && userMarker) {
        bounds.extend({
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        });
      }

      // Fit bounds with padding
      map.fitBounds(bounds, {
        padding: 50, // Add padding around markers
      });

      // If only one venue, set a reasonable zoom level
      if (newMarkers.length === 1 && !userLocation) {
        map.setZoom(15);
      }
    }

    // Cleanup function
    return () => {
      newMarkers.forEach((m) => m.setMap(null));
    };
  }, [map, venues, infoWindow, onVenueClick, userLocation, userMarker]);

  // Show prompt when map is ready and we don't have location
  useEffect(() => {
    if (map && infoWindow && !userLocation && !showLocationPrompt && locationPermissionStatus === 'prompt') {
      // Small delay to ensure map is fully rendered
      setTimeout(() => {
        setShowLocationPrompt(true);
      }, 500);
    }
  }, [map, infoWindow, userLocation, showLocationPrompt, locationPermissionStatus]);

  if (mapError) {
    return (
      <div className="google-map-container">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#ef4444',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div>
            <p>{mapError}</p>
            <p style={{ fontSize: '14px', marginTop: '8px', color: '#9ca3af' }}>
              Make sure REACT_APP_GOOGLE_MAPS_API_KEY is set in your environment variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!mapsLoaded) {
    return (
      <div className="google-map-container">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#9ca3af'
        }}>
          <div>
            <p>Loading Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handler for enable location button
  const handleEnableLocation = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Enable location button clicked', { map: !!map, infoWindow: !!infoWindow });
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    if (map && infoWindow) {
      setShowLocationPrompt(false);
      // This will trigger the browser's permission prompt
      // The browser will show its native permission dialog
      requestLocationPermission(map, infoWindow);
    } else {
      console.warn('Map or infoWindow not ready', { map: !!map, infoWindow: !!infoWindow });
      // Try again after a short delay
      setTimeout(() => {
        if (map && infoWindow) {
          setShowLocationPrompt(false);
          requestLocationPermission(map, infoWindow);
        }
      }, 500);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showLocationPrompt && (locationPermissionStatus === 'prompt' || locationPermissionStatus === 'denied') && (
        <div 
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '90%',
            fontSize: '14px'
          }}
        >
          <span>📍 {locationPermissionStatus === 'denied' ? 'Location access was denied. Click to enable:' : 'Allow location access to see your position on the map'}</span>
          <button
            onClick={handleEnableLocation}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Enable Location
          </button>
          <button
            onClick={() => setShowLocationPrompt(false)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: '1'
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <div ref={mapRef} className="google-map-container" />
    </div>
  );
};

export default GoogleMap;

