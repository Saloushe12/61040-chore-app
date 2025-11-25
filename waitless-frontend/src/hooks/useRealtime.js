import { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';

export const useRealtime = (venueId) => {
  const { socket } = useContext(SocketContext);
  const [updates, setUpdates] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!socket || !venueId) return;

    socket.emit('subscribe-venue', venueId);

    const handleVenueUpdate = (data) => {
      setUpdates((prev) => [data, ...prev].slice(0, 10));
    };

    const handleAlert = (data) => {
      setAlerts((prev) => [data, ...prev]);
    };

    socket.on('venue-update', handleVenueUpdate);
    socket.on('alert', handleAlert);

    return () => {
      socket.emit('unsubscribe-venue', venueId);
      socket.off('venue-update', handleVenueUpdate);
      socket.off('alert', handleAlert);
    };
  }, [socket, venueId]);

  const clearAlerts = () => setAlerts([]);

  return { updates, alerts, clearAlerts };
};
