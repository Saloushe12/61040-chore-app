import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVenues } from '../hooks/useVenues';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSuggestedVenues } from '../hooks/useSuggestedVenues';
import VenueList from '../components/venue/VenueList';
import SuggestedVenueCard from '../components/venue/SuggestedVenueCard';
import GoogleMap from '../components/map/GoogleMap';
import AddVenueForm from '../components/venue/AddVenueForm';
import RecentReportsSummary from '../components/reports/RecentReportsSummary';
import HeatmapLayer from '../components/map/HeatmapLayer';
import './Home.css';

const Home = () => {
  const [activeTab, setActiveTab] = useState('venues'); // 'venues' or 'map'
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
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

  // Deduplicate suggestions - normalize IDs to strings for consistent comparison
  const uniqueSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    const seen = new Set();
    return suggestions.filter(venue => {
      const id = String(venue._id || venue.venueId || '');
      if (!id || id === 'undefined' || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [suggestions]);

  // Get unique suggestion IDs to filter them out from regular venues - normalize to strings
  const suggestionIds = useMemo(() => {
    if (!uniqueSuggestions || uniqueSuggestions.length === 0) return new Set();
    return new Set(
      uniqueSuggestions
        .map(venue => String(venue._id || venue.venueId || ''))
        .filter(id => id && id !== 'undefined')
    );
  }, [uniqueSuggestions]);

  // Filter out suggested venues from regular venues list and deduplicate - normalize IDs to strings
  const filteredVenues = useMemo(() => {
    if (!venues || venues.length === 0) return [];
    
    // First deduplicate by ID
    const seenIds = new Set();
    const deduplicated = venues.filter(venue => {
      const id = String(venue._id || venue.venueId || '').toLowerCase().trim();
      if (!id || id === 'undefined' || id === 'null' || seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    });
    
    // Then filter out suggested venues
    return deduplicated.filter(venue => {
      const id = String(venue._id || venue.venueId || '').toLowerCase().trim();
      return id && id !== 'undefined' && !suggestionIds.has(id);
    });
  }, [venues, suggestionIds]);

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
              <RecentReportsSummary />
              
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
                {uniqueSuggestions && uniqueSuggestions.length > 0 && (
                  <div className="suggested-section">
                    <div className="suggestions-header">
                      <h3>✨ Personalized Suggestions</h3>
                      <p className="suggestions-subtitle">
                        Based on your location and trending activity
                      </p>
                    </div>
                    <div className="suggestions-list">
                      {uniqueSuggestions.map((venue) => (
                        <SuggestedVenueCard key={venue._id || venue.venueId} venue={venue} onClick={handleVenueClick} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular venues section */}
                {filteredVenues && filteredVenues.length > 0 && (
                  <div className="regular-venues-section">
                    {uniqueSuggestions && uniqueSuggestions.length > 0 && (
                      <div className="venues-section-header">
                        <h3>All Venues</h3>
                      </div>
                    )}
                    <VenueList
                      venues={filteredVenues}
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
                {(!uniqueSuggestions || uniqueSuggestions.length === 0) && (!filteredVenues || filteredVenues.length === 0) && !suggestionsLoading && !loading && (
                  <div className="venue-list-message">No venues found nearby</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="map-container-wrapper">
              <div className="map-controls">
                <button
                  className={`heatmap-toggle ${showHeatmap ? 'active' : ''}`}
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  {showHeatmap ? '🔥 Hide Heatmap' : '🗺️ Show Heatmap'}
                </button>
              </div>
              <GoogleMap
                venues={venues}
                onVenueClick={handleVenueClick}
                userLocation={location}
                onMapLoad={(map) => setMapInstance(map)}
                onBoundsChange={(bounds) => setMapBounds(bounds)}
              />
              {mapInstance && (
                <HeatmapLayer
                  map={mapInstance}
                  bounds={mapBounds}
                  enabled={showHeatmap}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
