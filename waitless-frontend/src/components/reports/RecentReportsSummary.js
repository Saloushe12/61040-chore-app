import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsService } from '../../services/reports';
import './RecentReportsSummary.css';

const RecentReportsSummary = () => {
  const [reports, setReports] = useState({ waitReports: [], vibeReports: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecentReports();
  }, []);

  const loadRecentReports = async () => {
    try {
      const data = await reportsService.getReportHistory(5); // Get last 5 reports
      setReports(data);
    } catch (err) {
      console.error('Failed to load recent reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalReports = (reports.waitReports?.length || 0) + (reports.vibeReports?.length || 0);

  if (loading || totalReports === 0) {
    return null; // Don't show if loading or no reports
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Combine and sort all reports by date
  const allReports = [
    ...(reports.waitReports || []).map(r => ({ ...r, type: 'wait' })),
    ...(reports.vibeReports || []).map(r => ({ ...r, type: 'vibe' }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);

  return (
    <div className="recent-reports-summary">
      <div className="summary-header">
        <h3>Your Recent Activity</h3>
        <button 
          className="view-all-btn"
          onClick={() => navigate('/profile')}
        >
          View All
        </button>
      </div>
      <div className="recent-reports-list">
        {allReports.map((report, idx) => (
          <div key={idx} className="recent-report-item">
            <div className="report-icon">
              {report.type === 'wait' ? '⏱️' : '🎵'}
            </div>
            <div className="report-info">
              <div className="report-venue">{report.venueName || 'Unknown Venue'}</div>
              <div className="report-detail">
                {report.type === 'wait' 
                  ? `${report.reportedWaitMinutes} min wait`
                  : `${report.crowdDensity} crowd`
                }
              </div>
            </div>
            <div className="report-time">{formatTimeAgo(report.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentReportsSummary;
