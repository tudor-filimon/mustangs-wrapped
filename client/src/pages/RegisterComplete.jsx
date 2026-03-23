import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AnimatedBackground from '../components/AnimatedBackground';
import Avatar from './Avatar'; // Implemented the Avatar component!
import '../components/styles.css';

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
  
  // NEW: State to toggle the Avatar Builder Fullscreen mode
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
  
  const [registrationToken, setRegistrationToken] = useState('fake-token-for-styling');

    useEffect(() => {
       const token = searchParams.get('token');
       const errorParam = searchParams.get('error');


      if (errorParam) {
        let errorMessage = 'Registration failed';
        switch (errorParam) {
          case 'spotify_already_linked': errorMessage = 'This Spotify account is already linked to another Western account'; break;
          case 'spotify_auth_failed': errorMessage = 'Spotify authentication failed. Please try again.'; break;
          case 'invalid_state':
          case 'no_code': errorMessage = 'Invalid registration session. Please start over.'; break;
          default: errorMessage = `Error: ${errorParam}`;
        }
        setError(errorMessage);
        return;
      }

      if (!token) {
        setError('Missing registration token. Please start the registration process again.');
        return;
      }

      setRegistrationToken(token);
      api.getTempToken(token).catch(() => setError('Invalid or expired registration token. Please start over.'));

      }, [searchParams]);

    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => setProfilePic(e.target.result);
        reader.readAsDataURL(file);
      }
    };

    const handleSubmit = async () => {
      setError('');

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
        email, password, displayName, classYear: parseInt(classYear), faculty, major, avatarUrl: profilePic, registrationToken
      });

      if (result.success) {
        if (!result.data?.session) {
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

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSubmit(); };

  if (error && !registrationToken) {
    return (
      <div style={styles.container}>
        <AnimatedBackground />
        <div style={styles.mainContent}>
          <div style={styles.errorBox}>
            <h2 style={{ color: '#ef4444', fontSize: '24px', marginBottom: '15px' }}>Registration Error</h2>
            <p style={{ color: 'white', marginBottom: '20px' }}>{error}</p>
            <button onClick={() => navigate('/')} style={styles.backButton}>Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  // IF THEY CLICK "CUSTOMIZE AVATAR", WE MOUNT THE BUILDER HERE INSTEAD OF THE FORM!
  if (showAvatarBuilder) {
    return (
      <Avatar 
        isRegistrationMode={true} 
        onSaveOverride={(generatedDataUrl) => {
          setProfilePic(generatedDataUrl); // Saves the image back to the registration form!
          setShowAvatarBuilder(false); // Closes the builder
        }}
        onBackOverride={() => setShowAvatarBuilder(false)} // Safe exit
      />
    );
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />

      <div style={styles.mainContent}>
        <h1 style={styles.title}>Complete Your Profile</h1>

        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        <div style={styles.formCard}>
          {/* Left Side - Avatar Upload */}
          <div style={styles.leftSide}>
            <div style={styles.profilePicContainer}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '4rem' }}>👤</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button 
                onClick={() => setShowAvatarBuilder(true)} 
                style={styles.uploadButton}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.9)'} 
                onMouseLeave={(e) => e.target.style.background = 'white'}
              >
                Customize Avatar
              </button>
              
              <label 
                style={{ ...styles.uploadButton, background: 'transparent', border: '1px solid #a78bfa', color: '#a78bfa' }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(167, 139, 250, 0.1)'} 
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                Or Upload Photo
              </label>
            </div>
          </div>

          {/* Right Side - Form Inputs */}
          <div style={styles.rightSide}>
            <div style={styles.inputGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>UWO Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyPress={handleKeyPress} placeholder="name@uwo.ca" style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Display Name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} onKeyPress={handleKeyPress} placeholder="Your Name" style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Class Year</label>
                <input type="number" value={classYear} onChange={(e) => setClassYear(e.target.value)} onKeyPress={handleKeyPress} placeholder="e.g. 2025" min="2020" max="2030" style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Faculty</label>
                <input type="text" value={faculty} onChange={(e) => setFaculty(e.target.value)} onKeyPress={handleKeyPress} placeholder="e.g. Science" style={styles.input} />
              </div>
              <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Major</label>
                <input type="text" value={major} onChange={(e) => setMajor(e.target.value)} onKeyPress={handleKeyPress} placeholder="e.g. Computer Science" style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={handleKeyPress} placeholder="••••••••" style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyPress={handleKeyPress} placeholder="••••••••" style={styles.input} />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...styles.createButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
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
    position: 'relative',
    overflow: 'auto',
    fontFamily: "'Inter', sans-serif"
  },
  mainContent: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    minHeight: '100vh',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  title: {
    fontSize: '3rem',
    color: 'white',
    marginBottom: '40px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    textAlign: 'center',
    textShadow: '0 4px 15px rgba(0,0,0,0.3)'
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '30px',
    width: '100%',
    textAlign: 'center',
    fontWeight: 'bold',
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
  },
  errorBox: {
    background: 'rgba(13, 6, 38, 0.9)',
    border: '1px solid #ef4444',
    borderRadius: '24px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
  },
  backButton: {
    background: 'white',
    color: '#1f1041',
    fontWeight: 'bold',
    padding: '12px 24px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '10px'
  },
  formCard: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '50px',
    width: '100%',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '50px',
    borderRadius: '30px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
    justifyContent: 'center'
  },
  leftSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  profilePicContainer: {
    width: '220px',
    height: '220px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '2px dashed rgba(255,255,255,0.5)',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadButton: {
    width: '100%',
    backgroundColor: 'white',
    color: '#1f1041',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '14px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    display: 'block',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  rightSide: {
    flex: 1,
    minWidth: '300px',
  },
  inputGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '12px',
    fontSize: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    outline: 'none',
    color: 'white',
    fontFamily: "'Inter', sans-serif",
    transition: 'border 0.2s ease'
  },
  createButton: {
    width: '100%',
    backgroundColor: '#a78bfa',
    color: '#1f1041',
    fontSize: '18px',
    fontWeight: '900',
    padding: '18px',
    borderRadius: '50px',
    border: 'none',
    marginTop: '35px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(167, 139, 250, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
};