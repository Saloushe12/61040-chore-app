import React, { useMemo } from 'react';
import { calculateDistance, formatDistance } from '../../utils/distance';
import './VenueDetailMap.css';

const VenueDetailMap = ({ venue, userLocation }) => {
  const mapData = useMemo(() => {
    if (!venue?.location?.coordinates) return null;

    const venueLat = venue.location.coordinates[1];
    const venueLng = venue.location.coordinates[0];

    // Calculate bounds
    let minLat = venueLat;
    let maxLat = venueLat;
    let minLng = venueLng;
    let maxLng = venueLng;

    if (userLocation) {
      minLat = Math.min(minLat, userLocation.latitude);
      maxLat = Math.max(maxLat, userLocation.latitude);
      minLng = Math.min(minLng, userLocation.longitude);
      maxLng = Math.max(maxLng, userLocation.longitude);
    }

    // Add padding
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;
    const padding = 0.15;
    
    const paddedMinLat = minLat - latRange * padding;
    const paddedMaxLat = maxLat + latRange * padding;
    const paddedMinLng = minLng - lngRange * padding;
    const paddedMaxLng = maxLng + lngRange * padding;

    const paddedLatRange = paddedMaxLat - paddedMinLat;
    const paddedLngRange = paddedMaxLng - paddedMinLng;

    // Convert to x/y positions
    const venuePosition = {
      x: ((venueLng - paddedMinLng) / paddedLngRange) * 100,
      y: 100 - ((venueLat - paddedMinLat) / paddedLatRange) * 100
    };

    let userPosition = null;
    let distance = null;
    if (userLocation) {
      userPosition = {
        x: ((userLocation.longitude - paddedMinLng) / paddedLngRange) * 100,
        y: 100 - ((userLocation.latitude - paddedMinLat) / paddedLatRange) * 100
      };
      distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        venueLat,
        venueLng
      );
    }

    return { venuePosition, userPosition, distance };
  }, [venue, userLocation]);

  if (!mapData) {
    return (
      <div className="venue-detail-map">
        <div className="map-placeholder">
          <p>Map unavailable - location data missing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="venue-detail-map">
      <div className="map-header">
        <h3>📍 Location</h3>
        {mapData.distance && (
          <div className="distance-display">
            <span className="distance-icon">📏</span>
            <span className="distance-value">{formatDistance(mapData.distance)}</span>
            <span className="distance-label">away</span>
          </div>
        )}
      </div>
      <div className="map-canvas">
        <div className="map-grid" />
        
        {/* Venue marker */}
        <div
          className="venue-marker"
          style={{
            left: `${mapData.venuePosition.x}%`,
            top: `${mapData.venuePosition.y}%`
          }}
          title={venue.name}
        >
          <div className="venue-marker-pin" />
          <div className="venue-marker-label">{venue.name}</div>
        </div>

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

        {/* Distance line */}
        {mapData.userPosition && (
          <svg className="distance-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <line
              x1={`${mapData.userPosition.x}%`}
              y1={`${mapData.userPosition.y}%`}
              x2={`${mapData.venuePosition.x}%`}
              y2={`${mapData.venuePosition.y}%`}
              stroke="rgba(168, 85, 247, 0.4)"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        )}
      </div>
    </div>
  );
};

export default VenueDetailMap;

