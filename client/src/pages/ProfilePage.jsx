import React from 'react';
import '../App.css'; // Make sure this points to your CSS file

function ProfilePage() {
  // Simple navigation handler to go back to home
  const handleBack = () => {
    window.location.reload(); // Or use your router's navigation method
  };

  return (
    <div className="profile-container">
      
      {/* Background Decorative Shapes (The purple blobs) */}
      <div className="bg-shape shape-top"></div>
      <div className="bg-shape shape-bottom"></div>

      {/* Header with Back Button (Top Right) */}
      <header className="profile-header">
        <button className="btn-back" onClick={handleBack}>
          ← Back
        </button>
      </header>

      {/* Main Content */}
      <main className="profile-content">
        
        {/* Profile Identity Section */}
        <div className="profile-identity">
          <img 
            src="https://i.pravatar.cc/120?img=33" 
            alt="Profile" 
            className="profile-avatar"
          />
          <h2 className="profile-name">Scottie Barnes</h2>
          <p className="profile-handle">@scottie67</p>
        </div>

        {/* User Details Grid (2x2) */}
        <div className="info-grid">
          <div className="stat-box">
            <p className="stat-label">Faculty</p>
            <p className="stat-value">Raptors</p>
          </div>
          <div className="stat-box">
            <p className="stat-label">Year</p>
            <p className="stat-value">4th</p>
          </div>
          <div className="stat-box">
            <p className="stat-label">Major</p>
            <p className="stat-value">2026 All Star</p>
          </div>
          <div className="stat-box">
            <p className="stat-label">Chromosomes</p>
            <p className="stat-value">47</p>
          </div>
        </div>

        {/* Usage Stats Section */}
        <div className="section-container">
          <h3 className="section-title">Your Stats</h3>
          
          <div className="usage-stats-grid">
            {/* Top Row: 3 items */}
            <div className="stat-item">
              <p className="stat-label">Total Songs Played</p>
              <p className="stat-value">420</p>
            </div>
            <div className="stat-item">
              <p className="stat-label">Hours Listened</p>
              <p className="stat-value">67</p>
            </div>
            <div className="stat-item">
              <p className="stat-label">Unique Artists</p>
              <p className="stat-value">1</p>
            </div>
            
            {/* Bottom Row: Centered Item */}
            <div className="stat-item full-width">
              <p className="stat-label">Artist of the month</p>
              <p className="stat-value">Chopin</p>
            </div>
          </div>
        </div>

        {/* Top Tracks Section */}
        <div className="section-container">
          <h3 className="section-title">Your top Tracks</h3>
          
          <div className="tracks-list">
            <div className="track-card">
              <p className="track-title">I'll Be Missing You</p>
              <p className="track-artist">Diddy</p>
            </div>

            <div className="track-card">
              <p className="track-title">Nocturnes (Op. 9 No. 2 in E-Flat Major)</p>
              <p className="track-artist">Chopin</p>
            </div>

            <div className="track-card">
              <p className="track-title">Santa Claus is Comin' to Town</p>
              <p className="track-artist">Santa Claus (Ft. Elves & Ms. Claus)</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default ProfilePage;