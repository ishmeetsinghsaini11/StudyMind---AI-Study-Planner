import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function GuestSelectPage() {
  const navigate = useNavigate()
  const [guests, setGuests] = useState([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/guests').then(res => setGuests(res.data.users || []))
  }, [])

  const selectGuest = (guest) => {
    localStorage.setItem('userId', String(guest.id))
    localStorage.setItem('userName', guest.name)
    navigate('/')
  }

  const deleteGuest = async (guestId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this profile?')) return
    
    try {
      await api.delete(`/guest/${guestId}`)
      setGuests(guests.filter(g => g.id !== guestId))
    } catch(err) {
      alert('Failed to delete profile')
    }
  }

  const createGuest = async () => {
    if (!newName.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/guest', { name: newName.trim() })
      console.log('Guest API response:', res.data)
      
      const userId = res.data.userId
      const userName = res.data.name
      
      if (!userId) {
        alert('Server did not return userId. Check server logs.')
        return
      }
      
      localStorage.setItem('userId', String(userId))
      localStorage.setItem('userName', userName)
      
      // Verify it was saved
      console.log('Saved userId:', localStorage.getItem('userId'))
      console.log('Saved userName:', localStorage.getItem('userName'))
      
      navigate('/onboarding')
    } catch(err) {
      console.error('Create guest error:', err.response?.data || err.message)
      alert('Failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#0a0f1e', fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: '#111827', padding: '2rem', borderRadius: '16px',
        width: '100%', maxWidth: '480px', color: 'white'
      }}>
        <h1 style={{ marginBottom: '0.25rem' }}>🧠 StudyMind</h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Who is studying today?</p>

        {/* Existing guests */}
        {guests.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              EXISTING PROFILES
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {guests.map(guest => (
                <button
                  key={guest.id}
                  onClick={() => selectGuest(guest)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.875rem 1rem', background: '#1e293b',
                    border: '1px solid #334155', borderRadius: '10px',
                    color: 'white', cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: '#6366f1', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {guest.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{guest.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Guest {guest.id}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteGuest(guest.id, e)}
                    style={{
                      padding: '0.5rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Delete
                  </button>
                  <div style={{ color: '#64748b' }}>→</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {guests.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1, height: '1px', background: '#1e293b' }} />
            <span style={{ color: '#475569', fontSize: '0.875rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#1e293b' }} />
          </div>
        )}

        {/* New guest */}
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          NEW PROFILE
        </p>
        <input
          type="text"
          placeholder="Enter your name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createGuest()}
          style={{
            width: '100%', padding: '0.75rem', marginBottom: '0.75rem',
            borderRadius: '8px', border: '1px solid #1e293b',
            background: '#1e293b', color: 'white', boxSizing: 'border-box',
            fontSize: '1rem', outline: 'none'
          }}
        />
        <button
          onClick={createGuest}
          disabled={loading || !newName.trim()}
          style={{
            width: '100%', padding: '0.75rem', background: '#6366f1',
            color: 'white', border: 'none', borderRadius: '8px',
            cursor: loading || !newName.trim() ? 'not-allowed' : 'pointer',
            fontSize: '1rem', opacity: loading || !newName.trim() ? 0.6 : 1
          }}
        >
          {loading ? 'Creating...' : 'Start Studying →'}
        </button>
      </div>
    </div>
  )
}
