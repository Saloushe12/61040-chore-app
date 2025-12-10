import { useEffect, useRef } from 'react';
import api from '../../services/api';

const HeatmapLayer = ({ map, bounds, enabled }) => {
  const heatmapRef = useRef(null);

  useEffect(() => {
    // Check if visualization library is loaded
    if (!map || !enabled || !bounds || !window.google || !window.google.maps || !window.google.maps.visualization) {
      console.log('HeatmapLayer: Missing requirements', {
        map: !!map,
        enabled,
        bounds: !!bounds,
        google: !!window.google,
        visualization: !!(window.google?.maps?.visualization)
      });
      return;
    }

    const loadHeatmapData = async () => {
      try {
        const { north, south, east, west } = bounds;
        console.log('Loading heatmap data for bounds:', { north, south, east, west });
        
        // Convert bounds to the format expected by the backend
        const response = await api.get('/heatmap', {
          params: {
            minLat: south,
            maxLat: north,
            minLon: west,
            maxLon: east
          }
        });

        console.log('Heatmap API response:', response.data);

        // Backend returns 'cells', not 'gridCells'
        const cells = response.data.cells || response.data.gridCells || [];
        
        if (!cells || cells.length === 0) {
          console.log('No heatmap data available for this area');
          // Clear existing heatmap if no data
          if (heatmapRef.current) {
            heatmapRef.current.setMap(null);
            heatmapRef.current = null;
          }
          return;
        }

        // Convert grid cells to heatmap data points
        // Backend returns cells with centerLat/centerLon, or lat/lon
        const heatmapData = cells.map(cell => {
          const lat = cell.centerLat || cell.lat;
          const lon = cell.centerLon || cell.lon;
          const weight = cell.activityScore || 1;
          
          if (lat === undefined || lon === undefined) {
            console.warn('Invalid cell data:', cell);
            return null;
          }
          
          return {
            location: new window.google.maps.LatLng(lat, lon),
            weight: weight
          };
        }).filter(point => point !== null);

        if (heatmapData.length === 0) {
          console.log('No valid heatmap data points after processing');
          if (heatmapRef.current) {
            heatmapRef.current.setMap(null);
            heatmapRef.current = null;
          }
          return;
        }

        console.log(`Creating heatmap with ${heatmapData.length} data points`);

        // Clear existing heatmap
        if (heatmapRef.current) {
          heatmapRef.current.setMap(null);
          heatmapRef.current = null;
        }

        // Create new heatmap
        try {
          heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: map,
            radius: 50, // Increased radius for better visibility
            opacity: 0.7, // Increased opacity
            gradient: [
              'rgba(102, 194, 255, 0)',      // Transparent blue
              'rgba(102, 194, 255, 0.2)',    // Light blue
              'rgba(0, 123, 255, 0.4)',      // Blue
              'rgba(0, 86, 179, 0.6)',       // Darker blue
              'rgba(255, 193, 7, 0.8)',      // Yellow
              'rgba(255, 152, 0, 0.9)',      // Orange
              'rgba(255, 87, 34, 1)',        // Deep orange
              'rgba(244, 67, 54, 1)'         // Red
            ]
          });
          console.log('Heatmap created successfully');
        } catch (error) {
          console.error('Error creating heatmap layer:', error);
        }
      } catch (error) {
        console.error('Failed to load heatmap data:', error);
        if (error.response) {
          console.error('API error response:', error.response.data);
        }
        // Clear heatmap on error
        if (heatmapRef.current) {
          heatmapRef.current.setMap(null);
          heatmapRef.current = null;
        }
      }
    };

    loadHeatmapData();

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
    };
  }, [map, bounds, enabled]);

  return null; // This component doesn't render anything
};

export default HeatmapLayer;
