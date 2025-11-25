import React, { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { reportsService } from '../../services/reports';
import Button from '../common/Button';
import './WaitReportForm.css';

const WaitReportForm = ({ venue, onSubmit, onCancel }) => {
  const [waitMinutes, setWaitMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { location } = useGeolocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!location) {
      setError('Waiting for location access...');
      return;
    }

    setSubmitting(true);

    try {
      const result = await reportsService.submitWaitReport(venue._id, {
        reportedWaitMinutes: parseInt(waitMinutes),
        location
      });

      if (!result.geofence.verified) {
        setError(result.message);
      }

      onSubmit();
      setWaitMinutes('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <h3>Report Wait Time at {venue.name}</h3>

      <div className="form-group">
        <label>Wait Time (minutes)</label>
        <input
          type="number"
          min="0"
          max="300"
          value={waitMinutes}
          onChange={(e) => setWaitMinutes(e.target.value)}
          required
          placeholder="Enter wait time in minutes"
        />
        <small>How long is the current wait to get in?</small>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!location && <div className="warning-message">Waiting for location access...</div>}

      <div className="form-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={submitting || !location}
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default WaitReportForm;
