import React, { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { reportsService } from '../../services/reports';
import Button from '../common/Button';
import './WaitReportForm.css';

const WaitReportForm = ({ venue, onSubmit, onCancel }) => {
  const [waitMinutes, setWaitMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState(false);
  const { location } = useGeolocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!location) {
      setError('Waiting for location access...');
      return;
    }

    // Validate wait minutes
    const waitMinutesNum = parseInt(waitMinutes, 10);
    if (isNaN(waitMinutesNum) || waitMinutesNum < 0 || waitMinutesNum > 300) {
      setError('Wait time must be a number between 0 and 300 minutes');
      return;
    }

    setSubmitting(true);

    try {
      setError('');
      setWarning('');
      const result = await reportsService.submitWaitReport(venue._id || venue.venueId, {
        reportedWaitMinutes: waitMinutesNum,
        location
      });

      if (!result.geofence.verified) {
        // Report was saved but not verified - show warning, don't auto-close
        setWarning(
          `⚠️ Report saved, but you're ${result.geofence.distance}m away from the venue (max ${result.geofence.radius}m). ` +
          `This report won't be included in metrics. Please move closer to the venue and try again.`
        );
        // Don't call onSubmit() here - let user see the warning
        return;
      }

      // Success - verified report
      setSuccess(true);
      setTimeout(() => {
        onSubmit();
        setWaitMinutes('');
        setSuccess(false);
      }, 1500); // Show success message briefly before closing
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
      {warning && <div className="warning-message">{warning}</div>}
      {success && <div className="success-message">✓ Report submitted successfully! Your wait time will appear in metrics.</div>}

      {!location && <div className="warning-message">Waiting for location access...</div>}

      <div className="form-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={submitting || !location || success}
        >
          {submitting ? 'Submitting...' : success ? 'Submitted!' : 'Submit Report'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default WaitReportForm;
