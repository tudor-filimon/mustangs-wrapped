import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// All pages that are being used are imported here
import HomePage from './pages/Homepage.jsx'
import MustangWrapped from './pages/wrappedScreen.jsx'
import PlaylistView from './pages/playlistScreen.jsx'
import ProfilePage from './pages/ProfilePage'
import MustangWrappedLogin from './pages/loginScreen.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import RegisterComplete from './pages/RegisterComplete.jsx'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<MustangWrappedLogin />} />

          {/* Protected routes */}
          <Route path="/register-complete" element={
            <ProtectedRoute>
              <RegisterComplete />
            </ProtectedRoute>
          } />
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