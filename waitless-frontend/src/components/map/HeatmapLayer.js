import { useEffect } from 'react';
import api from '../../services/api';

const HeatmapLayer = ({ map, bounds, enabled }) => {
  useEffect(() => {
    if (!map || !enabled || !bounds || !window.google) return;

    let heatmap = null;

    const loadHeatmapData = async () => {
      try {
        const { north, south, east, west } = bounds;
        const response = await api.get('/heatmap', {
          params: { north, south, east, west }
        });

        const { gridCells } = response.data;
        
        if (!gridCells || gridCells.length === 0) return;

        // Convert grid cells to heatmap data points
        const heatmapData = gridCells.map(cell => ({
          location: new window.google.maps.LatLng(cell.lat, cell.lon),
          weight: cell.activityScore
        }));

        // Create or update heatmap
        if (heatmap) {
          heatmap.setMap(null);
        }

        heatmap = new window.google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: map,
          radius: 30,
          opacity: 0.6,
          gradient: [
            'rgba(0, 255, 255, 0)',
            'rgba(0, 255, 255, 1)',
            'rgba(0, 191, 255, 1)',
            'rgba(0, 127, 255, 1)',
            'rgba(0, 63, 255, 1)',
            'rgba(0, 0, 255, 1)',
            'rgba(0, 0, 223, 1)',
            'rgba(0, 0, 191, 1)',
            'rgba(0, 0, 159, 1)',
            'rgba(0, 0, 127, 1)',
            'rgba(63, 0, 91, 1)',
            'rgba(127, 0, 63, 1)',
            'rgba(191, 0, 31, 1)',
            'rgba(255, 0, 0, 1)'
          ]
        });
      } catch (error) {
        console.error('Failed to load heatmap data:', error);
      }
    };

    loadHeatmapData();

    return () => {
      if (heatmap) {
        heatmap.setMap(null);
      }
    };
  }, [map, bounds, enabled]);

  return null; // This component doesn't render anything
};

export default HeatmapLayer;
