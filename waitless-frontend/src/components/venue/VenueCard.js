import React from 'react';
import './VenueCard.css';

const VenueCard = ({ venue, onClick }) => {
  const { name, address, metrics, currentStatus, tags } = venue;

  const getCrowdColor = (density) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return colors[density] || '#9ca3af';
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#10b981',
      closed: '#ef4444',
      door_hold: '#f59e0b'
    };
    return colors[status] || '#9ca3af';
  };

  return (
    <div className="venue-card" onClick={() => onClick(venue)}>
      <div className="venue-header">
        <h3 className="venue-name">{name}</h3>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(currentStatus) }}
        >
          {currentStatus.replace('_', ' ')}
        </span>
      </div>

      <p className="venue-address">{address}</p>

      {tags && tags.length > 0 && (
        <div className="venue-tags">
          {tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {metrics && metrics.reportCount > 0 && (
        <div className="venue-metrics">
          <div className="metric">
            <span className="metric-label">Wait:</span>
            <span className="metric-value">
              {metrics.avgWait !== null ? `${Math.round(metrics.avgWait)} min` : 'N/A'}
            </span>
          </div>

          <div className="metric">
            <span className="metric-label">Crowd:</span>
            <span
              className="metric-value"
              style={{ color: getCrowdColor(metrics.crowdDensity) }}
            >
              {metrics.crowdDensity || 'N/A'}
            </span>
          </div>

          <div className="metric">
            <span className="metric-label">Reports:</span>
            <span className="metric-value">{metrics.reportCount || 0}</span>
          </div>
        </div>
      )}

      {(!metrics || metrics.reportCount === 0) && (
        <p className="no-data">No recent data available</p>
      )}
    </div>
  );
};

export default VenueCard;
