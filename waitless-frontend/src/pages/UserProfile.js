import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { reportsService } from '../services/reports';
import './UserProfile.css';

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState({ waitReports: [], vibeReports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('wait'); // 'wait' or 'vibe'

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await reportsService.getReportHistory(50);
      setHistory(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(err.response?.data?.error || 'Failed to load contribution history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getTotalContributions = () => {
    return (history.waitReports?.length || 0) + (history.vibeReports?.length || 0);
  };

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <div className="profile-info">
          <div className="profile-avatar">
            {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="profile-details">
            <h1>{user?.displayName || 'Anonymous User'}</h1>
            <p className="profile-email">{user?.email}</p>
            <p className="profile-role">{user?.role === 'venue_operator' ? 'Venue Operator' : 'Patron'}</p>
          </div>
        </div>
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-number">{getTotalContributions()}</div>
            <div className="stat-label">Total Contributions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{history.waitReports?.length || 0}</div>
            <div className="stat-label">Wait Reports</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{history.vibeReports?.length || 0}</div>
            <div className="stat-label">Vibe Reports</div>
          </div>
        </div>
      </div>

      <div className="contribution-history">
        <h2>Contribution History</h2>
        
        <div className="history-tabs">
          <button
            className={`history-tab ${activeTab === 'wait' ? 'active' : ''}`}
            onClick={() => setActiveTab('wait')}
          >
            Wait Reports ({history.waitReports?.length || 0})
          </button>
          <button
            className={`history-tab ${activeTab === 'vibe' ? 'active' : ''}`}
            onClick={() => setActiveTab('vibe')}
          >
            Vibe Reports ({history.vibeReports?.length || 0})
          </button>
        </div>

        {loading && <div className="loading-message">Loading history...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && (
          <div className="history-content">
            {activeTab === 'wait' && (
              <div className="wait-reports-list">
                {history.waitReports && history.waitReports.length > 0 ? (
                  history.waitReports.map((report) => (
                    <div key={report._id} className="report-card">
                      <div className="report-header">
                        <h3>{report.venueName || 'Unknown Venue'}</h3>
                        <span className="report-date">{formatDate(report.createdAt)}</span>
                      </div>
                      <div className="report-details">
                        <div className="report-metric">
                          <span className="metric-label">Wait Time:</span>
                          <span className="wait-badge">{report.reportedWaitMinutes} minutes</span>
                        </div>
                        <div className="report-status">
                          {report.geofenceVerified ? (
                            <span className="verified-badge">✓ Verified</span>
                          ) : (
                            <span className="unverified-badge">Not Verified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No wait reports yet. Visit a venue and submit your first report!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vibe' && (
              <div className="vibe-reports-list">
                {history.vibeReports && history.vibeReports.length > 0 ? (
                  history.vibeReports.map((report) => (
                    <div key={report._id} className="report-card">
                      <div className="report-header">
                        <h3>{report.venueName || 'Unknown Venue'}</h3>
                        <span className="report-date">{formatDate(report.createdAt)}</span>
                      </div>
                      <div className="report-details">
                        <div className="vibe-metrics">
                          <div className="vibe-metric">
                            <span className="metric-label">Crowd:</span>
                            <span className={`vibe-badge crowd-${report.crowdDensity}`}>
                              {report.crowdDensity}
                            </span>
                          </div>
                          <div className="vibe-metric">
                            <span className="metric-label">Noise:</span>
                            <span className={`vibe-badge noise-${report.noiseLevel}`}>
                              {report.noiseLevel}
                            </span>
                          </div>
                          <div className="vibe-metric">
                            <span className="metric-label">Energy:</span>
                            <span className={`vibe-badge energy-${report.energyLevel}`}>
                              {report.energyLevel}
                            </span>
                          </div>
                        </div>
                        {report.musicTags && report.musicTags.length > 0 && (
                          <div className="music-tags">
                            {report.musicTags.map((tag, idx) => (
                              <span key={idx} className="music-tag">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="report-status">
                          {report.geofenceVerified ? (
                            <span className="verified-badge">✓ Verified</span>
                          ) : (
                            <span className="unverified-badge">Not Verified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No vibe reports yet. Share the atmosphere at your next venue visit!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
