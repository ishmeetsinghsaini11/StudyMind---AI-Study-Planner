import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Edit2, Save } from 'lucide-react';
import Card from '../components/Card';
import api from '../api';
import toast from 'react-hot-toast';

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) {
      navigate('/guest');
      return;
    }
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      // Profile data is not stored in database anymore for guest system
      setProfile(null);
      setEditData({});
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Profile editing is disabled in guest system
      toast.info('Profile editing is disabled in guest mode');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/guest');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4" />
            <div className="h-32 bg-gray-700 rounded mb-4" />
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-text p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <p className="text-gray-400">Profile not found</p>
        </Card>
      </div>
    );
  }

  const initials = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-background text-text p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl font-bold">My Profile</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-cardBorder hover:border-primary rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <Card className="p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold">
              {initials}
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold mb-1">{profile.name}</h2>
              <p className="text-gray-400 mb-4">{profile.email}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Learning Style:</span>
                  <span className="ml-2 px-2 py-1 bg-primary/20 text-primary rounded-full">{profile.learning_style}</span>
                </div>
                <div>
                  <span className="text-gray-400">Knowledge Level:</span>
                  <span className="ml-2">{profile.knowledge_level}</span>
                </div>
                <div>
                  <span className="text-gray-400">Daily Hours:</span>
                  <span className="ml-2">{profile.daily_hours}h</span>
                </div>
                <div>
                  <span className="text-gray-400">Energy Pattern:</span>
                  <span className="ml-2">{profile.energy_pattern}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Goal:</span>
                  <span className="ml-2">{profile.goal}</span>
                </div>
                <div>
                  <span className="text-gray-400">Study Subject:</span>
                  <span className="ml-2">{profile.studySubject || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Joined:</span>
                  <span className="ml-2">{new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-xl font-bold">Edit Profile</h3>
            {editing ? (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 border border-cardBorder hover:border-primary rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                disabled={!editing}
                className="w-full px-4 py-2 bg-card border border-cardBorder rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Daily Hours</label>
              <input
                type="number"
                value={editData.daily_hours}
                onChange={(e) => setEditData({ ...editData, daily_hours: parseInt(e.target.value) })}
                disabled={!editing}
                className="w-full px-4 py-2 bg-card border border-cardBorder rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Goal</label>
              <textarea
                value={editData.goal}
                onChange={(e) => setEditData({ ...editData, goal: e.target.value })}
                disabled={!editing}
                rows={3}
                className="w-full px-4 py-2 bg-card border border-cardBorder rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Energy Pattern</label>
              <select
                value={editData.energy_pattern}
                onChange={(e) => setEditData({ ...editData, energy_pattern: e.target.value })}
                disabled={!editing}
                className="w-full px-4 py-2 bg-card border border-cardBorder rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentProfile;
