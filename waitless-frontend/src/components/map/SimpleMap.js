import React from 'react';
import './SimpleMap.css';

// Simplified map component - replace with Google Maps when API key is available
const SimpleMap = ({ venues, onVenueClick, userLocation }) => {
  const getCrowdColor = (density) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return colors[density] || '#9ca3af';
  };

  return (
    <div className="simple-map">
      <div className="map-placeholder">
        <p className="map-info">
          Map view will be displayed here when Google Maps API key is configured
        </p>
        {userLocation && (
          <div className="location-info">
            <p>Your location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}</p>
          </div>
        )}
        <div className="venues-on-map">
          {venues?.map((venue) => (
            <div
              key={venue._id}
              className="map-venue-marker"
              onClick={() => onVenueClick(venue)}
              style={{
                borderColor: getCrowdColor(venue.metrics?.crowdDensity)
              }}
            >
              <div className="marker-name">{venue.name}</div>
              {venue.metrics?.avgWait !== null && (
                <div className="marker-wait">{Math.round(venue.metrics.avgWait)} min</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleMap;
