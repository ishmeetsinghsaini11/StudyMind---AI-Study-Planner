import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { RefreshCw, X, Check } from 'lucide-react';
import Card from '../components/Card';
import { ListSkeleton } from '../components/LoadingSkeleton';
import api from '../api';
import toast from 'react-hot-toast';
import './StudyPlan.css';

const StudyPlan = ({ userId: propUserId }) => {
  const [userId, setUserId] = useState(propUserId);
  const [plan, setPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [adapting, setAdapting] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Read userId from localStorage if not provided via props
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId && !propUserId) {
      setUserId(storedUserId);
    }
  }, [propUserId]);

  useEffect(() => {
    if (userId) {
      fetchPlan();
    }
  }, [userId]);

  const fetchPlan = async () => {
    try {
      const response = await api.get(`/plan/${userId}`);
      console.log('Plan response:', response.data);
      
      if (response.data.hasPlan) {
        setPlan(response.data.plan);
        setTasks(response.data.tasks || []);
        setTodayTasks(response.data.todayTasks || []);
        
        // Transform plan data into FullCalendar events
        const events = transformToEvents(response.data.plan.plan_json, response.data.tasks);
        setEvents(events);
        console.log('Calendar events:', events.length, events[0]);
      }
      
      setError(null);
    } catch (error) {
      console.error('Plan fetch error:', error.response?.data || error.message);
      // Show specific error message
      if (error.response?.status === 404) {
        setError('no_plan');  // show "generate plan" prompt
      } else {
        setError(error.response?.data?.error || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const transformToEvents = (planJson, tasks) => {
    if (!planJson?.days) return [];
    
    const allEvents = [];
    planJson.days.forEach(day => {
      day.tasks.forEach(task => {
        const matchedTask = tasks.find(
          t => t.day_number === day.day && t.title === task.title
        );
        allEvents.push({
          id: matchedTask?.id || `day-${day.day}-task-${task.title}`,
          title: task.title || day.topics?.[0] || 'Study Task',
          date: day.date,
          backgroundColor:
            day.difficulty === 'easy' ? '#10b981' :
            day.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
          borderColor: 'transparent',
          extendedProps: {
            taskId: matchedTask?.id,
            topic: day.topics?.[0] || 'Study',
            duration: task.duration_mins,
            type: task.type,
            resources: day.resources,
            rationale: day.rationale,
            difficulty: day.difficulty,
            isCompleted: matchedTask?.is_completed === 1,
            dayNumber: day.day
          }
        });
      });
    });
    return allEvents;
  };

  const handleAdaptPlan = async () => {
    const confirmed = window.confirm('Re-adapt plan based on your progress?');
    if (!confirmed) return;

    setAdapting(true);
    try {
      await api.get(`/plan/${userId}?adapt=true`);
      toast.success('Plan adapted successfully!');
      fetchPlan();
    } catch (error) {
      toast.error('Failed to adapt plan');
    } finally {
      setAdapting(false);
    }
  };

  const handleCompleteTask = async (taskId, difficultyRating = null) => {
    setCompletingTask(true);
    try {
      await api.post('/progress/complete', { taskId, difficultyRating });
      toast.success('Task completed successfully!');
      setSelectedEvent(null);
      setShowRating(false);
      fetchPlan();
    } catch (error) {
      toast.error('Failed to complete task');
    } finally {
      setCompletingTask(false);
    }
  };

  const getEventColor = (difficulty) => {
    const colors = {
      easy: '#10b981',
      medium: '#f59e0b',
      hard: '#ef4444',
    };
    return colors[difficulty] || '#6366f1';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text p-8">
        <ListSkeleton />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background text-text p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <h2 className="font-display text-2xl font-bold mb-4">No User ID Found</h2>
          <p className="text-gray-400 mb-6">Please complete onboarding to access your study plan.</p>
          <button
            onClick={() => window.location.href = '/onboarding'}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
          >
            Go to Onboarding
          </button>
        </Card>
      </div>
    );
  }

  if (error && error.response?.status === 404) {
    return (
      <div className="min-h-screen bg-background text-text p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <h2 className="font-display text-2xl font-bold mb-4">No Study Plan Found</h2>
          <p className="text-gray-400 mb-6">You don't have a study plan yet. Generate one to get started!</p>
          <button
            onClick={() => window.location.href = '/onboarding'}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
          >
            Generate Study Plan
          </button>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-text p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <h2 className="font-display text-2xl font-bold mb-4 text-red-500">Something Went Wrong</h2>
          <p className="text-gray-400 mb-6">{error.message || 'Failed to load study plan'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl font-bold">Study Plan</h1>
        <button
          onClick={handleAdaptPlan}
          disabled={adapting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${adapting ? 'animate-spin' : ''}`} />
          Re-adapt Plan
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar - Today's Tasks */}
        <div className="col-span-1">
          <Card className="p-6">
            <h3 className="font-display text-xl font-bold mb-4">Today's Tasks</h3>
            <div className="space-y-3">
              {todayTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${
                    task.is_completed === 1
                      ? 'border-success bg-success/10'
                      : 'border-cardBorder bg-background'
                  }`}
                >
                  <div className="text-sm font-medium">{task.title}</div>
                  <div className="text-xs text-gray-400">{task.estimated_minutes} min</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <div className="col-span-3">
          <Card className="p-6">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={events}
              eventClick={(info) => {
                setSelectedEvent(info.event);
              }}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek'
              }}
              height="auto"
              eventClassNames="cursor-pointer"
            />
          </Card>
        </div>
      </div>

      {/* Task Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold">{selectedEvent.title}</h3>
              <button onClick={() => {
                setSelectedEvent(null);
                setShowRating(false);
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">Task Title</div>
                <div className="font-medium">{selectedEvent.title}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Topic</div>
                <div className="font-medium">{selectedEvent.extendedProps?.topic || 'General Study'}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400">Duration Estimate</div>
                <div className="font-medium">{selectedEvent.extendedProps?.duration || 30} minutes</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400">Task Type</div>
                <div className="font-medium capitalize">{selectedEvent.extendedProps?.type || 'practice'}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Day</div>
                <div className="font-medium">Day {selectedEvent.extendedProps?.dayNumber}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Difficulty</div>
                <div className="font-medium capitalize">{selectedEvent.extendedProps?.difficulty || 'medium'}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Status</div>
                <div className="font-medium">
                  {selectedEvent.extendedProps?.isCompleted ? (
                    <span className="text-success flex items-center gap-2">
                      <Check className="w-4 h-4" /> Completed
                    </span>
                  ) : (
                    <span className="text-gray-400">Not completed</span>
                  )}
                </div>
              </div>

              {selectedEvent.extendedProps?.resources && selectedEvent.extendedProps.resources.length > 0 && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Resources</div>
                  <div className="space-y-2">
                    {selectedEvent.extendedProps.resources.map((resource, index) => (
                      <div key={index}>
                        {resource.startsWith('http') ? (
                          <a
                            href={resource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline block"
                          >
                            {resource}
                          </a>
                        ) : (
                          <div className="text-sm">{resource}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.extendedProps?.dayRationale && (
                <div>
                  <div className="text-sm text-gray-400">AI Rationale</div>
                  <div className="font-medium text-sm">{selectedEvent.extendedProps.dayRationale}</div>
                </div>
              )}

              {!showRating ? (
                <button
                  onClick={() => setShowRating(true)}
                  disabled={completingTask}
                  className="w-full py-3 rounded-lg bg-success hover:bg-success/90 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  Mark Complete ✓
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 text-center mb-3">How difficult was this task?</div>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleCompleteTask(selectedEvent.extendedProps.taskId, rating)}
                          disabled={completingTask}
                          className="text-3xl transition-all hover:scale-125 disabled:opacity-50 disabled:hover:scale-100 focus:outline-none"
                          style={{ color: '#fbbf24' }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-3 px-4">
                      <span>Easy</span>
                      <span>Very Hard</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRating(false)}
                    className="w-full py-2 rounded-lg border border-cardBorder hover:border-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudyPlan;
