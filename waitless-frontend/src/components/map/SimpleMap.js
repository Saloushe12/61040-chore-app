import React, { useMemo } from 'react';
import './SimpleMap.css';

// Simplified map component - displays venues on a coordinate-based canvas
const SimpleMap = ({ venues, onVenueClick, userLocation }) => {
  const getCrowdColor = (density) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return colors[density] || '#9ca3af';
  };

  // Calculate bounds and positions for venues
  const mapData = useMemo(() => {
    if (!venues || venues.length === 0) return null;

    const lats = venues.map(v => v.location.coordinates[1]);
    const lngs = venues.map(v => v.location.coordinates[0]);
    
    if (userLocation) {
      lats.push(userLocation.latitude);
      lngs.push(userLocation.longitude);
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    // Add padding
    const padding = 0.1;
    const paddedMinLat = minLat - latRange * padding;
    const paddedMaxLat = maxLat + latRange * padding;
    const paddedMinLng = minLng - lngRange * padding;
    const paddedMaxLng = maxLng + lngRange * padding;

    const paddedLatRange = paddedMaxLat - paddedMinLat;
    const paddedLngRange = paddedMaxLng - paddedMinLng;

    // Convert lat/lng to x/y positions (0-100%)
    const positionedVenues = venues.map(venue => {
      const lat = venue.location.coordinates[1];
      const lng = venue.location.coordinates[0];
      return {
        ...venue,
        x: ((lng - paddedMinLng) / paddedLngRange) * 100,
        y: 100 - ((lat - paddedMinLat) / paddedLatRange) * 100 // Flip Y axis
      };
    });

    let userPosition = null;
    if (userLocation) {
      userPosition = {
        x: ((userLocation.longitude - paddedMinLng) / paddedLngRange) * 100,
        y: 100 - ((userLocation.latitude - paddedMinLat) / paddedLatRange) * 100
      };
    }

    return { venues: positionedVenues, userPosition };
  }, [venues, userLocation]);

  if (!mapData) {
    return (
      <div className="simple-map">
        <div className="map-placeholder">
          <p className="map-info">No venues nearby. Try adjusting your location or wait for data to load.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simple-map">
      <div className="map-canvas">
        {/* Background grid */}
        <div className="map-grid" />
        
        {/* User location marker */}
        {mapData.userPosition && (
          <div
            className="user-marker"
            style={{
              left: `${mapData.userPosition.x}%`,
              top: `${mapData.userPosition.y}%`
            }}
            title="Your Location"
          >
            <div className="user-marker-dot" />
            <div className="user-marker-label">You</div>
          </div>
        )}

        {/* Venue markers */}
        {mapData.venues.map((venue) => (
            <div
              key={venue._id}
            className="venue-marker"
              onClick={() => onVenueClick(venue)}
              style={{
              left: `${venue.x}%`,
              top: `${venue.y}%`,
                borderColor: getCrowdColor(venue.metrics?.crowdDensity)
              }}
            >
            <div className="venue-marker-pin" style={{ backgroundColor: getCrowdColor(venue.metrics?.crowdDensity) }} />
            <div className="venue-marker-popup">
              <div className="venue-marker-name">{venue.name}</div>
              {venue.metrics?.avgWait !== null && venue.metrics?.avgWait !== undefined && (
                <div className="venue-marker-wait">⏱ {Math.round(venue.metrics.avgWait)} min</div>
              )}
              {venue.metrics?.crowdDensity && (
                <div className="venue-marker-crowd">
                  👥 {venue.metrics.crowdDensity}
                </div>
              )}
            </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default SimpleMap;
