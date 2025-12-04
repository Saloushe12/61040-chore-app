import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVenues } from '../hooks/useVenues';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSuggestedVenues } from '../hooks/useSuggestedVenues';
import VenueList from '../components/venue/VenueList';
import SuggestedVenueList from '../components/venue/SuggestedVenueList';
import GoogleMap from '../components/map/GoogleMap';
import AddVenueForm from '../components/venue/AddVenueForm';
import './Home.css';

const Home = () => {
  const [activeTab, setActiveTab] = useState('suggested'); // 'suggested', 'venues', or 'map'
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
              className={`tab ${activeTab === 'suggested' ? 'active' : ''}`}
              onClick={() => setActiveTab('suggested')}
            >
              Suggested
            </button>
            <button
              className={`tab ${activeTab === 'venues' ? 'active' : ''}`}
              onClick={() => setActiveTab('venues')}
            >
              Venue List
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
          {activeTab === 'suggested' && (
            <div className="suggested-tab-content">
              <SuggestedVenueList
                suggestions={suggestions}
                onVenueClick={handleVenueClick}
                loading={suggestionsLoading}
                error={suggestionsError}
              />
            </div>
          )}

          {activeTab === 'venues' && (
            <div className="venues-tab-content">
              <div className="venues-header">
                <h2>Venues</h2>
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

              <VenueList
                venues={venues}
                onVenueClick={handleVenueClick}
                loading={loading}
                error={error}
              />
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
