import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
    padding: '40px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    margin: 0,
    border: 'none',
    outline: 'none',
    animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
    overflow: 'auto', 
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '60px'
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
    letterSpacing: '1px',
    fontFamily: "'Press Start 2P', cursive",
    textShadow: `
      4px 4px 0px rgba(0, 0, 0, 0.5),
      -2px -2px 0px #6b46c1,
      2px -2px 0px #6b46c1,
      -2px 2px 0px #6b46c1,
      2px 2px 0px #6b46c1,
      -2px 0px 0px #6b46c1,
      2px 0px 0px #6b46c1,
      0px -2px 0px #6b46c1,
      0px 2px 0px #6b46c1
    `
  },
  backButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '9999px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    outline: 'none',
    boxShadow: 'none'
  },
  divider: {
    height: '1px',
    backgroundColor: '#a78bfa',
    marginBottom: '48px',
    maxWidth: '300px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '32px',
    marginBottom: '64px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '24px',
    textAlign: 'center',
    margin: '0 0 24px 0',
    fontFamily: "'Press Start 2P', cursive",
    textShadow: `
      3px 3px 0px rgba(0, 0, 0, 0.5),
      -2px -2px 0px #6b46c1,
      2px -2px 0px #6b46c1,
      -2px 2px 0px #6b46c1,
      2px 2px 0px #6b46c1,
      -2px 0px 0px #6b46c1,
      2px 0px 0px #6b46c1,
      0px -2px 0px #6b46c1,
      0px 2px 0px #6b46c1
    `,
    lineHeight: '1.4'
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: '1',
    backgroundColor: '#d1d5db',
    marginBottom: '24px',
    borderRadius: '2px'
  },
  playlistButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '9999px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    outline: 'none',
    boxShadow: 'none'
  },
  bottomDivider: {
    height: '1px',
    backgroundColor: '#a78bfa'
  }
};

export default function MustangWrapped() {
  const navigate = useNavigate();
  
  const wrappedItems = [
    { id: 1, title: 'Wrapped Thing #1' },
    { id: 2, title: 'Wrapped Thing #2' },
    { id: 3, title: 'Wrapped Thing #3' },
    { id: 4, title: 'Wrapped Thing #4' },
    { id: 5, title: 'Wrapped Thing #5' },
    { id: 6, title: 'Wrapped Thing #6' },
    { id: 7, title: 'Wrapped Thing #7' },
    { id: 8, title: 'Wrapped Thing #8' },
    { id: 9, title: 'Wrapped Thing #9' }
  ];

  // Group items into chunks of 3
  const groupedItems = [];
  for (let i = 0; i < wrappedItems.length; i += 3) {
    groupedItems.push(wrappedItems.slice(i, i + 3));
  }

  return (
    <div className="home-container dark page-transition">
      <AnimatedBackground />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      `}</style>
      <div style={styles.container}>
        <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Mustang Wrapped</h1>
          <button style={styles.backButton} onClick={() => navigate('/home')}>
            ← Back
          </button>
        </div>

        {/* Divider */}
        <div style={styles.divider}></div>

        {/* Cards Grid with Dividers */}
        {groupedItems.map((group, groupIndex) => (
          <React.Fragment key={`group-${groupIndex}`}>
            <div style={styles.grid}>
              {group.map((item) => (
                <div key={item.id} style={styles.card}>
                  {/* Card Title */}
                  <h2 style={styles.cardTitle}>{item.title}</h2>
                  
                  {/* Card Image Placeholder */}
                  <div style={styles.imagePlaceholder}></div>
                  
                  {/* View Playlist Button */}
                  <button 
                    style={styles.playlistButton}
                    onClick={() => navigate('/playlist')}
                  >
                    ♪ View Playlist
                  </button>
                </div>
              ))}
            </div>
            {/* Add divider after each group except the last one */}
            {groupIndex < groupedItems.length - 1 && (
              <div style={{...styles.bottomDivider, marginTop: '32px', marginBottom: '32px'}}></div>
            )}
          </React.Fragment>
        ))}

        {/* Bottom Divider */}
        <div style={styles.bottomDivider}></div>
      </div>
    </div>
    </div>
  );
}