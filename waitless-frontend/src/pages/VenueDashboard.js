import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboard';
import { eventsService } from '../services/events';
import './VenueDashboard.css';

const VenueDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    // Redirect if not a venue operator
    if (user && user.role !== 'venue_operator') {
      navigate('/');
      return;
    }
    loadDashboard();
  }, [user, navigate]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getVenueDashboard();
      setDashboard(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (venueId, newStatus) => {
    try {
      await dashboardService.updateVenueStatus(venueId, newStatus);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.error || 'Failed to update venue status');
    }
  };

  const handleCreateEvent = async (venueId, eventData) => {
    try {
      await eventsService.createEvent({ ...eventData, venueId });
      setShowEventForm(false);
      setSelectedVenue(null);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to create event:', err);
      alert(err.response?.data?.error || 'Failed to create event');
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  if (!dashboard || !dashboard.venues || dashboard.venues.length === 0) {
    return (
      <div className="dashboard-empty">
        <h2>No Venues Found</h2>
        <p>You don't have any venues associated with your account yet.</p>
        <p>Contact support to claim a venue or add a new one from the home page.</p>
      </div>
    );
  }

  return (
    <div className="venue-dashboard-container">
      <div className="dashboard-header">
        <h1>Venue Dashboard</h1>
        <p className="dashboard-subtitle">Manage your venues and view real-time metrics</p>
      </div>

      <div className="venues-grid">
        {dashboard.venues.map((venue) => (
          <div key={venue._id} className="venue-dashboard-card">
            <div className="venue-card-header">
              <div>
                <h2>{venue.name}</h2>
                <p className="venue-address">{venue.address}</p>
              </div>
              <div className="venue-status-control">
                <select
                  value={venue.currentStatus}
                  onChange={(e) => handleStatusChange(venue._id, e.target.value)}
                  className={`status-select status-${venue.currentStatus}`}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="door_hold">Door Hold</option>
                </select>
              </div>
            </div>

            <div className="venue-metrics-grid">
              <div className="metric-box">
                <div className="metric-label">Current Wait</div>
                <div className="metric-value">
                  {venue.metrics?.avgWait !== null && venue.metrics?.avgWait !== undefined
                    ? `${Math.round(venue.metrics.avgWait)} min`
                    : 'N/A'}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">Crowd Level</div>
                <div className={`metric-value crowd-${venue.metrics?.crowdDensity}`}>
                  {venue.metrics?.crowdDensity || 'N/A'}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">Reports (30min)</div>
                <div className="metric-value">{venue.metrics?.reportCount || 0}</div>
              </div>
              <div className="metric-box">
                <div className="metric-label">Last Updated</div>
                <div className="metric-value metric-time">
                  {venue.metrics?.lastUpdated
                    ? new Date(venue.metrics.lastUpdated).toLocaleTimeString()
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="venue-events-section">
              <div className="events-header">
                <h3>Upcoming Events</h3>
                <button
                  className="create-event-btn"
                  onClick={() => {
                    setSelectedVenue(venue);
                    setShowEventForm(true);
                  }}
                >
                  + Create Event
                </button>
              </div>
              {venue.upcomingEvents && venue.upcomingEvents.length > 0 ? (
                <div className="events-list">
                  {venue.upcomingEvents.map((event) => (
                    <div key={event._id} className="event-item">
                      <div className="event-info">
                        <div className="event-title">{event.title}</div>
                        <div className="event-time">
                          {new Date(event.startTime).toLocaleString()}
                        </div>
                        <div className={`event-status-badge status-${event.status}`}>
                          {event.status.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="event-tags">
                        {event.tags?.map((tag, idx) => (
                          <span key={idx} className="event-tag">{tag}</span>
                        ))}
                      </div>
                      <div className="event-actions">
                        {event.status === 'scheduled' && (
                          <button
                            className="event-action-btn mark-progress-btn"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await eventsService.markEventInProgress(event._id || event.eventId);
                                await loadDashboard();
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to mark event in progress');
                              }
                            }}
                          >
                            Mark Active
                          </button>
                        )}
                        <button
                          className="event-action-btn edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVenue(venue);
                            setEditingEvent(event);
                            setShowEventForm(true);
                          }}
                        >
                          Edit
                        </button>
                        {event.status !== 'cancelled' && (
                          <button
                            className="event-action-btn cancel-btn"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to cancel this event?')) {
                                try {
                                  await eventsService.cancelEvent(event._id || event.eventId);
                                  await loadDashboard();
                                } catch (err) {
                                  alert(err.response?.data?.error || 'Failed to cancel event');
                                }
                              }
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-events">No upcoming events</p>
              )}
            </div>

            <div className="venue-actions">
              <button
                className="view-details-btn"
                onClick={() => navigate(`/venue/${venue._id}`)}
              >
                View Public Page
              </button>
            </div>
          </div>
        ))}
      </div>

      {showEventForm && selectedVenue && (
        <EventFormModal
          venue={selectedVenue}
          event={editingEvent}
          onClose={() => {
            setShowEventForm(false);
            setSelectedVenue(null);
            setEditingEvent(null);
          }}
          onSubmit={(eventData) => handleCreateEvent(selectedVenue._id, eventData)}
        />
      )}
    </div>
  );
};

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
    if (event) {
      // Update existing event
      try {
        await eventsService.updateEvent(event._id || event.eventId, formData);
        onClose();
        window.location.reload(); // Refresh to show updated event
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to update event');
      }
    } else {
      onSubmit(formData);
    }
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

export default VenueDashboard;
