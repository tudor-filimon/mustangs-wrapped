import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateAccount from './CreateAccount';
import AnimatedBackground from '../components/AnimatedBackground';
import { useAuth } from '../context/AuthContext';

export default function MustangWrappedLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in both email and password');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(email, password);

    if (result.success) {
      navigate('/home');
    } else {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  const goToCreateAccount = () => {
    setShowCreateAccount(true);
  };

  const goBackToLogin = () => {
    setShowCreateAccount(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Define the custom floating text for the background
  const loginFloatingText = [
    <span style={{ ...styles.tagline, whiteSpace: 'nowrap' }}>Listen Local.</span>,
    <span style={{ ...styles.tagline, whiteSpace: 'nowrap' }}>
      Sync Your <span style={styles.purple}>Semester.</span>
    </span>,
    <span style={{ ...styles.tagline, whiteSpace: 'nowrap' }}>
      Campus, <span style={styles.white}>Amplified</span>
    </span>,
    <span style={{ ...styles.tagline, whiteSpace: 'nowrap' }}>
      Your Major. <span style={styles.purpleLight}>Your Music.</span>
    </span>
  ];

  if (showCreateAccount) {
    return <CreateAccount onBack={goBackToLogin} />;
  }

  return (
    <div style={styles.container}>
      {/* Pass the custom text items to the background */}
      <AnimatedBackground customItems={loginFloatingText} />
      
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

        /* Added class for placeholder color support */
        .login-input::placeholder {
            color: #9065bc;
            opacity: 1;
        }
      `}</style>

      {/* Main content */}
      <div style={styles.mainContent}>
        {/* Title */}
        <h1 className="pixel-font" style={styles.title}>
          Mustang Wrapped
        </h1>

        {/* Login Form */}
        <div style={styles.formBox}>
          <div style={styles.formHeader}>
            <span style={styles.horseIcon}>
              <img src="src\assets\images\horseIcon.svg" alt="Horse Icon" style={styles.iconImage} />
            </span>
            <h2 className="pixel-font" style={styles.formTitle}>
              Login
            </h2>
          </div>

          <div>
            {error && (
              <div style={styles.errorBanner}>
                {error}
              </div>
            )}

            {/* Email Input */}
            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="enter your email"
                className="login-input"
                style={styles.input}
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>
                Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="enter your password"
                className="login-input"
                style={styles.input}
                disabled={loading}
              />
            </div>

            {/* Login Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#f3e8ff')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = 'white')}
            >
              <span style={{...styles.horseIcon, width: '30px', height: '30px', marginRight: '10px'}}>
                <img src="src\assets\images\WesternMustangLogo1.svg" alt="Western Logo" style={styles.iconImage} />
              </span>
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {/* New Here Button */}
            <button
              onClick={goToCreateAccount}
              className="pixel-font"
              style={styles.toggleButton}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e9d5ff'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ddd6fe'}
            >
              New Here?
            </button>
          </div>
        </div>

        {/* Bottom Text */}
        <div style={styles.bottomText}>
          <p style={styles.tagline}>Listen Local.</p>
          <p style={styles.tagline}>
            Sync Your <span style={styles.purple}>Semester.</span>
          </p>
          <p style={styles.tagline}>
            Campus, <span style={styles.white}>Amplified</span>
          </p>
          <p style={styles.tagline}>
            Your Major. <span style={styles.purpleLight}>Your Music.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1f1041 0%, #9065bc 100%)',
    position: 'relative',
    overflow: 'auto',
    fontFamily: "'Jersey 25', sans-serif",
  },
  mainContent: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  title: {
    fontSize: '85px',
    fontWeight: 400,
    color: 'white',
    marginBottom: '80px',
    textAlign: 'center',
    fontFamily: "'Jersey 25', sans-serif",
    textShadow: "0 0 7px #fff, 0 0 10px  #bc13fe, 0 0 82px #bc13fe,0 0 92px #bc13fe",
    textTransform: "uppercase",
    WebkitTextStroke:" 8px black",
    paintOrder: "stroke fill",
    letterSpacing: "0.4em",
  },
  formBox: {
    backgroundColor: '#9333ea',
    borderRadius: '30px',
    padding: '40px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '4px solid #7e22ce',
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '35px',
  },
  horseIcon: {
    marginRight: '15px',
    width: '40px',
    height: '40px',
    display: 'flex', 
    justifyContent: 'center',
    alignItems: 'center',
    background: 'auto'
  },
  iconImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  formTitle: {
    fontSize: '35px',
    fontWeight: 'bold',
    fontFamily: "'Jersey 25', sans-serif",
    color: "#fdfdfd",
    textShadow: " 0 0 10px  #bc13fe, 0 0 82px #bc13fe,0 0 92px #bc13fe",
    textTransform: "uppercase",
    paintOrder: "stroke fill",
    letterSpacing: "0.4em",
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    fontSize: '25px',
    marginBottom: '12px',
    fontFamily: "'Jersey 25', sans-serif",
    color: "#e6dbf1",
    textShadow: "  0 0 10px #bc13fe, 0 0 82px #bc13fe,0 0 92px #bc13fe",
    textTransform: "uppercase",
    paintOrder: "stroke fill",
    letterSpacing: "0.4em",
    fontWeight: "40px",
  },
  input: {
    width: '100%',
    padding: '18px 20px',
    borderRadius: '12px',
    fontSize: '18px',
    border: '2px solid #c084fc',
    outline: 'none',
    color: '#9065bc',
  },
  toggleButton: {
    width: '100%',
    backgroundColor: '#ddd6fe',
    color: '#6b21a8',
    padding: '20px',
    borderRadius: '18px',
    border: '3px solid rgba(147, 51, 234, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Jersey 25', sans-serif",
    fontSize: "20px",
    marginTop: '10px',
    textShadow: " 0 0 100px #ffffff,0 0 92px #250333",
    textTransform: "uppercase",
    paintOrder: "stroke fill",
    letterSpacing: "0.4em",
    fontWeight: "40px",
  },
  submitButton: {
    width: '100%',
    backgroundColor: 'white',
    color: '#9333ea',
    textShadow: "  0 0 10px #bc13fe, 0 0 82px #bc13fe,0 0 92px #bc13fe",
    textTransform: "uppercase",
    paintOrder: "stroke fill",
    letterSpacing: "0.4em",
    fontWeight: "40px",
    padding: '18px',
    borderRadius: '18px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '15px',
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomText: {
    marginTop: '80px',
    textAlign: 'center',
  },
  tagline: {
    fontSize: '30px',
    fontWeight: 'bold',
    color: 'black',
    marginBottom: '10px',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  purple: {
    color: '#7e22ce',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  white: {
    color: 'white',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
  },
  purpleLight: {
    color: '#d8b4fe',
  },
};