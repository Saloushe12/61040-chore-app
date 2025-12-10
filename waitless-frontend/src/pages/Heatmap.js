import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import api from '../services/api';
import GoogleMap from '../components/map/GoogleMap';
import Button from '../components/common/Button';
import './Heatmap.css';

const Heatmap = () => {
  const { location } = useGeolocation();
  const navigate = useNavigate();
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gridSize, setGridSize] = useState(10);
  const [timeWindow, setTimeWindow] = useState(60);

  useEffect(() => {
    if (location) {
      fetchHeatmapData();
    }
  }, [location, gridSize, timeWindow]);

  const fetchHeatmapData = async () => {
    if (!location) return;

    setLoading(true);
    setError('');

    try {
      // Calculate bounds around user location (roughly 5km radius)
      const radius = 0.045; // ~5km in degrees
      const minLat = location.latitude - radius;
      const maxLat = location.latitude + radius;
      const minLon = location.longitude - radius;
      const maxLon = location.longitude + radius;

      const response = await api.get('/heatmap', {
        params: {
          minLat,
          maxLat,
          minLon,
          maxLon,
          gridSize,
          timeWindowMinutes: timeWindow
        }
      });

      setHeatmapData(response.data.cells || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  };

  if (!location) {
    return (
      <div className="heatmap-page">
        <div className="heatmap-header">
          <Button onClick={() => navigate('/')}>← Back</Button>
          <h1>Activity Heatmap</h1>
        </div>
        <div className="heatmap-message">
          <p>Waiting for location access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="heatmap-page">
      <div className="heatmap-header">
        <Button onClick={() => navigate('/')}>← Back</Button>
        <h1>Activity Heatmap</h1>
      </div>

      <div className="heatmap-controls">
        <div className="control-group">
          <label>Grid Size:</label>
          <select value={gridSize} onChange={(e) => setGridSize(parseInt(e.target.value))}>
            <option value={5}>Fine (5x5)</option>
            <option value={10}>Medium (10x10)</option>
            <option value={20}>Coarse (20x20)</option>
          </select>
        </div>
        <div className="control-group">
          <label>Time Window:</label>
          <select value={timeWindow} onChange={(e) => setTimeWindow(parseInt(e.target.value))}>
            <option value={30}>Last 30 minutes</option>
            <option value={60}>Last hour</option>
            <option value={120}>Last 2 hours</option>
            <option value={240}>Last 4 hours</option>
          </select>
        </div>
        <Button onClick={fetchHeatmapData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="heatmap-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'rgba(16, 185, 129, 0.5)' }}></div>
          <span>Low Activity</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'rgba(245, 158, 11, 0.5)' }}></div>
          <span>Medium Activity</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'rgba(239, 68, 68, 0.5)' }}></div>
          <span>High Activity</span>
        </div>
      </div>

      <div className="heatmap-map-container">
        <GoogleMap
          venues={[]}
          userLocation={location}
          heatmapData={heatmapData}
        />
      </div>

      {heatmapData.length > 0 && (
        <div className="heatmap-stats">
          <p>
            Showing {heatmapData.length} grid cells with activity data
            (last {timeWindow} minutes)
          </p>
        </div>
      )}
    </div>
  );
};

export default Heatmap;

