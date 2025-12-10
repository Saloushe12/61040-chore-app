import React from 'react';
import { useNavigate } from 'react-router-dom';
import AlertManager from '../components/alerts/AlertManager';
import Button from '../components/common/Button';
import './Alerts.css';

const Alerts = () => {
  const navigate = useNavigate();

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <h1>Alert Management</h1>
        <Button onClick={() => navigate('/')}>← Back to Home</Button>
      </div>
      <AlertManager />
    </div>
  );
};

export default Alerts;

