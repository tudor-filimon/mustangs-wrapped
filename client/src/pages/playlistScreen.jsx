import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import api from '../utils/api';

const placeholderSongs = [
  { id: 1, title: 'Song Title', album: 'Album name/artist', length: 'Song Length', imageUrl: null },
  { id: 2, title: 'Song Title', album: 'Album name/artist', length: 'Song Length', imageUrl: null },
  { id: 3, title: 'Song Title', album: 'Album name/artist', length: 'Song Length', imageUrl: null },
  { id: 4, title: 'Song Title', album: 'Album name/artist', length: 'Song Length', imageUrl: null },
  { id: 5, title: 'Song Title', album: 'Album name/artist', length: 'Song Length', imageUrl: null }
];

export default function PlaylistView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [playlistName, setPlaylistName] = useState('Playlist Name');
  const [songs, setSongs] = useState(placeholderSongs);
  const [isCustomPlaylist, setIsCustomPlaylist] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [playlistId, setPlaylistId] = useState(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const openSpotifyTrack = (spotifyId) => {
    if (!spotifyId) return;
    const url = `https://open.spotify.com/track/${encodeURIComponent(spotifyId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRenamePlaylist = () => {
    if (!isCustomPlaylist) return;
    setRenameValue(playlistName);
    setIsRenameModalOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!isCustomPlaylist || !isOwner || !playlistId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    try {
      await api.renameSharedPlaylist(playlistId, trimmed);
      setPlaylistName(trimmed);
      setIsRenameModalOpen(false);
      setRenameValue('');
    } catch (error) {
      console.warn('Could not rename custom playlist:', error);
    }
  };

  useEffect(() => {
    if (location.state?.playlistName && location.state?.songs?.length) {
      setPlaylistName(location.state.playlistName);
      setIsCustomPlaylist(Boolean(location.state.isCustomPlaylist));
      setIsOwner(Boolean(location.state.isOwner));
      setPlaylistId(location.state.playlistId || null);
      setSongs(location.state.songs.map((s, i) => ({
        id: s.id || i + 1,
        spotifyId: s.spotifyId || (typeof s.id === 'string' ? s.id : null),
        title: s.title,
        album: s.album || '',
        imageUrl: s.imageUrl ?? null
      })));
      return;
    }
    api.getWrappedTopTracks()
      .then((data) => {
        if (data.tracks?.length) {
          setPlaylistName('Your Top 50 Songs');
          setIsCustomPlaylist(false);
          setIsOwner(false);
          setPlaylistId(null);
          setSongs(data.tracks.map((t, i) => ({
            id: t.rank || i + 1,
            spotifyId: t.spotify_id || null,
            title: t.name,
            album: t.artists || 'Unknown artist',
            imageUrl: t.image_url ?? null
          })));
        }
      })
      .catch(() => {});
  }, [location.state]);

  return (
    <div className="home-container dark page-transition playlist-page">
      <div className="playlist-page-bg">
        <AnimatedBackground />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      `}</style>
      <div className="playlist-page-content" style={styles.container}>
        <div style={styles.content}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.titleSection}>
              <h1 style={styles.playlistTitle}>{playlistName}</h1>
            </div>
            <div style={styles.headerButtons}>
              {isCustomPlaylist && isOwner ? (
                <button
                  style={styles.renameButton}
                  onClick={handleRenamePlaylist}
                >
                  Rename
                </button>
              ) : null}
              <button 
                style={styles.backButton}
                onClick={() => navigate('/wrapped')}
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Song List */}
          <div style={styles.songList}>
            {songs.map((song, index) => (
              <div key={song.id} style={styles.songRow}>
                {/* Rank */}
                <div style={styles.songRank}>{index + 1}</div>

                {/* Album Art */}
                <div style={styles.albumArt}>
                  {song.imageUrl ? (
                    <img src={song.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : null}
                </div>
                
                {/* Song Info */}
                <div style={styles.songInfo}>
                  <h3 style={styles.songTitle}>{song.title}</h3>
                  <p style={styles.albumName}>{song.album}</p>
                </div>
                
                {/* Play Button */}
                <button
                  style={styles.playButton}
                  onClick={() => openSpotifyTrack(song.spotifyId)}
                  disabled={!song.spotifyId}
                  title={song.spotifyId ? 'Open in Spotify' : 'Spotify track unavailable'}
                >
                  ► Play
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {isRenameModalOpen ? (
        <div style={styles.modalBackdrop} onClick={() => setIsRenameModalOpen(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Rename Playlist</h3>
            <input
              autoFocus
              type="text"
              style={styles.modalInput}
              value={renameValue}
              maxLength={80}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmRename();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsRenameModalOpen(false);
                }
              }}
              placeholder="Enter playlist name"
            />
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.modalCancelButton}
                onClick={() => setIsRenameModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.modalCreateButton}
                onClick={handleConfirmRename}
                disabled={!renameValue.trim()}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
  headerButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
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
  renameButton: {
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
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(7, 2, 19, 0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modalCard: {
    width: '100%',
    maxWidth: '520px',
    borderRadius: '18px',
    border: '1px solid rgba(255, 255, 255, 0.24)',
    background: `
      radial-gradient(circle at 16% 14%, rgba(255, 255, 255, 0.18) 0%, transparent 40%),
      linear-gradient(145deg, rgba(168, 85, 247, 0.9) 0%, rgba(124, 58, 237, 0.88) 55%, rgba(67, 56, 202, 0.9) 100%)
    `,
    boxShadow: '0 20px 56px rgba(76, 29, 149, 0.52)',
    padding: '26px 22px',
    color: 'white'
  },
  modalTitle: {
    margin: '0 0 10px 0',
    fontSize: '20px',
    fontFamily: "'Press Start 2P', cursive",
    lineHeight: '1.45'
  },
  modalInput: {
    width: '100%',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(10, 6, 34, 0.45)',
    color: 'white',
    padding: '12px 14px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '16px'
  },
  modalCancelButton: {
    border: '1px solid rgba(255, 255, 255, 0.35)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'white',
    borderRadius: '9999px',
    padding: '10px 18px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  modalCreateButton: {
    border: 'none',
    background: '#e9d5ff',
    color: '#581c87',
    borderRadius: '9999px',
    padding: '10px 18px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  songList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  songRow: {
    display: 'grid',
    gridTemplateColumns: '32px 80px 1fr 140px',
    alignItems: 'center',
    gap: '20px',
    padding: '20px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
  },
  songRank: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '700',
    textAlign: 'right',
    opacity: 0.9
  },
  albumArt: {
    width: '80px',
    height: '80px',
    backgroundColor: '#d1d5db',
    borderRadius: '4px'
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

