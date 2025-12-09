import React from 'react';
import SuggestedVenueCard from './SuggestedVenueCard';
import './SuggestedVenueList.css';

const SuggestedVenueList = ({ suggestions, onVenueClick, loading, error }) => {
  // Only show loading if we have no suggestions yet
  if (loading && (!suggestions || suggestions.length === 0)) {
    return <div className="suggested-venue-list-message">Loading suggestions...</div>;
  }

  // Show error only if we have no suggestions to display
  if (error && (!suggestions || suggestions.length === 0)) {
    return <div className="suggested-venue-list-error">Error: {error}</div>;
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="suggested-venue-list-message">
        <p>No suggestions available at the moment.</p>
        <p className="suggestion-hint">Enable location access to see nearby venues, or check back later for trending spots!</p>
      </div>
    );
  }

  return (
    <div className="suggested-venue-list">
      <div className="suggestions-header">
        <h3>✨ Personalized Suggestions</h3>
        <p className="suggestions-subtitle">
          Based on your location and trending activity
        </p>
      </div>
      <div className="suggestions-list">
        {suggestions.map((venue) => (
          <SuggestedVenueCard key={venue._id} venue={venue} onClick={onVenueClick} />
        ))}
      </div>
    </div>
  );
};

export default SuggestedVenueList;

