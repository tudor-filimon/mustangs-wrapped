import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';

export default function PlaylistView() {
  const navigate = useNavigate();
  
  const songs = [
    { id: 1, title: 'Song Title', album: 'Album name/artist', length: 'Song Length' },
    { id: 2, title: 'Song Title', album: 'Album name/artist', length: 'Song Length' },
    { id: 3, title: 'Song Title', album: 'Album name/artist', length: 'Song Length' },
    { id: 4, title: 'Song Title', album: 'Album name/artist', length: 'Song Length' },
    { id: 5, title: 'Song Title', album: 'Album name/artist', length: 'Song Length' }
  ];

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
            <div style={styles.leftButtons}>
              <button style={styles.smallButton}>Sort</button>
              <button style={styles.smallButton}>Export</button>
            </div>
            <div style={styles.titleSection}>
              <h1 style={styles.playlistTitle}>Playlist Name</h1>
              <p style={styles.playlistLength}>Playlist length</p>
              <div style={styles.underline}></div>
            </div>
            <button 
              style={styles.backButton}
              onClick={() => navigate('/wrapped')}
            >
              ← Back
            </button>
          </div>

          {/* Song List */}
          <div style={styles.songList}>
            {songs.map((song) => (
              <div key={song.id} style={styles.songRow}>
                {/* Album Art */}
                <div style={styles.albumArt}></div>
                
                {/* Song Length */}
                <div style={styles.songLength}>{song.length}</div>
                
                {/* Song Info */}
                <div style={styles.songInfo}>
                  <h3 style={styles.songTitle}>{song.title}</h3>
                  <p style={styles.albumName}>{song.album}</p>
                </div>
                
                {/* Play Button */}
                <button style={styles.playButton}>► Play</button>
              </div>
            ))}
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
    zIndex: 1,
    padding: '40px 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '40px',
    gap: '20px'
  },
  leftButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  smallButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  titleSection: {
    flex: 1,
    textAlign: 'center'
  },
  playlistTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 8px 0',
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
  playlistLength: {
    fontSize: '14px',
    color: 'white',
    margin: '0 0 12px 0',
    opacity: 0.9
  },
  underline: {
    height: '2px',
    backgroundColor: 'white',
    maxWidth: '250px',
    margin: '0 auto'
  },
  backButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  songList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  songRow: {
    display: 'grid',
    gridTemplateColumns: '80px 120px 1fr 140px',
    alignItems: 'center',
    gap: '20px',
    padding: '20px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
  },
  albumArt: {
    width: '80px',
    height: '80px',
    backgroundColor: '#d1d5db',
    borderRadius: '4px'
  },
  songLength: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600'
  },
  songInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  songTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
    fontFamily: "'Press Start 2P', cursive",
    textShadow: `
      2px 2px 0px rgba(0, 0, 0, 0.5),
      -1px -1px 0px #6b46c1,
      1px -1px 0px #6b46c1,
      -1px 1px 0px #6b46c1,
      1px 1px 0px #6b46c1,
      -1px 0px 0px #6b46c1,
      1px 0px 0px #6b46c1,
      0px -1px 0px #6b46c1,
      0px 1px 0px #6b46c1
    `,
    lineHeight: '1.4'
  },
  albumName: {
    fontSize: '14px',
    color: 'white',
    margin: 0,
    opacity: 0.8
  },
  playButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    justifySelf: 'end'
  }
};

