import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsService } from '../services/events';
import './Events.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    tag: '',
    status: '',
    timeRange: 'week'
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, [filters]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (filters.tag) params.tag = filters.tag;
      if (filters.status) params.status = filters.status;
      
      // Calculate time range
      if (filters.timeRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.startAfter = today.toISOString();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        params.startBefore = endOfDay.toISOString();
      } else if (filters.timeRange === 'week') {
        // Show events from start of today through next 7 days
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        params.startAfter = startOfToday.toISOString();
        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        weekLater.setHours(23, 59, 59, 999);
        params.startBefore = weekLater.toISOString();
      } else if (filters.timeRange === 'tonight') {
        const tonight = new Date();
        tonight.setHours(18, 0, 0, 0);
        params.startAfter = tonight.toISOString();
        const endOfNight = new Date();
        endOfNight.setHours(23, 59, 59, 999);
        params.startBefore = endOfNight.toISOString();
      }

      const data = await eventsService.getEvents(params);
      setEvents(data.events || data);
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { text: 'Upcoming', class: 'status-scheduled' },
      in_progress: { text: 'Happening Now', class: 'status-active' },
      cancelled: { text: 'Cancelled', class: 'status-cancelled' }
    };
    return badges[status] || badges.scheduled;
  };

  const popularTags = ['live_music', 'dj', 'karaoke', 'trivia', 'comedy', 'dance', 'sports'];

  return (
    <div className="events-page">
      <div className="events-header">
        <h1>🎉 Discover Events</h1>
        <p>Find what's happening at venues near you</p>
      </div>

      <div className="events-filters">
        <div className="filter-group">
          <label>Time Range</label>
          <div className="filter-buttons">
            <button
              className={filters.timeRange === 'tonight' ? 'active' : ''}
              onClick={() => setFilters({ ...filters, timeRange: 'tonight' })}
            >
              Tonight
            </button>
            <button
              className={filters.timeRange === 'today' ? 'active' : ''}
              onClick={() => setFilters({ ...filters, timeRange: 'today' })}
            >
              Today
            </button>
            <button
              className={filters.timeRange === 'week' ? 'active' : ''}
              onClick={() => setFilters({ ...filters, timeRange: 'week' })}
            >
              This Week
            </button>
            <button
              className={filters.timeRange === '' ? 'active' : ''}
              onClick={() => setFilters({ ...filters, timeRange: '' })}
            >
              All
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Event Type</label>
          <div className="tag-filters">
            <button
              className={filters.tag === '' ? 'tag-btn active' : 'tag-btn'}
              onClick={() => setFilters({ ...filters, tag: '' })}
            >
              All
            </button>
            {popularTags.map(tag => (
              <button
                key={tag}
                className={filters.tag === tag ? 'tag-btn active' : 'tag-btn'}
                onClick={() => setFilters({ ...filters, tag })}
              >
                {tag.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="status-select"
          >
            <option value="">All</option>
            <option value="scheduled">Upcoming</option>
            <option value="in_progress">Happening Now</option>
          </select>
        </div>
      </div>

      {loading && <div className="loading">Loading events...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <div className="events-list">
          {events.length === 0 ? (
            <div className="empty-state">
              <p>No events found matching your filters.</p>
              <p>Try adjusting your search criteria.</p>
            </div>
          ) : (
            events.map(event => {
              const statusBadge = getStatusBadge(event.status);
              return (
                <div
                  key={event._id}
                  className="event-card"
                  onClick={() => navigate(`/venues/${event.venueId}`)}
                >
                  <div className="event-card-header">
                    <h3>{event.title}</h3>
                    <span className={`status-badge ${statusBadge.class}`}>
                      {statusBadge.text}
                    </span>
                  </div>
                  
                  <div className="event-venue">
                    📍 {event.venueName || 'Unknown Venue'}
                  </div>

                  <div className="event-time">
                    🕐 {formatDateTime(event.startTime)}
                    {event.endTime && ` - ${formatDateTime(event.endTime)}`}
                  </div>

                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}

                  {event.tags && event.tags.length > 0 && (
                    <div className="event-tags">
                      {event.tags.map((tag, idx) => (
                        <span key={idx} className="event-tag">
                          {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Events;
