// Copied from server/src/services/geofence.js to make src-new standalone

// Haversine formula for distance calculation between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Verify if user is within geofence radius of venue
const verifyGeofence = (userLocation, venueLocation, radiusMeters = null) => {
  const radius = radiusMeters || parseInt(process.env.GEOFENCE_RADIUS_METERS) || 100;

  // userLocation: { latitude, longitude }
  // venueLocation: { coordinates: [longitude, latitude] }
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    venueLocation.coordinates[1], // latitude
    venueLocation.coordinates[0]  // longitude
  );

  return {
    verified: distance <= radius,
    distance: Math.round(distance),
    radius,
  };
};

module.exports = { verifyGeofence, calculateDistance };


