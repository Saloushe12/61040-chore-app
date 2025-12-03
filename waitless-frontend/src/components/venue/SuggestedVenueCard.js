import React from 'react';
import VenueCard from './VenueCard';
import './SuggestedVenueCard.css';

const SuggestedVenueCard = ({ venue, onClick }) => {
  const { suggestionReasons = [], distance, reportCount = 0 } = venue;

  const getReasonBadge = (reason) => {
    const badges = {
      closest: {
        label: 'Close',
        color: '#10b981',
        icon: '📍'
      },
      trending: {
        label: 'Trending',
        color: '#f59e0b',
        icon: '🔥'
      }
    };
    return badges[reason] || { label: reason, color: '#9ca3af', icon: '⭐' };
  };

  const formatDistance = (meters) => {
    if (!meters || meters === undefined) return '';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="suggested-venue-card-wrapper">
      <VenueCard venue={venue} onClick={onClick} />
      <div className="suggestion-badges">
        {Array.isArray(suggestionReasons) && suggestionReasons.length > 0 && suggestionReasons.map((reason) => {
          const badge = getReasonBadge(reason);
          return (
            <span
              key={reason}
              className="suggestion-badge"
              style={{
                backgroundColor: `${badge.color}20`,
                borderColor: badge.color,
                color: badge.color
              }}
            >
              {badge.icon} {badge.label}
            </span>
          );
        })}
        {distance !== undefined && distance !== null && (
          <span className="distance-badge">
            📍 {formatDistance(distance)} away
          </span>
        )}
        {reportCount > 0 && Array.isArray(suggestionReasons) && suggestionReasons.includes('trending') && (
          <span className="report-count-badge">
            📊 {reportCount} recent reports
          </span>
        )}
      </div>
    </div>
  );
};

export default SuggestedVenueCard;

