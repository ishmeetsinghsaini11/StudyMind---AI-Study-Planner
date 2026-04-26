import { useState, useEffect } from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import Card from '../components/Card';
import api from '../api';
import toast from 'react-hot-toast';
import './Flashcards.css';

const Flashcards = ({ userId: propUserId }) => {
  const [userId, setUserId] = useState(propUserId);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [groupedCards, setGroupedCards] = useState({});
  const [currentTopic, setCurrentTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
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
      fetchFlashcards();
    }
  }, [userId]);

  const fetchFlashcards = async () => {
    try {
      const response = await api.get(`/flashcards/${userId}`);
      setGroupedCards(response.data);
      const topics = Object.keys(response.data);
      if (topics.length > 0) {
        setCurrentTopic(topics[0]);
        setFlashcards(response.data[topics[0]]);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setGenerating(true);
    try {
      const response = await api.post('/flashcards/generate', { userId, topic });
      setFlashcards(response.data);
      setCurrentTopic(topic);
      setCurrentIndex(0);
      setFlipped(false);
      setSessionComplete(false);
      toast.success('Flashcards generated successfully!');
      fetchFlashcards();
    } catch (error) {
      toast.error('Failed to generate cards');
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (rating) => {
    const card = flashcards[currentIndex];
    console.log('Reviewing card:', card.id, 'rating:', rating);
    
    try {
      await api.post('/flashcards/review', { cardId: card.id, rating });
      
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setFlipped(false);
      } else {
        // Session complete
        setSessionComplete(true);
        setFlipped(false);
      }
    } catch (error) {
      console.error('Review failed:', error.response?.data);
      // Don't block the user — still move to next card even if review fails
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setFlipped(false);
      } else {
        setSessionComplete(true);
        setFlipped(false);
      }
      toast.error('Could not save review, but continuing...');
    }
  };

  const handleTopicChange = (newTopic) => {
    setCurrentTopic(newTopic);
    setFlashcards(groupedCards[newTopic]);
    setCurrentIndex(0);
    setFlipped(false);
    setSessionComplete(false);
  };

  const handleRestartSession = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setSessionComplete(false);
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
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h2 className="font-display text-2xl font-bold mb-4">No User ID Found</h2>
          <p className="text-gray-400 mb-6">Please complete onboarding to access flashcards.</p>
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

  return (
    <div className="min-h-screen bg-background text-text p-8">
      <h1 className="font-display text-4xl font-bold mb-8">Flashcards</h1>

      {/* Generate Section */}
      <Card className="p-6 mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="flex-1 px-4 py-3 bg-background border border-cardBorder rounded-lg focus:border-primary focus:outline-none"
            placeholder="Enter topic name..."
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            {generating ? 'Generating flashcards with AI...' : 'Generate Cards'}
          </button>
        </div>
      </Card>

      {/* Topic Tabs */}
      {Object.keys(groupedCards).length > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          {Object.keys(groupedCards).map((t) => (
            <button
              key={t}
              onClick={() => handleTopicChange(t)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentTopic === t
                  ? 'bg-primary text-white'
                  : 'bg-card border border-cardBorder hover:border-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Flashcard Area */}
      {flashcards.length > 0 ? (
        <div className="flex flex-col items-center">
          {!sessionComplete ? (
            <>
              <div className="mb-4 text-gray-400">
                Card {currentIndex + 1} of {flashcards.length}
              </div>

              <div
                className={`flashcard-container w-full max-w-2xl h-96 cursor-pointer ${flipped ? 'flipped' : ''}`}
                onClick={() => setFlipped(!flipped)}
              >
                <div className="flashcard-inner">
                  <div className="flashcard-front bg-primary rounded-2xl p-8 flex items-center justify-center">
                    <p className="text-2xl font-medium text-center">{flashcards[currentIndex]?.question}</p>
                  </div>
                  <div className="flashcard-back bg-success rounded-2xl p-8 flex items-center justify-center">
                    <p className="text-2xl font-medium text-center">{flashcards[currentIndex]?.answer}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => handleReview('easy')}
                  className="flex items-center gap-2 px-8 py-3 rounded-lg bg-success hover:bg-success/90 text-white font-medium transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Easy
                </button>
                <button
                  onClick={() => handleReview('hard')}
                  className="flex items-center gap-2 px-8 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                >
                  <X className="w-5 h-5" />
                  Hard
                </button>
              </div>
            </>
          ) : (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="font-display text-3xl font-bold mb-4">Session complete!</h2>
              <p className="text-gray-400 mb-8">You've reviewed all {flashcards.length} flashcards!</p>
              <button
                onClick={handleRestartSession}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
              >
                Restart Session
              </button>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <p className="text-xl text-gray-400 mb-4">No flashcards yet</p>
          <p className="text-gray-500">Enter a topic above to generate your first set!</p>
        </Card>
      )}
    </div>
  );
};

export default Flashcards;
