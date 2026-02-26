import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const name = user?.display_name || user?.displayName || user?.email || 'Guest';
  const avatar = user?.avatar_url || '/src/assets/images/default-avatar.png';

  // Orbit Data
  const userStats = {
    faculty: user?.faculty || 'Unknown Faculty',
    year: user?.classYear || user?.class_year || 'Unknown Year',
    major: user?.major || 'Undeclared'
  };

  // New Data
  const listeningStats = {
    totalSongs: 420,
    hoursListened: 67,
    uniqueArtists: 1,
    artistOfMonth: "Chopin"
  };

  const topTracks = [
    { title: "I'll Be Missing You", artist: "Diddy" },
    { title: "Nocturnes (Op. 9 No. 2 in E-Flat Major)", artist: "Chopin" },
    { title: "Santa Claus is Comin' to Town", artist: "Santa Claus (Ft. Elves & Ms. Claus)" }
  ];

  return (
    <div className="home-container dark page-transition" style={styles.pageContainer}>
      <AnimatedBackground />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jersey+25&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        /* Orbit Animations */
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes counter-spin { 100% { transform: rotate(-360deg); } }
        
        .orbit-system {
          position: relative;
          width: 350px;
          height: 350px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 40px auto 60px auto;
        }

        .orbit-path {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px dashed rgba(167, 139, 250, 0.3);
          animation: spin 25s linear infinite;
        }

        .stat-node {
          position: absolute;
          background: rgba(151, 53, 216, 0.2);
          backdrop-filter: blur(25px);
          border: 2px solid #a78bfa;
          border-radius: 30px;
          padding: 15px 25px;
          text-align: center;
          animation: counter-spin 25s linear infinite;
          box-shadow: 0 8px 32px rgba(147, 51, 234, 0.3);
          white-space: nowrap;
        }

        /* 3 Nodes positioned exactly 120 degrees apart */
        .node-top { top: -35px; left: calc(50% - 65px); }
        .node-bottom-right { bottom: 25px; right: -45px; }
        .node-bottom-left { bottom: 25px; left: -45px; }

        /* Glassmorphism Cards */
        .glass-card {
          background: rgba(151, 53, 216, 0.15);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(167, 139, 250, 0.4);
          border-radius: 20px;
          padding: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .glass-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(147, 51, 234, 0.4);
          border-color: #a78bfa;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px;
          margin-bottom: 40px;
        }

        .tracks-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 60px; /* Padding for the bottom of the page */
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/home')}>
          ← Back
        </button>
      </header>

      {/* Main Content (Scrollable) */}
      <main style={styles.mainContent}>
        
        {/* Personalized Title */}
        <h1 style={styles.pageTitle}>{name.split(' ')[0]}</h1>

        {/* === THE ORBIT SECTION === */}
        <div className="orbit-system">
          <div style={styles.centerProfile}>
            <div style={styles.avatarContainer}>
              <img src={avatar} alt="Profile" style={styles.avatar} />
            </div>
            <h2 style={styles.username}>@{name.split(' ')[0]}</h2>
          </div>

          <div className="orbit-path">
            <div className="stat-node node-top">
              <p style={styles.statLabel}>Faculty</p>
              <p style={styles.statValue}>{userStats.faculty}</p>
            </div>
            <div className="stat-node node-bottom-right">
              <p style={styles.statLabel}>Year</p>
              <p style={styles.statValue}>{userStats.year}</p>
            </div>
            <div className="stat-node node-bottom-left">
              <p style={styles.statLabel}>Major</p>
              <p style={styles.statValue}>{userStats.major}</p>
            </div>
          </div>
        </div>

        {/* === LISTENING STATS SECTION === */}
        <div style={styles.contentWrapper}>
          <h3 style={styles.sectionHeader}>Your Stats</h3>
          <div className="stats-grid">
            <div className="glass-card">
              <p style={styles.statLabel}>Total Songs</p>
              <p style={styles.statValueBig}>{listeningStats.totalSongs}</p>
            </div>
            <div className="glass-card">
              <p style={styles.statLabel}>Hours Listened</p>
              <p style={styles.statValueBig}>{listeningStats.hoursListened}</p>
            </div>
            <div className="glass-card">
              <p style={styles.statLabel}>Unique Artists</p>
              <p style={styles.statValueBig}>{listeningStats.uniqueArtists}</p>
            </div>
            <div className="glass-card">
              <p style={styles.statLabel}>Top Artist</p>
              <p style={styles.statValueBig}>{listeningStats.artistOfMonth}</p>
            </div>
          </div>

          {/* === TOP TRACKS SECTION === */}
          <h3 style={styles.sectionHeader}>Your Top Tracks</h3>
          <div className="tracks-list">
            {topTracks.map((track, index) => (
              <div key={index} className="glass-card" style={styles.trackItem}>
                <div style={styles.trackNumber}>#{index + 1}</div>
                <div>
                  <p style={styles.trackTitle}>{track.title}</p>
                  <p style={styles.trackArtist}>{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

const styles = {
  pageContainer: {
    overflowY: 'auto', 
    overflowX: 'hidden',
  },
  header: {
    padding: '30px',
    display: 'flex',
    justifyContent: 'flex-start',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  backButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '9999px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background-color 0.3s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 10,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '800px',
    padding: '0 30px',
  },
  pageTitle: {
    fontFamily: "'Jersey 25', sans-serif",
    fontSize: '70px',
    color: 'white',
    letterSpacing: '0.2em',
    marginBottom: '10px',
    textShadow: "0 0 10px #bc13fe, 0 0 40px #bc13fe",
  },
  sectionHeader: {
    fontFamily: "'Jersey 25', sans-serif",
    fontSize: '45px',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '20px',
    textShadow: "0 0 5px #bc13fe, 0 0 20px #bc13fe",
    borderBottom: '2px solid rgba(167, 139, 250, 0.3)',
    paddingBottom: '10px',
  },
  centerProfile: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5, 
  },
  avatarContainer: {
    width: '130px',
    height: '130px',
    borderRadius: '50%',
    padding: '4px',
    background: 'linear-gradient(135deg, #bc13fe, #5b3085)',
    boxShadow: '0 0 30px rgba(188, 19, 254, 0.6)',
    marginBottom: '15px',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #1f1041',
  },
  username: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '14px',
    color: 'white',
    textShadow: '2px 2px 0px #5b3085',
    margin: 0,
  },
  statLabel: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '8px',
    color: '#d8b4fe',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '800',
    fontSize: '16px',
    color: 'white',
    margin: 0,
  },
  statValueBig: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '900',
    fontSize: '28px',
    color: 'white',
    margin: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  trackItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '15px 25px',
  },
  trackNumber: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '24px',
    color: '#a78bfa',
    opacity: 0.8,
  },
  trackTitle: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '800',
    fontSize: '18px',
    color: 'white',
    marginBottom: '4px',
  },
  trackArtist: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    fontSize: '14px',
    color: '#d8b4fe',
  }
};