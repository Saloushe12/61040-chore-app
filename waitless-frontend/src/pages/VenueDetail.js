import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { venuesService } from '../services/venues';
import { dashboardService } from '../services/dashboard';
import { eventsService } from '../services/events';
import { useRealtime } from '../hooks/useRealtime';
import { useGeolocation } from '../hooks/useGeolocation';
import { AuthContext } from '../contexts/AuthContext';
import WaitReportForm from '../components/reports/WaitReportForm';
import VibeReportForm from '../components/reports/VibeReportForm';
import VenueDetailGoogleMap from '../components/map/VenueDetailGoogleMap';
import AlertManager from '../components/alerts/AlertManager';
import Button from '../components/common/Button';
import './VenueDetail.css';

const VenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [venue, setVenue] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWaitForm, setShowWaitForm] = useState(false);
  const [showVibeForm, setShowVibeForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [claiming, setClaiming] = useState(false);
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
      setForecast(data.forecast);
      setEvents(data.events || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchForecast = async (dayOfWeek = null) => {
    try {
      const data = await venuesService.getVenueForecast(id, dayOfWeek);
      setForecast(data);
    } catch (err) {
      console.error('Failed to fetch forecast:', err);
    }
  };

  const handleReportSubmit = () => {
    setShowWaitForm(false);
    setShowVibeForm(false);
    fetchVenueDetails(); // Refresh venue data
  };

  const handleEventSubmit = async (eventData) => {
    try {
      // Convert datetime-local format to ISO format
      const startTime = new Date(eventData.startTime).toISOString();
      const endTime = new Date(eventData.endTime).toISOString();
      
      await eventsService.createEvent({
        venueId: id,
        title: eventData.title,
        description: eventData.description,
        startTime,
        endTime,
        tags: eventData.tags || []
      });
      setShowEventForm(false);
      await fetchVenueDetails(); // Refresh to show new event
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create event');
    }
  };

  const handleClaimVenue = async () => {
    if (!window.confirm('Are you sure you want to claim this venue? You will be able to manage it from your dashboard.')) {
      return;
    }

    try {
      setClaiming(true);
      await dashboardService.claimVenue(id);
      await fetchVenueDetails(); // Refresh to show updated operator
      alert('Venue claimed successfully! You can now manage it from your dashboard.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to claim venue');
    } finally {
      setClaiming(false);
    }
  };

  const isOperator = user?.role === 'venue_operator';
  const canClaim = isOperator && !venue?.operatorUserId;

  if (loading) return <div className="loading-container">Loading venue details...</div>;
  if (error) return <div className="error-container">Error: {error}</div>;
  if (!venue) return <div className="error-container">Venue not found</div>;

  return (
    <div className="venue-detail-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="venue-detail-header">
        <div>
          <h1>{venue.name}</h1>
          {canClaim && (
            <button
              className="claim-venue-btn"
              onClick={handleClaimVenue}
              disabled={claiming}
            >
              {claiming ? 'Claiming...' : '🔑 Claim This Venue'}
            </button>
          )}
        </div>
        <span className={`status-badge status-${venue.currentStatus}`}>
          {venue.currentStatus.replace('_', ' ')}
        </span>
      </div>

      <p className="venue-address">{venue.address}</p>

      {venue.hours && Object.keys(venue.hours).length > 0 && (
        <div className="venue-hours-section">
          <h3>Operating Hours</h3>
          <div className="hours-list">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
              const dayHours = venue.hours[day];
              if (!dayHours || !dayHours.open || !dayHours.close) return null;
              
              // Format time for display (convert 24h to 12h if needed, or keep 24h)
              const formatTime = (time) => {
                if (!time) return '';
                const [hours, minutes] = time.split(':');
                const hour = parseInt(hours);
                if (hour === 0) return `12:${minutes} AM`;
                if (hour < 12) return `${hour}:${minutes} AM`;
                if (hour === 12) return `12:${minutes} PM`;
                return `${hour - 12}:${minutes} PM`;
              };

              return (
                <div key={day} className="hours-item">
                  <span className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                  <span className="hours-time">
                    {formatTime(dayHours.open)} - {formatTime(dayHours.close)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {events && events.length > 0 && (
        <div className="events-section">
          <div className="events-header">
            <h2>Upcoming Events</h2>
            {user && (
              <Button variant="primary" onClick={() => setShowEventForm(true)}>
                + Create Event
              </Button>
            )}
          </div>
          <div className="events-list">
            {events
              .filter(event => event.status !== 'cancelled')
              .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
              .map((event) => (
                <div key={event._id || event.eventId} className="event-item">
                  <div className="event-info">
                    <h3 className="event-title">{event.title}</h3>
                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}
                    <div className="event-time">
                      {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}
                    </div>
                    {event.tags && event.tags.length > 0 && (
                      <div className="event-tags">
                        {event.tags.map((tag, idx) => (
                          <span key={idx} className="event-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    <span className={`event-status status-${event.status}`}>
                      {event.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {(!events || events.length === 0) && user && (
        <div className="events-section">
          <div className="events-header">
            <h2>Events</h2>
            <Button variant="primary" onClick={() => setShowEventForm(true)}>
              + Create Event
            </Button>
          </div>
          <p className="no-events">No events scheduled. Be the first to create one!</p>
        </div>
      )}

      {forecast && forecast.forecast && forecast.forecast.length > 0 && (
        <div className="forecast-section">
          <h2>Peak Time Forecast</h2>
          <div className="forecast-info">
            <p className="forecast-confidence">
              Confidence: {forecast.confidence ? `${Math.round(forecast.confidence * 100)}%` : 'N/A'} 
              ({forecast.dataPoints || 0} data points)
            </p>
            <select 
              onChange={(e) => fetchForecast(e.target.value ? parseInt(e.target.value) : null)}
              className="forecast-day-selector"
            >
              <option value="">All Days</option>
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
          <div className="forecast-chart">
            {forecast.forecast.map((hour, idx) => {
              const intensity = Math.min(hour.peakScore / 100, 1);
              const barHeight = `${intensity * 100}%`;
              const color = intensity > 0.7 ? '#ef4444' : intensity > 0.4 ? '#f59e0b' : '#10b981';
              return (
                <div key={idx} className="forecast-hour">
                  <div className="forecast-bar-container">
                    <div 
                      className="forecast-bar" 
                      style={{ height: barHeight, backgroundColor: color }}
                      title={`${hour.hour}:00 - Score: ${hour.peakScore}`}
                    />
                  </div>
                  <div className="forecast-hour-label">{hour.hour}:00</div>
                  <div className="forecast-score">{hour.peakScore}</div>
                </div>
              );
            })}
          </div>
          <p className="forecast-note">
            Higher scores indicate busier times based on historical data
          </p>
        </div>
      )}

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
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Button variant="secondary" onClick={() => navigate('/profile')}>
            📊 View My Report History
          </Button>
        </div>
      </div>

      <div className="alerts-manager-section">
        <AlertManager venueId={id} venueName={venue.name} />
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

      {showEventForm && venue && (
        <EventFormModal
          venue={venue}
          event={null}
          onClose={() => setShowEventForm(false)}
          onSubmit={handleEventSubmit}
        />
      )}
    </div>
  );
};

// Event Form Modal Component (reused from VenueDashboard pattern)
const EventFormModal = ({ venue, event, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    startTime: event?.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : '',
    endTime: event?.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : '',
    tags: event?.tags || []
  });

  const availableTags = ['trivia', 'live_music', 'sports', 'karaoke', 'dj', 'comedy', 'special'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? 'Edit Event' : 'Create Event'} for {venue.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Trivia Night"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event details..."
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Event Tags</label>
            <div className="tag-selector">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-button ${formData.tags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              {event ? 'Update' : 'Create'} Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VenueDetail;
