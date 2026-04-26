import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Flame, Target, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import { StatCardSkeleton, ListSkeleton, CardSkeleton } from '../components/LoadingSkeleton';
import api from '../api';
import toast from 'react-hot-toast';

const Dashboard = ({ userId: propUserId }) => {
  const [userId, setUserId] = useState(propUserId);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingTask, setRatingTask] = useState(null);

  useEffect(() => {
    // Read userId from localStorage if not provided via props
    const storedUserId = localStorage.getItem('userId');
    console.log('Dashboard loaded with userId from localStorage:', storedUserId);
    if (storedUserId && !propUserId) {
      setUserId(storedUserId);
    }
  }, [propUserId]);

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get(`/plan/${userId}`);
      setDashData(response.data);
      console.log('Dashboard data loaded:', response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 404) {
        setDashData({ hasPlan: false });
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    // Optimistic update - immediately mark task as done in local state
    setDashData(prev => ({
      ...prev,
      todayTasks: prev.todayTasks.map(task => 
        task.id === taskId ? { ...task, is_completed: 1 } : task
      )
    }));

    // Show difficulty rating popup
    setRatingTask(taskId);
  };

  const submitDifficultyRating = async (rating) => {
    const taskId = ratingTask;
    setRatingTask(null);

    try {
      const response = await api.post('/progress/complete', { taskId, difficultyRating: rating });
      
      if (response.data.planAdapted) {
        toast.success('Task completed! Plan adapted based on your progress.', {
          icon: '🔄',
          style: { background: '#f59e0b', color: '#fff' }
        });
      } else {
        toast.success('Task completed successfully!');
      }
      
      // Refresh dashboard data to get updated stats
      fetchDashboardData();
    } catch (error) {
      console.error('Task completion failed:', error);
      
      // Revert optimistic update on error
      setDashData(prev => ({
        ...prev,
        todayTasks: prev.todayTasks.map(task => 
          task.id === taskId ? { ...task, is_completed: 0 } : task
        )
      }));
      
      toast.error('Failed to complete task');
    }
  };

  const chartData = dashData?.tasks ? (() => {
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en', { weekday: 'short' });
      const count = dashData.tasks.filter(
        t => t.date === dateStr && t.is_completed === 1
      ).length;
      last7.push({ day: dayLabel, completed: count });
    }
    return last7;
  })() : [];

  const todaysTasks = dashData?.todayTasks || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text p-8">
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ListSkeleton />
      </div>
    );
  }

  if (!dashData?.hasPlan) {
    return (
      <div className="min-h-screen bg-background text-text p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <h2 className="font-display text-2xl font-bold mb-4">No Study Plan Yet</h2>
          <p className="text-gray-400 mb-6">Generate a study plan to see your dashboard.</p>
          <button
            onClick={() => window.location.href = '/onboarding'}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
          >
            Start Onboarding
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text p-8">
      <h1 className="font-display text-4xl font-bold mb-8">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <span className="text-3xl font-bold">{dashData?.stats?.completedTasks || 0}</span>
          </div>
          <div className="text-sm text-gray-400">Tasks Completed</div>
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Flame className="w-8 h-8 text-warning" />
            <span className="text-3xl font-bold">{dashData?.stats?.streak || 0}</span>
          </div>
          <div className="text-sm text-gray-400">Day Streak 🔥</div>
          <div className="mt-4 text-xs text-gray-500">Keep it up!</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 text-primary" />
            <span className="text-3xl font-bold">{dashData?.plan?.plan_json?.exam_readiness_estimate || '0%'}</span>
          </div>
          <div className="text-sm text-gray-400">Exam Readiness</div>
          <div className="mt-4 text-xs text-gray-500">{dashData?.plan?.plan_json?.subject || 'General Studies'}</div>
        </Card>

        <Card className="p-6 group">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
            <span className="text-3xl font-bold">{dashData?.plan?.plan_json?.weak_areas?.length || 0}</span>
          </div>
          <div className="text-sm text-gray-400">Weak Areas</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {dashData?.plan?.plan_json?.weak_areas?.slice(0, 3).map((area, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-warning/20 text-warning text-xs rounded-full"
              >
                {area}
              </span>
            )) || <span className="text-xs text-gray-500">None identified</span>}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="font-display text-xl font-bold mb-4">Daily Progress (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
              />
              <Line type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-xl font-bold mb-4">Topic Completion</h3>
          <div className="flex items-center justify-center h-[250px]">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeDasharray={`${dashData.stats?.completionPercent || 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{dashData.stats?.completionPercent || 0}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Today's Tasks */}
      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Today's Tasks</h3>
        <div className="space-y-3">
          {todaysTasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No tasks for today</div>
          ) : (
            todaysTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-background border border-cardBorder rounded-lg hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onChange={() => !task.is_completed && handleCompleteTask(task.id)}
                    disabled={task.is_completed}
                    className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-gray-400">{task.topic}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">{task.estimated_minutes} min</div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Difficulty Rating Modal */}
      {ratingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-96">
            <h3 className="font-display text-xl font-bold mb-4">How hard was this?</h3>
            <div className="text-center mb-6">
              <div className="text-sm text-gray-400 mb-4">Rate the difficulty</div>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => submitDifficultyRating(rating)}
                    className="text-3xl hover:scale-110 transition-transform"
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Easy</span>
                <span>Hard</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
