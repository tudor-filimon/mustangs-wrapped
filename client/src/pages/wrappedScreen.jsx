import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import TiltedCard from '../components/TiltedCard';
import api from '../utils/api';

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
    fontSize: '50px',
    fontWeight: '400px',
    color: 'white',
    margin: 0,
    letterSpacing: '2px',
    fontFamily: "'Jersey 25', cursive",
    textShadow: "10px 5px 2px #2e1052, 0 0 20px rgba(138, 56, 245, 0.4)",
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
  coverTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    margin: 0,
    fontFamily: "'Press Start 2P', cursive",
    textShadow: `
      2px 2px 0px rgba(0, 0, 0, 0.45),
      -1px -1px 0px rgba(139, 92, 246, 0.6),
      1px 1px 0px rgba(139, 92, 246, 0.6)
    `,
    lineHeight: '1.35',
    transform: 'translateZ(32px)'
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
  },
  addMoreButtonWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '12px',
    marginBottom: '36px'
  },
  addMoreButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '9999px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    outline: 'none',
    boxShadow: 'none'
  }
};

export default function MustangWrapped() {
  const navigate = useNavigate();
  const [topTracks, setTopTracks] = useState([]);
  const [globalTopTracks, setGlobalTopTracks] = useState([]);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    api.getTopTracks('medium_term')
      .then((data) => {
        console.log('Top 50 tracks:', data.tracks);
        if (data.tracks?.length) setTopTracks(data.tracks);
        data.tracks?.forEach((t, i) => {
          console.log(`${i + 1}. ${t.name} – ${t.artists}`);
        });
      })
      .catch((err) => {
        console.warn('Could not load top tracks:', err.message);
      });

    api.getGlobalTopTracks()
      .then((data) => {
        console.log('Global top 50 tracks:', data.tracks);
        if (data.tracks?.length) setGlobalTopTracks(data.tracks);
      })
      .catch((err) => {
        console.warn('Could not load global tracks:', err.message);
      });
  }, []);

  const top50Songs = topTracks.slice(0, 50).map((t) => ({
    id: t.spotify_id,
    spotifyId: t.spotify_id,
    title: t.name,
    album: t.artists,
    imageUrl: t.image
  }));

  const globalTop50Songs = globalTopTracks.slice(0, 50).map((t) => ({
    id: t.spotify_id,
    spotifyId: t.spotify_id,
    title: t.name,
    album: t.artists || 'Unknown artist',
    imageUrl: t.image_url
  }));

  const wrappedItems = [
    { id: 1, title: 'Your Top 50 Songs', isTop50Playlist: true },
    { id: 2, title: 'Global Top 50 Songs', isGlobalTop50Playlist: true },
    { id: 3, title: 'Faculty Top 50 Songs' }
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
                  {/* Playlist Cover */}
                  <div
                    style={{ width: '100%', marginBottom: '24px' }}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/playlist', {
                      state: item.isTop50Playlist
                        ? { playlistName: 'Your Top 50 Songs', songs: top50Songs }
                        : item.isGlobalTop50Playlist
                          ? { playlistName: 'Global Top 50 Songs', songs: globalTop50Songs }
                        : undefined
                    })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/playlist', {
                          state: item.isTop50Playlist
                            ? { playlistName: 'Your Top 50 Songs', songs: top50Songs }
                            : item.isGlobalTop50Playlist
                              ? { playlistName: 'Global Top 50 Songs', songs: globalTop50Songs }
                            : undefined
                        });
                      }
                    }}
                  >
                    <TiltedCard
                      containerHeight="280px"
                      containerWidth="100%"
                      cardHeight="280px"
                      cardWidth="100%"
                      captionText={item.title}
                      showTooltip={false}
                      overlayContent={
                        <>
                          <h2 style={styles.coverTitle}>{item.title}</h2>
                          <span className="tilted-card-cta">View Playlist</span>
                        </>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Add divider after each group except the last one */}
            {groupIndex < groupedItems.length - 1 && (
              <div style={{...styles.bottomDivider, marginTop: '32px', marginBottom: '32px'}}></div>
            )}
          </React.Fragment>
        ))}

        <div style={styles.addMoreButtonWrap}>
          <button
            style={styles.addMoreButton}
            onClick={() => window.alert('More playlists coming soon.')}
          >
            + Add More Playlists
          </button>
        </div>

        {/* Bottom Divider */}
        <div style={styles.bottomDivider}></div>
      </div>
    </div>
    </div>
  );
}