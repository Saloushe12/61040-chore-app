import React, { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { reportsService } from '../../services/reports';
import Button from '../common/Button';
import './VibeReportForm.css';

const VibeReportForm = ({ venue, onSubmit, onCancel }) => {
  const [crowdDensity, setCrowdDensity] = useState('medium');
  const [noiseLevel, setNoiseLevel] = useState('moderate');
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [musicTags, setMusicTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { location } = useGeolocation();

  const musicOptions = ['edm', 'hip_hop', 'jazz', 'rock', 'pop', 'country', 'latin', 'live_band', 'dj', 'none'];

  const toggleMusicTag = (tag) => {
    setMusicTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!location) {
      setError('Waiting for location access...');
      return;
    }

    setSubmitting(true);

    try {
      const result = await reportsService.submitVibeReport(venue._id, {
        crowdDensity,
        noiseLevel,
        energyLevel,
        musicTags,
        location
      });

      if (!result.geofence.verified) {
        setError(result.message);
      }

      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="report-form vibe-form" onSubmit={handleSubmit}>
      <h3>Report Vibe at {venue.name}</h3>

      <div className="form-group">
        <label>Crowd Density</label>
        <div className="radio-group">
          {['low', 'medium', 'high'].map((level) => (
            <label key={level} className="radio-label">
              <input
                type="radio"
                value={level}
                checked={crowdDensity === level}
                onChange={(e) => setCrowdDensity(e.target.value)}
              />
              <span className="radio-text">{level}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Noise Level</label>
        <div className="radio-group">
          {['chill', 'moderate', 'loud'].map((level) => (
            <label key={level} className="radio-label">
              <input
                type="radio"
                value={level}
                checked={noiseLevel === level}
                onChange={(e) => setNoiseLevel(e.target.value)}
              />
              <span className="radio-text">{level}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Energy Level</label>
        <div className="radio-group">
          {['low', 'medium', 'hype'].map((level) => (
            <label key={level} className="radio-label">
              <input
                type="radio"
                value={level}
                checked={energyLevel === level}
                onChange={(e) => setEnergyLevel(e.target.value)}
              />
              <span className="radio-text">{level}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Music (select all that apply)</label>
        <div className="checkbox-group">
          {musicOptions.map((tag) => (
            <label key={tag} className="checkbox-label">
              <input
                type="checkbox"
                checked={musicTags.includes(tag)}
                onChange={() => toggleMusicTag(tag)}
              />
              <span className="checkbox-text">{tag.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!location && <div className="warning-message">Waiting for location access...</div>}

      <div className="form-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={submitting || !location}
        >
          {submitting ? 'Submitting...' : 'Submit Vibe'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default VibeReportForm;
