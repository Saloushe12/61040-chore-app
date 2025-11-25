import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVenues } from '../hooks/useVenues';
import { useGeolocation } from '../hooks/useGeolocation';
import VenueList from '../components/venue/VenueList';
import SimpleMap from '../components/map/SimpleMap';
import './Home.css';

const Home = () => {
  const [view, setView] = useState('list'); // 'list' or 'map'
  const { venues, loading, error, refetch } = useVenues();
  const { location, error: locationError } = useGeolocation();
  const navigate = useNavigate();

  const handleVenueClick = (venue) => {
    navigate(`/venue/${venue._id}`);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="app-title">WaitLess</h1>
        <p className="app-subtitle">Find venues with real-time wait times</p>
      </header>

      <div className="view-toggle">
        <button
          className={`toggle-btn ${view === 'list' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          List View
        </button>
        <button
          className={`toggle-btn ${view === 'map' ? 'active' : ''}`}
          onClick={() => setView('map')}
        >
          Map View
        </button>
        <button className="refresh-btn" onClick={refetch} disabled={loading}>
          Refresh
        </button>
      </div>

      {locationError && (
        <div className="error-banner">
          Location error: {locationError}. Please enable location access.
        </div>
      )}

      <div className="content-area">
        {view === 'list' ? (
          <VenueList
            venues={venues}
            onVenueClick={handleVenueClick}
            loading={loading}
            error={error}
          />
        ) : (
          <SimpleMap
            venues={venues}
            onVenueClick={handleVenueClick}
            userLocation={location}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
