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

  const getStatusEmoji = (status) => {
    const emojis = {
      open: '✨',
      closed: '🚫',
      door_hold: '⏳'
    };
    return emojis[status] || '•';
  };

  return (
    <div 
      className="venue-card" 
      onClick={() => onClick(venue)}
      style={{
        backgroundColor: '#1a1d3a',
        color: '#ffffff',
        border: '2px solid rgba(168, 85, 247, 0.5)',
        borderRadius: '12px',
        padding: '18px',
        marginBottom: '12px'
      }}
    >
      <div className="venue-header">
        <h3 className="venue-name" style={{ color: '#ffffff' }}>{name}</h3>
        <span
          className="status-badge"
          style={{ 
            backgroundColor: getStatusColor(currentStatus),
            boxShadow: `0 0 20px ${getStatusColor(currentStatus)}`
          }}
        >
          {getStatusEmoji(currentStatus)} {currentStatus.replace('_', ' ')}
        </span>
      </div>

      <p className="venue-address" style={{ color: '#cbd5e1' }}>{address}</p>

      {tags && tags.length > 0 && (
        <div className="venue-tags">
          {tags.map((tag) => (
            <span key={tag} className="tag" style={{ color: '#e9d5ff' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {metrics && metrics.reportCount > 0 && (
        <div className="venue-metrics">
          <div className="metric">
            <span className="metric-label" style={{ color: '#94a3b8' }}>Wait:</span>
            <span className="metric-value" style={{ color: '#ffffff' }}>
              {metrics.avgWait !== null ? `${Math.round(metrics.avgWait)} min` : 'N/A'}
            </span>
          </div>

          <div className="metric">
            <span className="metric-label" style={{ color: '#94a3b8' }}>Crowd:</span>
            <span
              className="metric-value"
              style={{ color: getCrowdColor(metrics.crowdDensity) }}
            >
              {metrics.crowdDensity || 'N/A'}
            </span>
          </div>

          <div className="metric">
            <span className="metric-label" style={{ color: '#94a3b8' }}>Reports:</span>
            <span className="metric-value" style={{ color: '#ffffff' }}>{metrics.reportCount || 0}</span>
          </div>
        </div>
      )}

      {(!metrics || metrics.reportCount === 0) && (
        <p className="no-data" style={{ color: '#94a3b8' }}>No recent data available</p>
      )}
    </div>
  );
};

export default VenueCard;
