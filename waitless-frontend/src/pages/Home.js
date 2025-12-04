import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVenues } from '../hooks/useVenues';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSuggestedVenues } from '../hooks/useSuggestedVenues';
import VenueList from '../components/venue/VenueList';
import SuggestedVenueCard from '../components/venue/SuggestedVenueCard';
import GoogleMap from '../components/map/GoogleMap';
import AddVenueForm from '../components/venue/AddVenueForm';
import './Home.css';

const Home = () => {
  const [activeTab, setActiveTab] = useState('venues'); // 'venues' or 'map'
  const [showAddForm, setShowAddForm] = useState(false);
  const { venues, loading, error, refetch, addVenue } = useVenues();
  const { suggestions, loading: suggestionsLoading, error: suggestionsError, refetch: refetchSuggestions } = useSuggestedVenues();
  const { location, error: locationError } = useGeolocation();
  const navigate = useNavigate();

  const handleVenueClick = (venue) => {
    // Handle both _id and venueId for compatibility
    const venueId = venue._id || venue.venueId;
    if (!venueId) {
      console.error('Venue missing ID:', venue);
      return;
    }
    navigate(`/venue/${venueId}`);
  };

  const handleVenueAdded = async (venue) => {
    setShowAddForm(false);
    // Add the new venue directly to the list
    if (addVenue) {
      addVenue(venue);
    }
    // Also try to refetch if location is available
    if (location) {
      await refetch();
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="app-title">WaitLess</h1>
        <p className="app-subtitle">Find venues with real-time wait times</p>
      </header>

      <div className="home-content">
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'venues' ? 'active' : ''}`}
              onClick={() => setActiveTab('venues')}
            >
              Venues
            </button>
            <button
              className={`tab ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              Map View
            </button>
          </div>
        </div>

        {locationError && (
          <div className="error-banner">
            Location error: {locationError}. Please enable location access.
          </div>
        )}

        <div className="content-area">
          {activeTab === 'venues' && (
            <div className="venues-tab-content">
              <div className="venues-header">
                <button
                  className="add-venue-btn"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? 'Cancel' : '+ Add Venue'}
                </button>
              </div>

              {showAddForm && (
                <div className="add-venue-section">
                  <AddVenueForm
                    onSubmit={handleVenueAdded}
                    onCancel={() => setShowAddForm(false)}
                  />
                </div>
              )}

              {/* Combined venue list: suggested first, then regular venues */}
              <div className="unified-venue-list">
                {/* Suggested venues section */}
                {suggestions && suggestions.length > 0 && (
                  <div className="suggested-section">
                    <div className="suggestions-header">
                      <h3>✨ Personalized Suggestions</h3>
                      <p className="suggestions-subtitle">
                        Based on your location and trending activity
                      </p>
                    </div>
                    <div className="suggestions-list">
                      {suggestions.map((venue) => (
                        <SuggestedVenueCard key={venue._id || venue.venueId} venue={venue} onClick={handleVenueClick} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular venues section */}
                {venues && venues.length > 0 && (
                  <div className="regular-venues-section">
                    {suggestions && suggestions.length > 0 && (
                      <div className="venues-section-header">
                        <h3>All Venues</h3>
                      </div>
                    )}
                    <VenueList
                      venues={venues}
                      onVenueClick={handleVenueClick}
                      loading={loading}
                      error={error}
                    />
                  </div>
                )}

                {/* Loading states */}
                {((suggestionsLoading && (!suggestions || suggestions.length === 0)) || (loading && (!venues || venues.length === 0))) && (
                  <div className="venue-list-message">Loading venues...</div>
                )}

                {/* Error states */}
                {suggestionsError && (!suggestions || suggestions.length === 0) && (
                  <div className="venue-list-error">Error loading suggestions: {suggestionsError}</div>
                )}
                {error && (!venues || venues.length === 0) && (
                  <div className="venue-list-error">Error: {error}</div>
                )}

                {/* Empty state */}
                {(!suggestions || suggestions.length === 0) && (!venues || venues.length === 0) && !suggestionsLoading && !loading && (
                  <div className="venue-list-message">No venues found nearby</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <GoogleMap
              venues={venues}
              onVenueClick={handleVenueClick}
              userLocation={location}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
