import React from 'react';
import VenueCard from './VenueCard';
import './VenueList.css';

const VenueList = ({ venues, onVenueClick, loading, error }) => {
  if (loading) {
    return <div className="venue-list-message">Loading venues...</div>;
  }

  if (error) {
    return <div className="venue-list-error">Error: {error}</div>;
  }

  if (!venues || venues.length === 0) {
    return <div className="venue-list-message">No venues found nearby</div>;
  }

  return (
    <div className="venue-list">
      {venues.map((venue) => (
        <VenueCard key={venue._id} venue={venue} onClick={onVenueClick} />
      ))}
    </div>
  );
};

export default VenueList;
