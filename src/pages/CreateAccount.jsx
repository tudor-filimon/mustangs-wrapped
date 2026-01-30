import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground'; // Import

export default function CreateAccount({ onBack }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const navigate = useNavigate();

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

  const handleCreateAccount = () => {
    if (!email || !username || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    console.log('Account created:', { email, username });
    // alert('Account created successfully!');
    navigate('/home');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCreateAccount();
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

          <button
            style={styles.cameraButton}
            onClick={() => alert('Camera feature coming soon!')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3e8ff'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#e9d5ff'}
          >
            📷 Camera
          </button>
        </div>

        {/* Right Side - Form */}
        <div style={styles.rightSide}>
          <h1 className="pixel-font" style={styles.title}>Create Account</h1>

          {/* Email Input */}
          <div style={styles.inputGroup}>
            <label className="pixel-font" style={styles.label}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="enter your email"
              style={styles.input}
            />
          </div>

          {/* Username Input */}
          <div style={styles.inputGroup}>
            <label className="pixel-font" style={styles.label}>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="enter a username"
              style={styles.input}
            />
            <p style={styles.hint}>
              • No offensive names, keep it respectful<br />
              • Make it unique, be you!
            </p>
          </div>

          {/* Password Input */}
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

          {/* Verify Password Input */}
          <div style={styles.inputGroup}>
            <label className="pixel-font" style={styles.label}>Verify your Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="enter a password"
              style={styles.input}
            />
          </div>

          {/* Create Account Button */}
          <button
            onClick={handleCreateAccount}
            style={styles.createButton}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#7e22ce'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#9333ea'}
          >
            Create Account
          </button>
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
    gap: '60px',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingTop: '40px',
    minHeight: 'calc(100vh - 80px)',
    flexWrap: 'wrap',
  },
  leftSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    alignSelf: 'center',
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
    transition: 'all 0.2s',
    textAlign: 'center',
    display: 'block',
    fontFamily: "'Poppins', sans-serif",
  },
  cameraButton: {
    width: '280px',
    backgroundColor: '#e9d5ff',
    color: '#1f2937',
    fontSize: '18px',
    fontWeight: '700',
    padding: '18px',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Poppins', sans-serif",
  },
  fileInput: {
    display: 'none',
  },
  rightSide: {
    flex: 1,
    maxWidth: '600px',
    minWidth: '300px',
    alignSelf: 'center',
  },
  title: {
    fontSize: '48px',
    color: 'white',
    marginBottom: '40px',
    textShadow: '3px 3px 0px rgba(0, 0, 0, 0.3)',
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