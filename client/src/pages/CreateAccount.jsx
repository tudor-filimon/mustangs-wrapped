import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import api from '../utils/api';
import '../components/styles.css';

export default function CreateAccount({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleContinueWithSpotify = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.getSpotifyAuthUrl();
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err.message || 'Failed to connect to Spotify. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <AnimatedBackground />

      <button
        onClick={onBack || (() => navigate(-1))}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
      >
        ← Back
      </button>

      <div style={styles.mainContent}>
        <div style={styles.card}>
          <h1 style={styles.title}>Create Account</h1>
          
          <p style={styles.description}>
            Connect your Spotify account to sync your music profile with Mustang Wrapped.
          </p>

          {error && (
            <div style={styles.errorBanner}>
              {error}
            </div>
          )}

          <button
            onClick={handleContinueWithSpotify}
            disabled={loading}
            style={{
              ...styles.spotifyButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loading ? (
              'Connecting...'
            ) : (
              <>
                {/* SVG Icon via CSS Class */}
                <span className="icon-spotify-auth" />
                Continue with Spotify
              </>
            )}
          </button>

          <p style={styles.note}>
            You'll complete your profile details on the next screen.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif"
  },
  backButton: {
    position: 'absolute',
    top: '30px',
    left: '40px', // Moved to left to match Homepage pill buttons
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#1f1041',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '12px 24px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    zIndex: 20,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  mainContent: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '24px',
    padding: '50px 40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
  },
  title: {
    fontSize: '2.5rem',
    color: 'white',
    marginBottom: '15px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  description: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '35px',
    lineHeight: '1.5'
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  spotifyButton: {
    width: '100%',
    backgroundColor: '#1db954',
    color: '#1f1041',
    fontSize: '18px',
    fontWeight: '900',
    padding: '16px',
    borderRadius: '50px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(29, 185, 84, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  note: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    marginTop: '20px',
  },
};