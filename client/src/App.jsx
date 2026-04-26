import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GuestSelectPage from './pages/GuestSelectPage'
import OnboardingPage from './pages/OnboardingPage'
import Dashboard from './pages/Dashboard'
import StudyPlan from './pages/StudyPlan'
import Flashcards from './pages/Flashcards'
import Chat from './pages/Chat'
import StudentProfile from './pages/StudentProfile'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'

const ProtectedRoute = ({ children }) => {
  const userId = localStorage.getItem('userId')
  console.log('ProtectedRoute check — userId:', userId)
  if (!userId) {
    console.log('No userId, redirecting to /guest')
    return <Navigate to="/guest" replace />
  }
  return children
}

const RootRoute = () => {
  const userId = localStorage.getItem('userId')
  return userId ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/guest" element={<GuestSelectPage />} />
        <Route path="/onboarding" element={
          <ProtectedRoute><OnboardingPage /></ProtectedRoute>
        } />
        
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plan" element={<StudyPlan />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<StudentProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
