import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { venuesService } from '../services/venues';
import { useRealtime } from '../hooks/useRealtime';
import { useGeolocation } from '../hooks/useGeolocation';
import WaitReportForm from '../components/reports/WaitReportForm';
import VibeReportForm from '../components/reports/VibeReportForm';
import VenueDetailGoogleMap from '../components/map/VenueDetailGoogleMap';
import Button from '../components/common/Button';
import './VenueDetail.css';

const VenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWaitForm, setShowWaitForm] = useState(false);
  const [showVibeForm, setShowVibeForm] = useState(false);
  const { updates, alerts } = useRealtime(id);
  const { location: userLocation } = useGeolocation();

  useEffect(() => {
    fetchVenueDetails();
  }, [id]);

  const fetchVenueDetails = async () => {
    try {
      const data = await venuesService.getVenueById(id);
      setVenue(data.venue);
      setMetrics(data.metrics);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleReportSubmit = () => {
    setShowWaitForm(false);
    setShowVibeForm(false);
    fetchVenueDetails(); // Refresh venue data
  };

  if (loading) return <div className="loading-container">Loading venue details...</div>;
  if (error) return <div className="error-container">Error: {error}</div>;
  if (!venue) return <div className="error-container">Venue not found</div>;

  return (
    <div className="venue-detail-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="venue-detail-header">
        <h1>{venue.name}</h1>
        <span className={`status-badge status-${venue.currentStatus}`}>
          {venue.currentStatus.replace('_', ' ')}
        </span>
      </div>

      <p className="venue-address">{venue.address}</p>

      {venue.location && (
        <VenueDetailGoogleMap venue={venue} userLocation={userLocation} />
      )}

      {venue.tags && venue.tags.length > 0 && (
        <div className="tags-container">
          {venue.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, idx) => (
            <div key={idx} className="alert-notification">
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {updates.length > 0 && (
        <div className="updates-section">
          <h3>Recent Updates</h3>
          {updates.map((update, idx) => (
            <div key={idx} className="update-item">
              New {update.type} received
            </div>
          ))}
        </div>
      )}

      <div className="metrics-section">
        <h2>Current Metrics</h2>
        {metrics && metrics.reportCount > 0 ? (
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Wait Time</div>
              <div className="metric-value">
                {metrics.avgWait !== null ? `${Math.round(metrics.avgWait)} min` : 'N/A'}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Crowd</div>
              <div className="metric-value">{metrics.crowdDensity || 'N/A'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Noise</div>
              <div className="metric-value">{metrics.noiseLevel || 'N/A'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Energy</div>
              <div className="metric-value">{metrics.energyLevel || 'N/A'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Reports</div>
              <div className="metric-value">{metrics.reportCount}</div>
            </div>
          </div>
        ) : (
          <p className="no-data">No recent data available. Be the first to report!</p>
        )}
      </div>

      <div className="actions-section">
        <h2>Report Conditions</h2>
        <div className="action-buttons">
          <Button variant="primary" onClick={() => setShowWaitForm(true)}>
            Report Wait Time
          </Button>
          <Button variant="primary" onClick={() => setShowVibeForm(true)}>
            Report Vibe
          </Button>
        </div>
      </div>

      {showWaitForm && (
        <div className="modal-overlay" onClick={() => setShowWaitForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <WaitReportForm
              venue={venue}
              onSubmit={handleReportSubmit}
              onCancel={() => setShowWaitForm(false)}
            />
          </div>
        </div>
      )}

      {showVibeForm && (
        <div className="modal-overlay" onClick={() => setShowVibeForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <VibeReportForm
              venue={venue}
              onSubmit={handleReportSubmit}
              onCancel={() => setShowVibeForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueDetail;
