import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// All pages that are being used are imported here
import HomePage from './pages/Homepage.jsx'
import MustangWrapped from './pages/wrappedScreen.jsx'
import PlaylistView from './pages/playlistScreen.jsx'
import ProfilePage from './pages/ProfilePage'
import FriendsPage from './pages/FriendsPage'
import MustangWrappedLogin from './pages/loginScreen.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import RegisterComplete from './pages/RegisterComplete.jsx'
import FeedPage from './pages/FeedPage.jsx'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<MustangWrappedLogin />} />

          {/* Registration completion after Spotify - public route */}
          <Route path="/register-complete" element={<RegisterComplete />} />

          {/* Protected routes */}
          <Route path="/home" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="/wrapped" element={
            <ProtectedRoute>
              <MustangWrapped />
            </ProtectedRoute>
          } />
          <Route path="/playlist" element={
            <ProtectedRoute>
              <PlaylistView />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/feed" element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          } />
          <Route path="/profile/:userId" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/friends" element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          } />
          <Route path="/coming-soon" element={
            <ProtectedRoute>
              <ComingSoon />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App