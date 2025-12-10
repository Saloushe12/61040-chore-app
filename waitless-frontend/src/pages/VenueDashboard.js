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
  const [showWaitOverride, setShowWaitOverride] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(null);
  const [waitOverrideMinutes, setWaitOverrideMinutes] = useState('');

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

  const handleWaitOverride = async (venueId) => {
    const minutes = parseInt(waitOverrideMinutes, 10);
    if (isNaN(minutes) || minutes < 0 || minutes > 300) {
      alert('Wait time must be a number between 0 and 300 minutes');
      return;
    }

    try {
      await dashboardService.submitWaitOverride(venueId, minutes);
      setShowWaitOverride(null);
      setWaitOverrideMinutes('');
      await loadDashboard();
      alert('Wait time override submitted successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit wait override');
    }
  };

  const handleUpdateProfile = async (venueId, profileData) => {
    try {
      await dashboardService.updateVenueProfile(venueId, profileData);
      setShowEditProfile(null);
      await loadDashboard();
      alert('Venue profile updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update venue profile');
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
          <div key={venue._id || venue.venueId} className="venue-dashboard-card">
            <div className="venue-card-header">
              <div>
                <h2>{venue.name}</h2>
                <p className="venue-address">{venue.address}</p>
              </div>
              <div className="venue-status-control">
                <select
                  value={venue.currentStatus}
                  onChange={(e) => handleStatusChange(venue._id || venue.venueId, e.target.value)}
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
                    setSelectedVenue({ ...venue, _id: venue._id || venue.venueId });
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
                onClick={() => navigate(`/venue/${venue._id || venue.venueId}`)}
              >
                View Public Page
              </button>
              <button
                className="edit-profile-btn"
                onClick={() => setShowEditProfile(venue._id || venue.venueId)}
              >
                Edit Profile
              </button>
              <button
                className="wait-override-btn"
                onClick={() => {
                  setShowWaitOverride(venue._id || venue.venueId);
                  setWaitOverrideMinutes('');
                }}
              >
                Override Wait Time
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
          onSubmit={(eventData) => handleCreateEvent(selectedVenue._id || selectedVenue.venueId, eventData)}
        />
      )}

      {showWaitOverride && (
        <WaitOverrideModal
          venue={dashboard.venues.find(v => (v._id || v.venueId) === showWaitOverride)}
          waitMinutes={waitOverrideMinutes}
          onWaitMinutesChange={setWaitOverrideMinutes}
          onSubmit={() => handleWaitOverride(showWaitOverride)}
          onClose={() => {
            setShowWaitOverride(null);
            setWaitOverrideMinutes('');
          }}
        />
      )}

      {showEditProfile && (
        <VenueProfileEditModal
          venue={dashboard.venues.find(v => (v._id || v.venueId) === showEditProfile)}
          onSubmit={(profileData) => handleUpdateProfile(showEditProfile, profileData)}
          onClose={() => setShowEditProfile(null)}
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

const WaitOverrideModal = ({ venue, waitMinutes, onWaitMinutesChange, onSubmit, onClose }) => {
  if (!venue) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Override Wait Time for {venue.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className="form-group">
            <label>Wait Time (minutes)</label>
            <input
              type="number"
              min="0"
              max="300"
              value={waitMinutes}
              onChange={(e) => onWaitMinutesChange(e.target.value)}
              required
              placeholder="Enter wait time in minutes"
            />
            <small>This will override the current user-reported wait time</small>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Submit Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VenueProfileEditModal = ({ venue, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: venue?.name || '',
    address: venue?.address || '',
    tags: venue?.tags || [],
    hours: venue?.hours || {
      monday: { open: '', close: '' },
      tuesday: { open: '', close: '' },
      wednesday: { open: '', close: '' },
      thursday: { open: '', close: '' },
      friday: { open: '', close: '' },
      saturday: { open: '', close: '' },
      sunday: { open: '', close: '' }
    },
    staticAttributes: {
      coverCharge: venue?.staticAttributes?.coverCharge || 0,
      minAge: venue?.staticAttributes?.minAge || 21,
      accessibility: venue?.staticAttributes?.accessibility !== false,
      capacity: venue?.staticAttributes?.capacity || 100
    }
  });

  if (!venue) return null;

  const availableTags = ['bar', 'club', 'restaurant', 'sports_bar', 'live_music', 'dance', 'lounge', 'rooftop', 'jazz', 'italian'];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Build hours object, only including days with both open and close times
    const hours = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      if (formData.hours[day]?.open && formData.hours[day]?.close) {
        hours[day] = {
          open: formData.hours[day].open,
          close: formData.hours[day].close
        };
      }
    });
    
    onSubmit({
      ...formData,
      hours: Object.keys(hours).length > 0 ? hours : undefined
    });
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...(prev.hours[day] || { open: '', close: '' }),
          [field]: value
        }
      }
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Venue Profile: {venue.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label>Venue Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Address *</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Tags</label>
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

          <div className="form-group">
            <label>Operating Hours</label>
            <small style={{ display: 'block', marginBottom: '12px', color: '#666', fontSize: '0.85rem' }}>
              Enter opening and closing times for each day (24-hour format)
            </small>
            <div className="hours-grid">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <div key={day} className="hours-row">
                  <label className="day-label">{day.charAt(0).toUpperCase() + day.slice(1)}</label>
                  <div className="hours-inputs">
                    <input
                      type="time"
                      value={formData.hours[day]?.open || ''}
                      onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      placeholder="Open"
                    />
                    <span className="hours-separator">-</span>
                    <input
                      type="time"
                      value={formData.hours[day]?.close || ''}
                      onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      placeholder="Close"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cover Charge ($)</label>
              <input
                type="number"
                min="0"
                value={formData.staticAttributes.coverCharge}
                onChange={(e) => setFormData({
                  ...formData,
                  staticAttributes: {
                    ...formData.staticAttributes,
                    coverCharge: parseInt(e.target.value) || 0
                  }
                })}
              />
            </div>
            <div className="form-group">
              <label>Minimum Age</label>
              <input
                type="number"
                min="0"
                max="21"
                value={formData.staticAttributes.minAge}
                onChange={(e) => setFormData({
                  ...formData,
                  staticAttributes: {
                    ...formData.staticAttributes,
                    minAge: parseInt(e.target.value) || 21
                  }
                })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Capacity</label>
              <input
                type="number"
                min="1"
                value={formData.staticAttributes.capacity}
                onChange={(e) => setFormData({
                  ...formData,
                  staticAttributes: {
                    ...formData.staticAttributes,
                    capacity: parseInt(e.target.value) || 100
                  }
                })}
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.staticAttributes.accessibility}
                  onChange={(e) => setFormData({
                    ...formData,
                    staticAttributes: {
                      ...formData.staticAttributes,
                      accessibility: e.target.checked
                    }
                  })}
                />
                <span>Accessible</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Update Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VenueDashboard;
