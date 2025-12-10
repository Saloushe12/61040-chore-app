import React, { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import './AlertNotification.css';

const AlertNotification = () => {
  const { socket } = useContext(SocketContext);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const handleAlert = (alertData) => {
      const newAlert = {
        id: Date.now(),
        ...alertData,
        timestamp: new Date()
      };
      setAlerts((prev) => [...prev, newAlert]);

      // Play notification sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        // Audio not supported or blocked
      }

      // Auto-remove alert after 10 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, 10000);
    };

    socket.on('alert', handleAlert);

    return () => {
      socket.off('alert', handleAlert);
    };
  }, [socket, navigate]);

  const handleDismiss = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleClick = (alert) => {
    if (alert.venueId) {
      navigate(`/venue/${alert.venueId}`);
    }
    handleDismiss(alert.id);
  };

  return (
    <div className="alert-notifications">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="alert-notification"
          onClick={() => handleClick(alert)}
        >
          <div className="alert-icon">🔔</div>
          <div className="alert-content">
            <div className="alert-title">{alert.venueName || 'Alert'}</div>
            <div className="alert-message">{alert.message}</div>
          </div>
          <button
            className="alert-dismiss"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss(alert.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertNotification;

