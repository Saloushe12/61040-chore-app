import React, { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { venuesService } from '../../services/venues';
import Button from '../common/Button';
import './AddVenueForm.css';

const VENUE_TAGS = ['bar', 'club', 'restaurant', 'lounge', 'pub', 'brewery', 'other'];

const AddVenueForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    tags: [],
    hours: {
      monday: { open: '', close: '' },
      tuesday: { open: '', close: '' },
      wednesday: { open: '', close: '' },
      thursday: { open: '', close: '' },
      friday: { open: '', close: '' },
      saturday: { open: '', close: '' },
      sunday: { open: '', close: '' }
    },
    coverCharge: '',
    minAge: '',
    capacity: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { location } = useGeolocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagToggle = (tag) => {
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
          ...prev.hours[day],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setSubmitting(true);

    try {
      // Use location if available, otherwise use a default location (0,0 as placeholder)
      // In production, you might want to geocode the address instead
      const latitude = location ? location.latitude : 0;
      const longitude = location ? location.longitude : 0;

      // Build hours object, only including days with both open and close times
      const hours = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        if (formData.hours[day].open && formData.hours[day].close) {
          hours[day] = {
            open: formData.hours[day].open,
            close: formData.hours[day].close
          };
        }
      });

      const venueData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: latitude,
        longitude: longitude,
        tags: formData.tags,
        hours: Object.keys(hours).length > 0 ? hours : undefined,
        staticAttributes: {
          ...(formData.coverCharge && { coverCharge: parseFloat(formData.coverCharge) }),
          ...(formData.minAge && { minAge: parseInt(formData.minAge) }),
          ...(formData.capacity && { capacity: parseInt(formData.capacity) })
        }
      };

      const venue = await venuesService.createVenue(venueData);
      onSubmit(venue);
      
      // Reset form
      setFormData({
        name: '',
        address: '',
        tags: [],
        hours: {
          monday: { open: '', close: '' },
          tuesday: { open: '', close: '' },
          wednesday: { open: '', close: '' },
          thursday: { open: '', close: '' },
          friday: { open: '', close: '' },
          saturday: { open: '', close: '' },
          sunday: { open: '', close: '' }
        },
        coverCharge: '',
        minAge: '',
        capacity: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create venue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="add-venue-form" onSubmit={handleSubmit}>
      <h3>Add New Venue</h3>

      <div className="form-group">
        <label>
          Venue Name <span className="required">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Enter venue name"
        />
      </div>

      <div className="form-group">
        <label>
          Address <span className="required">*</span>
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
          placeholder="Enter full address"
        />
      </div>

      <div className="form-group">
        {location ? (
          <div className="location-info">
            <small>📍 Using your current location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</small>
          </div>
        ) : (
          <div className="location-info">
            <small>📍 Location will be set to default coordinates. Enable location access for accurate positioning.</small>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Venue Type (select all that apply)</label>
        <div className="tag-selector">
          {VENUE_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              className={`tag-btn ${formData.tags.includes(tag) ? 'active' : ''}`}
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Operating Hours (optional)</label>
        <small style={{ display: 'block', marginBottom: '12px', color: '#6b7280' }}>
          Enter opening and closing times for each day (24-hour format, e.g., 17:00, 02:00)
        </small>
        <div className="hours-grid">
          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
            <div key={day} className="hours-row">
              <label className="day-label">{day.charAt(0).toUpperCase() + day.slice(1)}</label>
              <div className="hours-inputs">
                <input
                  type="time"
                  value={formData.hours[day].open}
                  onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                  placeholder="Open"
                />
                <span className="hours-separator">-</span>
                <input
                  type="time"
                  value={formData.hours[day].close}
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
            step="0.01"
            min="0"
            name="coverCharge"
            value={formData.coverCharge}
            onChange={handleChange}
            placeholder="Optional"
          />
        </div>

        <div className="form-group">
          <label>Minimum Age</label>
          <input
            type="number"
            min="18"
            max="21"
            name="minAge"
            value={formData.minAge}
            onChange={handleChange}
            placeholder="Optional"
          />
        </div>

        <div className="form-group">
          <label>Capacity</label>
          <input
            type="number"
            min="1"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            placeholder="Optional"
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Add Venue'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default AddVenueForm;

