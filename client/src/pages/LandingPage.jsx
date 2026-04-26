import { useNavigate } from 'react-router-dom';
import { Brain, BookOpen, GraduationCap, ArrowRight } from 'lucide-react';
import Card from '../components/Card';

const LandingPage = () => {
  const navigate = useNavigate();

  const userTypes = [
    {
      id: 'guest',
      title: 'Guest User',
      description: 'Quick access without account creation',
      icon: <BookOpen className="w-12 h-12" />,
      color: 'bg-primary',
      route: '/guest'
    },
    {
      id: 'student',
      title: 'Student',
      description: 'Full features with personalized study plans',
      icon: <GraduationCap className="w-12 h-12" />,
      color: 'bg-green-600',
      route: '/guest'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-text flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Brain className="w-16 h-16 text-primary" />
          <h1 className="font-display text-5xl font-bold">StudyMind</h1>
        </div>
        <p className="text-xl text-gray-400">AI-Powered Study Planning & Coaching</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {userTypes.map((type) => (
          <Card
            key={type.id}
            onClick={() => navigate(type.route)}
            className="p-8 cursor-pointer hover:border-primary transition-all group"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${type.color} bg-opacity-20 group-hover:scale-110 transition-transform`}>
                <div className={`${type.color.replace('bg-', 'text-')}`}>
                  {type.icon}
                </div>
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">{type.title}</h2>
                <p className="text-gray-400 text-sm">{type.description}</p>
              </div>
              <div className={`flex items-center gap-2 ${type.color.replace('bg-', 'text-')} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <span className="text-sm font-medium">Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>Choose your user type to begin your personalized study journey</p>
      </div>
    </div>
  );
};

export default LandingPage;
