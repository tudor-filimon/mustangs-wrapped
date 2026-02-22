import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AnimatedBackground from '../components/AnimatedBackground';

export default function RegisterComplete() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [classYear, setClassYear] = useState('');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationToken, setRegistrationToken] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      let errorMessage = 'Registration failed';
      switch (errorParam) {
        case 'spotify_already_linked':
          errorMessage = 'This Spotify account is already linked to another Western account';
          break;
        case 'spotify_auth_failed':
          errorMessage = 'Spotify authentication failed. Please try again.';
          break;
        case 'invalid_state':
        case 'no_code':
          errorMessage = 'Invalid registration session. Please start over.';
          break;
        default:
          errorMessage = `Error: ${errorParam}`;
      }
      setError(errorMessage);
      return;
    }

    if (!token) {
      setError('Missing registration token. Please start the registration process again.');
      return;
    }

    setRegistrationToken(token);

    // Verify token is valid
    api.getTempToken(token)
      .then(() => {
        // Token is valid, show form
      })
      .catch((err) => {
        setError('Invalid or expired registration token. Please start over.');
      });
  }, [searchParams]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePic(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!email || !password || !confirmPassword || !displayName || !classYear || !faculty || !major) {
      setError('Please fill in all required fields');
      return;
    }

    if (!email.toLowerCase().endsWith('@uwo.ca')) {
      setError('Please use your Western University email (@uwo.ca)');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!registrationToken) {
      setError('Registration session expired. Please start over.');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        email,
        password,
        displayName,
        classYear: parseInt(classYear),
        faculty,
        major,
        avatarUrl: profilePic,
        registrationToken
      });

      if (result.success) {
        // If registration returned session, we're already logged in
        // Otherwise, try to auto-login
        if (!result.data?.session) {
          // Auto-login after registration
          const loginResult = await login(email, password);
          if (!loginResult.success) {
            setError('Account created but login failed. Please log in manually.');
            return;
          }
        }
        navigate('/home');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (error && !registrationToken) {
    return (
      <div style={styles.container}>
        <AnimatedBackground />
        <div style={styles.mainContent}>
          <div style={styles.errorBox}>
            <h2 style={styles.errorTitle}>Registration Error</h2>
            <p style={styles.errorMessage}>{error}</p>
            <button
              onClick={() => navigate('/')}
              style={styles.backButton}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
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

      <div style={styles.mainContent}>
        <h1 className="pixel-font" style={styles.title}>Complete Your Registration</h1>

        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        <div style={styles.formContainer}>
          {/* Left Side - Profile Picture */}
          <div style={styles.leftSide}>
            <div style={styles.profilePicContainer}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" style={styles.profilePicImage} />
              ) : (
                <div style={styles.profilePicPlaceholder}>
                  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                    <circle cx="60" cy="45" r="25" fill="#6b21a8" />
                    <path d="M20 100c0-22 18-40 40-40s40 18 40 40" fill="#6b21a8" />
                  </svg>
                </div>
              )}
            </div>

            <label style={styles.uploadButton}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={styles.fileInput}
              />
              📤 Upload
            </label>
          </div>

          {/* Right Side - Form */}
          <div style={styles.rightSide}>
            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>UWO Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="yourname@uwo.ca"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>Display Name:</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="enter your display name"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>Class Year:</label>
              <input
                type="number"
                value={classYear}
                onChange={(e) => setClassYear(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 2025"
                style={styles.input}
                min="2020"
                max="2030"
              />
            </div>

            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>Faculty:</label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., Science, Engineering"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>Major:</label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., Computer Science"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="enter a password"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>Confirm Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="confirm your password"
                style={styles.input}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...styles.createButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
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
  mainContent: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 80px)',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '48px',
    color: 'white',
    marginBottom: '30px',
    textShadow: '3px 3px 0px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '10px',
    marginBottom: '20px',
    maxWidth: '800px',
    width: '100%',
  },
  errorBox: {
    backgroundColor: '#9333ea',
    borderRadius: '30px',
    padding: '40px',
    maxWidth: '500px',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: '24px',
    color: 'white',
    marginBottom: '15px',
  },
  errorMessage: {
    fontSize: '16px',
    color: 'white',
    marginBottom: '20px',
  },
  formContainer: {
    display: 'flex',
    gap: '60px',
    width: '100%',
    maxWidth: '1200px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  leftSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  profilePicContainer: {
    width: '280px',
    height: '280px',
    backgroundColor: '#e9d5ff',
    borderRadius: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profilePicPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  uploadButton: {
    width: '280px',
    backgroundColor: '#e9d5ff',
    color: '#1f2937',
    fontSize: '18px',
    fontWeight: '700',
    padding: '18px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    display: 'block',
  },
  fileInput: {
    display: 'none',
  },
  rightSide: {
    flex: 1,
    maxWidth: '600px',
    minWidth: '300px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    color: 'white',
    fontSize: '14px',
    marginBottom: '8px',
    textShadow: '2px 2px 0px rgba(0, 0, 0, 0.2)',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '12px',
    fontSize: '16px',
    border: 'none',
    outline: 'none',
    color: '#1f2937',
  },
  createButton: {
    width: '100%',
    backgroundColor: '#9333ea',
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    padding: '16px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '20px',
  },
  backButton: {
    backgroundColor: '#e9d5ff',
    color: '#6b21a8',
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 24px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
  },
};
