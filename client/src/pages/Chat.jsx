import { useState, useEffect, useRef } from 'react';
import { Brain, Send, BookOpen, GraduationCap, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import api from '../api';
import toast from 'react-hot-toast';
import './Chat.css';

const Chat = ({ userId: propUserId }) => {
  const [userId, setUserId] = useState(propUserId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userContext, setUserContext] = useState({});
  const [error, setError] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Read userId from localStorage if not provided via props
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId && !propUserId) {
      setUserId(storedUserId);
    }
  }, [propUserId]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    console.log('Chat page userId:', userId);
    if (!userId) return;

    setUserId(userId);
    fetchChatHistory();
    fetchContext();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const response = await api.get(`/chat/history/${userId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      // Don't show error toast for history fetch, just start with empty messages
    }
  };

  const fetchContext = async () => {
    try {
      // Fetch plan data
      const planResponse = await api.get(`/plan/${userId}`);
      
      const plan = planResponse.data;
      const planJson = plan.plan?.plan_json || {};
      
      // Calculate current day based on actual progress data
      const completedDays = planJson.days?.filter(d => d.tasks?.some(t => t.completed))?.length || 0;
      const currentDay = Math.min(completedDays + 1, planJson.total_days || 14);
      
      console.log('Chat context calculation:', {
        completedDays,
        currentDay,
        totalDays: planJson.total_days,
        daysLength: planJson.days?.length
      });
      
      setUserContext({
        subject: planJson.subject || 'Unknown',
        currentDay: currentDay,
        totalDays: planJson.total_days || 14,
        weakAreas: planJson.weak_areas || [],
        completionPercent: plan.stats?.completionPercent || 0,
        tasksCompleted: plan.stats?.completedTasks || 0
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching context:', error);
      // Only set error if it's not a 404 (404 means no plan, which is ok for chat)
      if (error.response && error.response.status !== 404) {
        setError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (quickAction = null) => {
    const messageToSend = quickAction || input;
    if (!messageToSend.trim()) return;

    const userMessage = { role: 'user', content: messageToSend };
    setMessages([...messages, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await api.post('/chat', {
        userId,
        message: messageToSend,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (error) {
      toast.error('Failed to send message');
      setMessages((prev) => [...prev.slice(0, -1)]);
    } finally {
      setSending(false);
    }
  };

  const handleQuickAction = (action) => {
    const suggestions = [
      `Help me with today's ${userContext.subject} tasks`,
      'I am stuck on something',
      'Quiz me on what I studied'
    ];
    setInput(suggestions[action] || action);
    // Auto-send for simple suggestions
    if (action !== 2) { // Don't auto-send "I'm stuck" since user needs to complete it
      handleSend(suggestions[action]);
    }
  };

  const toggleMessageExpansion = (index) => {
    setExpandedMessages(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-8" />
          <div className="h-96 bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background text-text p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h2 className="font-display text-2xl font-bold mb-4">No User ID Found</h2>
          <p className="text-gray-400 mb-6">Please complete onboarding to access the AI study coach.</p>
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

  if (error && error.response && error.response.status === 500) {
    return (
      <div className="min-h-screen bg-background text-text p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="font-display text-2xl font-bold mb-4">Something Went Wrong</h2>
          <p className="text-gray-400 mb-6">{error.message || 'Failed to load chat'}</p>
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
    <div className="h-screen bg-background text-text p-8 flex flex-col">
      <h1 className="font-display text-4xl font-bold mb-8">AI Study Coach</h1>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        {/* Chat Window (70%) */}
        <div className="col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="text-center text-gray-500 py-12">Loading chat...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-lg mb-2">Start a conversation with your AI study coach!</p>
                  <p className="text-sm">Ask questions, get explanations, or request quizzes.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isLong = msg.content.split('\n').length > 4;
                  const isExpanded = expandedMessages[index];
                  const displayContent = isLong && !isExpanded 
                    ? msg.content.split('\n').slice(0, 4).join('\n') 
                    : msg.content;
                  
                  return (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3 flex-shrink-0">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] p-4 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-primary text-white'
                            : 'bg-card border border-cardBorder'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">{displayContent}</div>
                        {isLong && !isExpanded && (
                          <button
                            onClick={() => toggleMessageExpansion(index)}
                            className="text-xs text-gray-400 mt-2 hover:text-primary transition-colors"
                          >
                            Read more
                          </button>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {sending && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3 flex-shrink-0">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-card border border-cardBorder p-4 rounded-2xl">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-cardBorder">
              <div className="flex gap-3 mb-3">
                {[
                  `Help me with today's ${userContext.subject} tasks`,
                  'I am stuck on something',
                  'Quiz me on what I studied'
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(index)}
                    className="px-3 py-1.5 bg-card border border-cardBorder rounded-full text-xs text-gray-400 hover:border-primary hover:text-primary transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask your study coach anything..."
                  className="flex-1 px-4 py-3 bg-background border border-cardBorder rounded-lg focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={sending || !input.trim()}
                  className="px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Context Panel (30%) */}
        <div className="col-span-1">
          <Card className="p-6 h-full">
            <h3 className="font-display text-xl font-bold mb-6">Study Context</h3>
            
            <div className="space-y-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Subject</div>
                <div className="font-medium">{userContext.subject}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Progress</div>
                <div className="font-medium">
                  {userContext.currentDay && userContext.totalDays 
                    ? `Day ${userContext.currentDay} of ${userContext.totalDays}`
                    : 'Day 1 of 14'}
                </div>
                <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ 
                      width: `${userContext.totalDays && userContext.currentDay 
                        ? ((userContext.currentDay / userContext.totalDays) * 100) 
                        : 7.14}%` 
                    }}
                  />
                </div>
              </div>

              {userContext.weakAreas && userContext.weakAreas.length > 0 && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Weak Areas</div>
                  <div className="space-y-2">
                    {userContext.weakAreas.map((area, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-warning" />
                        <span>{area}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-cardBorder">
                <div className="text-sm text-gray-400 mb-4">Quick Actions</div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleQuickAction('explain')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-background border border-cardBorder hover:border-primary transition-colors text-left"
                  >
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="text-sm">Explain today's topic</span>
                  </button>
                  
                  <button
                    onClick={() => handleQuickAction('quiz')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-background border border-cardBorder hover:border-primary transition-colors text-left"
                  >
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <span className="text-sm">Quiz me</span>
                  </button>
                  
                  <button
                    onClick={() => handleQuickAction('stuck')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-background border border-cardBorder hover:border-primary transition-colors text-left"
                  >
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm">I'm stuck on...</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;
