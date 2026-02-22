import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import api from '../utils/api';

export default function CreateAccount({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleContinueWithSpotify = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.getSpotifyAuthUrl();
      // Redirect to Spotify OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err.message || 'Failed to connect to Spotify. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Inserted the Reusable Background */}
      <AnimatedBackground />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        * {
          font-family: 'Poppins', sans-serif;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .pixel-font {
          font-family: 'Press Start 2P', cursive;
        }
      `}</style>

      {/* Back Button */}
      <button
        onClick={onBack}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f3e8ff'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#e9d5ff'}
      >
        ← Back
      </button>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Right Side - Spotify Connect */}
        <div style={styles.rightSide}>
          <h1 className="pixel-font" style={styles.title}>Create Account</h1>
          
          <p style={styles.description}>
            Connect your Spotify account to get started with Mustang Wrapped
          </p>

          {error && (
            <div style={styles.errorBanner}>
              {error}
            </div>
          )}

          {/* Continue with Spotify Button */}
          <button
            onClick={handleContinueWithSpotify}
            disabled={loading}
            style={{
              ...styles.spotifyButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#1db954')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#1ed760')}
          >
            {loading ? (
              'Connecting...'
            ) : (
              <>
                <span style={styles.spotifyIcon}>🎵</span>
                Continue with Spotify
              </>
            )}
          </button>

          <p style={styles.note}>
            You'll complete your registration after connecting Spotify
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #d8b4fe, #c084fc, #a855f7)',
    padding: '40px 20px',
    position: 'relative',
    overflow: 'auto',
  },
  backButton: {
    position: 'absolute',
    top: '30px',
    right: '30px',
    backgroundColor: '#e9d5ff',
    color: '#6b21a8',
    fontSize: '18px',
    fontWeight: '600',
    padding: '12px 24px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    zIndex: 20, // Ensured back button is clickable above the background
  },
  mainContent: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingTop: '40px',
    minHeight: 'calc(100vh - 80px)',
  },
  rightSide: {
    maxWidth: '600px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 20px',
  },
  title: {
    fontSize: '48px',
    color: 'white',
    marginBottom: '20px',
    textShadow: '3px 3px 0px rgba(0, 0, 0, 0.3)',
  },
  description: {
    fontSize: '18px',
    color: 'white',
    marginBottom: '30px',
    textShadow: '2px 2px 0px rgba(0, 0, 0, 0.2)',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '10px',
    marginBottom: '20px',
    width: '100%',
    fontSize: '14px',
  },
  spotifyButton: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#1ed760',
    color: 'white',
    fontSize: '22px',
    fontWeight: 'bold',
    padding: '20px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s',
    marginBottom: '15px',
  },
  spotifyIcon: {
    fontSize: '28px',
  },
  note: {
    fontSize: '14px',
    color: 'white',
    opacity: 0.9,
    marginTop: '10px',
  },
  inputGroup: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    color: 'white',
    fontSize: '18px',
    marginBottom: '10px',
    textShadow: '2px 2px 0px rgba(0, 0, 0, 0.2)',
  },
  input: {
    width: '100%',
    padding: '16px 20px',
    borderRadius: '12px',
    fontSize: '16px',
    border: 'none',
    outline: 'none',
    color: '#1f2937',
  },
  hint: {
    color: 'white',
    fontSize: '13px',
    marginTop: '8px',
    lineHeight: '1.6',
  },
  createButton: {
    width: '100%',
    maxWidth: '250px',
    backgroundColor: '#9333ea',
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    padding: '16px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '20px',
    float: 'right',
  },
};