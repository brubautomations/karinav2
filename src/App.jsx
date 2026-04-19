import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import Landing from './pages/Landing'
import SignUpPage from './pages/SignUpPage'
import LoginPage from './pages/LoginPage'
import Chat from './pages/Chat'

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      {/* Catch-all: send unknown routes back home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App