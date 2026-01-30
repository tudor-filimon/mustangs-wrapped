import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateAccount from './CreateAccount';
import AnimatedBackground from '../components/AnimatedBackground'; 

export default function MustangWrappedLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!email || !password) {
      alert('Please fill in both email and password');
      return;
    }
    console.log('Login submitted:', { email, password });
    // alert(`Login attempted with email: ${email}`);
    navigate('/home');
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

  if (showCreateAccount) {
    return <CreateAccount onBack={goBackToLogin} />;
  }

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

      {/* Main content */}
      <div style={styles.mainContent}>
        {/* Title */}
        <h1 className="pixel-font" style={styles.title}>
          Mustang Wrapped
        </h1>

        {/* Login Form */}
        <div style={styles.formBox}>
          <div style={styles.formHeader}>
            <span style={styles.horseIcon}><img src="src\assets\images\horseIcon.svg" alt="Horse Icon" /></span>
            <h2 className="pixel-font" style={styles.formTitle}>
              Login
            </h2>
          </div>

          <div>
            {/* Email Input */}
            <div style={styles.inputGroup}>
              <label className="pixel-font" style={styles.label}>
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="enter your email"
                style={styles.input}
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
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="enter your password"
                style={styles.input}
              />
            </div>

            {/* Login Button */}
            <button
              onClick={handleSubmit}
              style={styles.submitButton}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f3e8ff'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              🐴 Login
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
    background: 'linear-gradient(to bottom right, #d8b4fe, #c084fc, #a855f7)',
    position: 'relative',
    overflow: 'auto',
    fontFamily: "'Poppins', sans-serif",
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
    fontSize: '70px',
    fontWeight: 900,
    color: 'white',
    marginBottom: '80px',
    textAlign: 'center',
    textShadow: '5px 5px 0px rgba(88, 28, 135, 0.6)',
    WebkitTextStroke: '3px rgba(109, 40, 217, 0.4)',
    letterSpacing: '2px',
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
    fontSize: '40px',
    marginRight: '15px',
  },
  formTitle: {
    fontSize: '35px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '3px 3px 0px rgba(0, 0, 0, 0.3)',
  },
  inputGroup: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    color: 'white',
    fontSize: '16px',
    marginBottom: '12px',
    textShadow: '2px 2px 0px rgba(0, 0, 0, 0.2)',
  },
  input: {
    width: '100%',
    padding: '18px 20px',
    borderRadius: '12px',
    fontSize: '18px',
    border: '2px solid #c084fc',
    outline: 'none',
    color: '#1f2937',
  },
  toggleButton: {
    width: '100%',
    backgroundColor: '#ddd6fe',
    color: '#6b21a8',
    fontSize: '16px',
    padding: '20px',
    borderRadius: '18px',
    border: '3px solid rgba(147, 51, 234, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '10px',
  },
  submitButton: {
    width: '100%',
    backgroundColor: 'white',
    color: '#9333ea',
    fontSize: '22px',
    fontWeight: 'bold',
    padding: '18px',
    borderRadius: '18px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '15px',
    marginTop: '10px',
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