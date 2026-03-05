import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import api from '../utils/api';

const defaultAvatar = '/src/assets/images/default-avatar.png';

export default function FriendsPage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], sent: [] });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, activityRes] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
        api.getFriendsActivity()
      ]);
      setFriends(friendsRes.friends || []);
      setRequests({
        incoming: requestsRes.incoming || [],
        sent: requestsRes.sent || []
      });
      setActivity(activityRes.activity || []);
    } catch (e) {
      console.error('Friends load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { users } = await api.searchUsers(q);
      setSearchResults(users || []);
    } catch (e) {
      console.error('Search error', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (receiverId) => {
    if (actionLoading) return;
    setActionLoading(receiverId);
    try {
      await api.sendFriendRequest(receiverId);
      setSearchResults(prev => prev.filter(u => u.id !== receiverId));
      await loadData();
    } catch (e) {
      console.error('Send request error', e);
      alert(e.message || 'Could not send request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (requestId) => {
    if (actionLoading) return;
    setActionLoading(requestId);
    try {
      await api.acceptFriendRequest(requestId);
      await loadData();
    } catch (e) {
      console.error('Accept error', e);
      alert(e.message || 'Could not accept');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (requestId) => {
    if (actionLoading) return;
    setActionLoading(requestId);
    try {
      await api.declineFriendRequest(requestId);
      await loadData();
    } catch (e) {
      console.error('Decline error', e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="home-container dark page-transition" style={styles.pageContainer}>
      <AnimatedBackground />

      <style>{`
        .friends-section { margin-bottom: 32px; }
        .friends-card {
          background: rgba(151, 53, 216, 0.15);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(167, 139, 250, 0.4);
          border-radius: 20px;
          padding: 16px 20px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .friends-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(147, 51, 234, 0.3);
        }
        .friends-activity-card {
          background: rgba(151, 53, 216, 0.15);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(167, 139, 250, 0.4);
          border-radius: 20px;
          padding: 16px 20px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .friends-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(167, 139, 250, 0.5);
        }
        .friends-btn-small {
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .friends-btn-small:disabled { opacity: 0.6; cursor: not-allowed; }
        .friends-search-input {
          width: 100%;
          padding: 12px 20px;
          border-radius: 9999px;
          border: 2px solid rgba(167, 139, 250, 0.5);
          background: rgba(31, 16, 65, 0.6);
          color: white;
          font-size: 16px;
          margin-bottom: 12px;
        }
        .friends-search-input::placeholder { color: rgba(255,255,255,0.6); }
        .friends-search-input:focus { outline: none; border-color: #a78bfa; }
      `}</style>

      <header style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/home')}>
          ← Back
        </button>
      </header>

      <main style={styles.mainContent}>
        <h1 style={styles.pageTitle}>Friends</h1>

        <div style={styles.columns}>
          {/* LEFT COLUMN: add/search + requests */}
          <div style={styles.column}>
            {/* Add Friends */}
            <div className="friends-section">
              <button
                className="pill-btn"
                style={{ marginBottom: 12 }}
                onClick={() => { setSearchOpen(!searchOpen); setSearchResults([]); setSearchQuery(''); }}
              >
                {searchOpen ? 'Close search' : '+ Add friends'}
              </button>
              {searchOpen && (
                <div style={styles.searchBox}>
                  <input
                    className="friends-search-input"
                    placeholder="Search by display name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button className="pill-btn" onClick={handleSearch} disabled={searching}>
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {searchResults.map((u) => (
                        <div key={u.id} className="friends-card">
                          <img src={u.avatar_url || defaultAvatar} alt="" className="friends-avatar" />
                          <div style={{ flex: 1 }}>
                            <strong style={{ color: 'white' }}>{u.display_name || 'Unknown'}</strong>
                          </div>
                          <button
                            className="friends-btn-small"
                            style={{ background: '#a78bfa', color: '#1f1041' }}
                            onClick={() => handleSendRequest(u.id)}
                            disabled={actionLoading === u.id}
                          >
                            {actionLoading === u.id ? 'Sending...' : 'Add friend'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                    <p style={{ color: '#d8b4fe', marginTop: 8 }}>No users found.</p>
                  )}
                </div>
              )}
            </div>

            {/* Friend Requests */}
            <div className="friends-section">
              <h3 style={styles.sectionHeader}>Friend requests</h3>
              {requests.incoming.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={styles.subLabel}>Incoming</p>
                  {requests.incoming.map((r) => (
                    <div key={r.id} className="friends-card">
                      <img src={r.user?.avatar_url || defaultAvatar} alt="" className="friends-avatar" />
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: 'white' }}>{r.user?.display_name || 'Unknown'}</strong>
                      </div>
                      <button
                        className="friends-btn-small"
                        style={{ background: '#22c55e', color: 'white', marginRight: 8 }}
                        onClick={() => handleAccept(r.id)}
                        disabled={actionLoading === r.id}
                      >
                        Accept
                      </button>
                      <button
                        className="friends-btn-small"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                        onClick={() => handleDecline(r.id)}
                        disabled={actionLoading === r.id}
                      >
                        Decline
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {requests.sent.length > 0 && (
                <div>
                  <p style={styles.subLabel}>Sent (pending)</p>
                  {requests.sent.map((r) => (
                    <div key={r.id} className="friends-card">
                      <img src={r.user?.avatar_url || defaultAvatar} alt="" className="friends-avatar" />
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: 'white' }}>{r.user?.display_name || 'Unknown'}</strong>
                      </div>
                      <span style={{ color: '#d8b4fe', fontSize: 14 }}>Pending</span>
                    </div>
                  ))}
                </div>
              )}
              {requests.incoming.length === 0 && requests.sent.length === 0 && (
                <p style={{ color: '#d8b4fe' }}>No pending requests.</p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: friends + activity */}
          <div style={styles.column}>
            {/* Friends list */}
            <div className="friends-section">
              <h3 style={styles.sectionHeader}>Your friends</h3>
              {loading ? (
                <p style={{ color: '#d8b4fe' }}>Loading...</p>
              ) : friends.length === 0 ? (
                <p style={{ color: '#d8b4fe' }}>No friends yet. Search and add friends above.</p>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.id}
                    className="friends-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${f.id}`)}
                  >
                    <img src={f.avatar_url || defaultAvatar} alt="" className="friends-avatar" />
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: 'white' }}>{f.display_name || 'Unknown'}</strong>
                    </div>
                    <span style={{ color: '#a78bfa', fontSize: 14 }}>View profile →</span>
                  </div>
                ))
              )}
            </div>

            {/* Friends Activity */}
            <div className="friends-section">
              <h3 style={styles.sectionHeader}>Friends activity</h3>
              {loading ? (
                <p style={{ color: '#d8b4fe' }}>Loading...</p>
              ) : activity.length === 0 ? (
                <p style={{ color: '#d8b4fe' }}>No activity yet.</p>
              ) : (
                activity.map((item) => (
                  <div key={item.user.id} className="friends-activity-card">
                    <img src={item.user.avatar_url || defaultAvatar} alt="" className="friends-avatar" />
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: 'white' }}>{item.user.display_name || 'Unknown'}</strong>
                      {item.playing ? (
                        <p style={{ color: '#d8b4fe', margin: '4px 0 0 0', fontSize: 14 }}>
                          is listening to: "{item.song}" – {item.artists}
                        </p>
                      ) : item.recentTrack ? (
                        <p style={{ color: '#d8b4fe', margin: '4px 0 0 0', fontSize: 14 }}>
                          recently played: "{item.recentTrack.song}" – {item.recentTrack.artists}
                        </p>
                      ) : (
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: 14 }}>
                          No recent activity
                        </p>
                      )}
                    </div>
                    {(item.playing && item.image) || (item.recentTrack?.image) ? (
                      <img
                        src={item.playing ? item.image : item.recentTrack?.image}
                        alt=""
                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  pageContainer: { overflowY: 'auto', overflowX: 'hidden' },
  header: {
    padding: '30px',
    display: 'flex',
    justifyContent: 'flex-start',
    position: 'sticky',
    top: 0,
    zIndex: 50
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
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 10,
    paddingBottom: 60
  },
  pageTitle: {
    fontFamily: "'Jersey 25', sans-serif",
    fontSize: '56px',
    color: 'white',
    letterSpacing: '0.15em',
    marginBottom: '24px',
    textShadow: '0 0 10px #bc13fe, 0 0 40px #bc13fe'
  },
  sectionHeader: {
    fontFamily: "'Jersey 25', sans-serif",
    fontSize: '28px',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '12px',
    textShadow: '0 0 5px #bc13fe',
    borderBottom: '2px solid rgba(167, 139, 250, 0.3)',
    paddingBottom: '8px',
    alignSelf: 'flex-start'
  },
  subLabel: {
    fontSize: 12,
    color: '#d8b4fe',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  searchBox: { width: '100%', maxWidth: 400 },
  columns: {
    display: 'flex',
    gap: 24,
    width: '100%',
    maxWidth: 1100,
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  column: {
    flex: 1,
    minWidth: 320,
    maxWidth: 520
  }
};
