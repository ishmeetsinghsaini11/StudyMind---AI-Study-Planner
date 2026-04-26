import { NavLink, useNavigate } from 'react-router-dom';
import { Brain, LogOut, User } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/plan', label: 'Plan' },
    { path: '/flashcards', label: 'Flashcards' },
    { path: '/chat', label: 'Chat' },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/guest');
  };

  const userName = localStorage.getItem('userName') || 'Guest';
  const initials = userName.charAt(0).toUpperCase();

  return (
    <nav className="bg-card border-b border-cardBorder">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            <span className="font-display font-bold text-2xl text-text">StudyMind</span>
          </NavLink>

          <div className="flex items-center gap-8">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                style={({ isActive }) => ({
                  color: isActive ? '#6366f1' : '#94a3b8',
                  textDecoration: 'none',
                  fontWeight: isActive ? '600' : '400',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: isActive ? '#1e293b' : 'transparent',
                  transition: 'all 0.2s'
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 hover:bg-cardBorder rounded-lg px-3 py-2 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                {initials}
              </div>
              <span className="text-text font-medium">{userName}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-cardBorder rounded-lg shadow-lg overflow-hidden z-50">
                <NavLink
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-cardBorder transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </NavLink>
                <button
                  onClick={() => {
                    handleLogout();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cardBorder transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Switch Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
