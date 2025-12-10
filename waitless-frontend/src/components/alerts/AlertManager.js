import React, { useState, useEffect } from 'react';
import { alertsService } from '../../services/alerts';
import './AlertManager.css';

const AlertManager = ({ venueId, venueName }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    waitBelowMinutes: '',
    crowdDensityIn: [],
    eventTag: ''
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertsService.getAlerts();
      // Filter alerts for this venue if venueId is provided
      const filtered = venueId 
        ? data.filter(alert => alert.venueId === venueId)
        : data;
      setAlerts(filtered);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    
    // Build condition object
    const condition = {};
    if (formData.waitBelowMinutes) {
      condition.waitBelowMinutes = parseInt(formData.waitBelowMinutes);
    }
    if (formData.crowdDensityIn.length > 0) {
      condition.crowdDensityIn = formData.crowdDensityIn;
    }
    if (formData.eventTag) {
      condition.eventTag = formData.eventTag;
    }

    if (Object.keys(condition).length === 0) {
      alert('Please set at least one alert condition');
      return;
    }

    try {
      await alertsService.createAlert(venueId, condition);
      setShowForm(false);
      setFormData({ waitBelowMinutes: '', crowdDensityIn: [], eventTag: '' });
      await loadAlerts();
    } catch (err) {
      console.error('Failed to create alert:', err);
      alert(err.response?.data?.error || 'Failed to create alert');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      await alertsService.deleteAlert(alertId);
      await loadAlerts();
    } catch (err) {
      console.error('Failed to delete alert:', err);
      alert(err.response?.data?.error || 'Failed to delete alert');
    }
  };

  const toggleCrowdDensity = (density) => {
    setFormData(prev => ({
      ...prev,
      crowdDensityIn: prev.crowdDensityIn.includes(density)
        ? prev.crowdDensityIn.filter(d => d !== density)
        : [...prev.crowdDensityIn, density]
    }));
  };

  const formatCondition = (condition) => {
    const parts = [];
    if (condition.waitBelowMinutes) {
      parts.push(`Wait < ${condition.waitBelowMinutes} min`);
    }
    if (condition.crowdDensityIn && condition.crowdDensityIn.length > 0) {
      parts.push(`Crowd: ${condition.crowdDensityIn.join(', ')}`);
    }
    if (condition.eventTag) {
      parts.push(`Event: ${condition.eventTag}`);
    }
    return parts.join(' • ');
  };

  return (
    <div className="alert-manager">
      <div className="alert-manager-header">
        <h3>Alert Subscriptions</h3>
        {venueId && (
          <button 
            className="create-alert-btn"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Create Alert'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateAlert} className="alert-form">
          <p className="alert-form-description">
            Get notified when conditions at {venueName} match your preferences
          </p>

          <div className="form-section">
            <label>Wait Time Alert</label>
            <div className="input-with-unit">
              <input
                type="number"
                min="0"
                max="120"
                value={formData.waitBelowMinutes}
                onChange={(e) => setFormData({ ...formData, waitBelowMinutes: e.target.value })}
                placeholder="e.g., 15"
              />
              <span className="input-unit">minutes or less</span>
            </div>
          </div>

          <div className="form-section">
            <label>Crowd Density Alert</label>
            <div className="crowd-selector">
              {['low', 'medium', 'high'].map(density => (
                <button
                  key={density}
                  type="button"
                  className={`crowd-button ${formData.crowdDensityIn.includes(density) ? 'selected' : ''}`}
                  onClick={() => toggleCrowdDensity(density)}
                >
                  {density}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label>Event Tag Alert</label>
            <select
              value={formData.eventTag}
              onChange={(e) => setFormData({ ...formData, eventTag: e.target.value })}
            >
              <option value="">Select event type...</option>
              <option value="trivia">Trivia</option>
              <option value="live_music">Live Music</option>
              <option value="sports">Sports</option>
              <option value="karaoke">Karaoke</option>
              <option value="dj">DJ</option>
              <option value="comedy">Comedy</option>
            </select>
          </div>

          <button type="submit" className="submit-alert-btn">
            Create Alert
          </button>
        </form>
      )}

      {loading ? (
        <div className="alerts-loading">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="alerts-empty">
          {venueId ? (
            <p>No alerts set for this venue. Create one to get notified!</p>
          ) : (
            <p>You don't have any alert subscriptions yet.</p>
          )}
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => (
            <div key={alert._id} className="alert-item">
              <div className="alert-info">
                {!venueId && alert.venueName && (
                  <div className="alert-venue">{alert.venueName}</div>
                )}
                <div className="alert-condition">
                  {formatCondition(alert.condition)}
                </div>
                <div className="alert-status">
                  {alert.active ? (
                    <span className="status-active">● Active</span>
                  ) : (
                    <span className="status-inactive">○ Inactive</span>
                  )}
                </div>
              </div>
              <button
                className="delete-alert-btn"
                onClick={() => handleDeleteAlert(alert._id)}
                title="Delete alert"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertManager;
