import { useState } from 'react'
import './App.css'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'


function App() {
  const [currentPage, setCurrentPage] = useState('home')

  return (
    <>
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'profile' && <ProfilePage />}
      {currentPage === 'login' && <LoginPage />}
    </>
  )
}

export default App