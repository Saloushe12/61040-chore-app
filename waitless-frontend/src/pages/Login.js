import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import './Login.css';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  // Password requirements
  const MIN_PASSWORD_LENGTH = 6;
  const passwordMeetsRequirements = password.length >= MIN_PASSWORD_LENGTH;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password requirements for registration
    if (isRegister && !passwordMeetsRequirements) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, displayName, 'patron');
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">WaitLess</h1>
        <p className="login-subtitle">
          {isRegister ? 'Create your account' : 'Sign in to your account'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <Input
              label="Display Name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              required={isRegister}
            />
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <div className="password-input-group">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(''); // Clear error when user types
              }}
              placeholder="Enter your password"
              required
              error={isRegister && password.length > 0 && !passwordMeetsRequirements}
            />
            {isRegister && (
              <div className="password-requirements">
                <p className="requirements-title">Password requirements:</p>
                <ul className="requirements-list">
                  <li className={password.length >= MIN_PASSWORD_LENGTH ? 'requirement-met' : 'requirement-unmet'}>
                    At least {MIN_PASSWORD_LENGTH} characters
                  </li>
                </ul>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            disabled={loading || (isRegister && !passwordMeetsRequirements)}
            className="login-button"
          >
            {loading ? 'Please wait...' : isRegister ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        <p className="toggle-text">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            className="toggle-button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setPassword(''); // Clear password when switching modes
            }}
          >
            {isRegister ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
