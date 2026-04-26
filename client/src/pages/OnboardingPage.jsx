import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Upload, X } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

// Add CSS for slider styling
const sliderStyles = `
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: #6366f1;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid #1e1e2e;
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #6366f1;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid #1e1e2e;
  }
  
  input[type="range"]::-webkit-slider-thumb:hover {
    background: #818cf8;
  }
  
  input[type="range"]::-moz-range-thumb:hover {
    background: #818cf8;
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = sliderStyles;
  document.head.appendChild(styleSheet);
}

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subjects: [],
    examDate: '',
    dailyHours: 3,
    learningStyle: '',
    knowledgeLevel: 50,
    learningPattern: '',
    weakAreas: [],
    goal: '',
    syllabusSummary: '',
    syllabusFile: null,
  });

  // Calculate min date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  // Calculate max date (6 years from tomorrow)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 1);
  maxDate.setFullYear(maxDate.getFullYear() + 6);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const learningStyles = [
    { id: 'visual', icon: '🎨', label: 'Visual' },
    { id: 'auditory', icon: '🎧', label: 'Auditory' },
    { id: 'reading', icon: '📖', label: 'Reading' },
    { id: 'kinesthetic', icon: '🏃', label: 'Kinesthetic' },
  ];

  const energyPatterns = [
    { id: 'morning', icon: '🌅', label: 'Morning' },
    { id: 'night', icon: '🌙', label: 'Night Owl' },
    { id: 'balanced', icon: '⚡', label: 'Balanced' },
  ];

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, syllabusFile: file });
      toast.success('Syllabus file selected');
    }
  };

  const addSubject = (subject) => {
    console.log('Adding subject:', subject);
    if (subject && !formData.subjects.includes(subject)) {
      const newSubjects = [...formData.subjects, subject];
      console.log('New subjects array:', newSubjects);
      setFormData({ ...formData, subjects: newSubjects });
    }
  };

  const addWeakArea = (area) => {
    if (area && !formData.weakAreas.includes(area)) {
      setFormData({ ...formData, weakAreas: [...formData.weakAreas, area] });
    }
  };

  const removeWeakArea = (areaToRemove) => {
    setFormData({ ...formData, weakAreas: formData.weakAreas.filter(area => area !== areaToRemove) });
  };

  const handleWeakAreaInput = (e) => {
    const value = e.target.value;
    if (e.key === 'Enter') {
      e.preventDefault();
      addWeakArea(value);
      e.target.value = '';
    }
  };

  const handleSubjectInput = (e) => {
    const value = e.target.value;
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubject(value);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      const userId = localStorage.getItem('userId')
      console.log('=== ONBOARDING SUBMIT ===')
      console.log('userId from localStorage:', userId)
      
      if (!userId) {
        console.log('NO USERID — redirecting to /guest')
        navigate('/guest')
        return
      }

      // Save profile first (optional - don't stop if fails)
      console.log('Saving profile...')
      try {
        await api.put(`/guest/profile/${userId}`, {
          learning_style: formData.learningStyle,
          knowledge_level: formData.knowledgeLevel,
          daily_hours: formData.dailyHours,
          energy_pattern: formData.learningPattern,
          goal: formData.goal
        })
        console.log('Profile saved')
      } catch(err) {
        console.warn('Profile save failed, continuing anyway:', err.message)
      }

      // Generate plan
      console.log('Generating plan...')
      const planRes = await api.post('/plan/generate', {
        userId,
        subject: formData.subjects.join(', '), // Join for backward compatibility
        subjects: formData.subjects,
        userProfile: {
          subject: formData.subjects.join(', '), // Join for backward compatibility
          subjects: formData.subjects,
          name: localStorage.getItem('userName'),
          knowledgeLevel: formData.knowledgeLevel,
          dailyHours: formData.dailyHours,
          learningStyle: formData.learningStyle,
          energyPattern: formData.learningPattern,
          goal: formData.goal,
          weakAreas: formData.weakAreas,
          totalDays: 14,
        },
        syllabusSummary: formData.syllabusSummary || ''
      })
      console.log('Plan generated:', planRes.data)

      // Verify userId still in localStorage
      const checkId = localStorage.getItem('userId')
      console.log('userId after generation:', checkId)

      console.log('Navigating to dashboard...')
      navigate('/')

    } catch(err) {
      console.error('Onboarding error:', err.response?.data || err.message)
      toast.error('Failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-12 h-12 rounded-full font-semibold transition-all ${
                  s <= step ? 'bg-primary text-white' : 'bg-card border border-cardBorder text-gray-500'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
          <div className="h-2 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-card border border-cardBorder rounded-2xl p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-display text-3xl font-bold mb-8">What do you want to study?</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subjects</label>
                <div className="space-y-3">
                  {formData.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.subjects.map((subject, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary rounded-full text-sm"
                        >
                          {subject}
                          <button
                            onClick={() => removeSubject(subject)}
                            className="text-primary hover:text-white transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      list="subjects"
                      onKeyDown={handleSubjectInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') return;
                        // Check if it matches a datalist option
                        const datalistOptions = Array.from(document.getElementById('subjects').options).map(opt => opt.value);
                        if (datalistOptions.includes(value)) {
                          addSubject(value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full px-4 py-3 bg-background border border-cardBorder rounded-lg focus:border-primary focus:outline-none"
                      placeholder="Search or type subjects..."
                    />
                    <datalist id="subjects">
                      <option value="Mathematics" />
                      <option value="Physics" />
                      <option value="Chemistry" />
                      <option value="Biology" />
                      <option value="Computer Science" />
                      <option value="React.js" />
                      <option value="JavaScript" />
                      <option value="Python" />
                      <option value="Java" />
                      <option value="Data Structures" />
                      <option value="Algorithms" />
                      <option value="Machine Learning" />
                      <option value="History" />
                      <option value="Geography" />
                      <option value="Economics" />
                      <option value="English Literature" />
                      <option value="Psychology" />
                      <option value="Business Studies" />
                      <option value="Accounting" />
                      <option value="Statistics" />
                    </datalist>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Exam Date</label>
                <div 
                  className="w-full px-4 py-3 bg-background border border-cardBorder rounded-lg focus-within:border-primary transition-colors cursor-pointer"
                  onClick={() => document.getElementById('examDateInput').showPicker?.()}
                >
                  <input
                    id="examDateInput"
                    type="date"
                    min={minDateStr}
                    max={maxDateStr}
                    value={formData.examDate}
                    onChange={(e) => {
                      console.log('Date changed:', e.target.value);
                      setFormData({ ...formData, examDate: e.target.value });
                    }}
                    className="w-full bg-transparent outline-none text-gray-300 cursor-pointer"
                    style={{ colorScheme: 'dark', caretColor: 'transparent' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Daily Study Hours</label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.dailyHours}
                    onChange={(e) => {
                      console.log('Hours changed:', parseInt(e.target.value));
                      setFormData({ ...formData, dailyHours: parseInt(e.target.value) });
                    }}
                    className="w-full h-2 bg-cardBorder rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(formData.dailyHours / 10) * 100}%, #2a2a3a ${(formData.dailyHours / 10) * 100}%, #2a2a3a 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0h</span>
                    <span>5h</span>
                    <span>10h</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-primary">{formData.dailyHours}</span>
                    <span className="text-gray-400 ml-1">hours per day</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-3xl font-bold mb-8">How do you learn best?</h2>
              
              <div>
                <label className="block text-sm font-medium mb-4">Learning Style</label>
                <div className="grid grid-cols-2 gap-4">
                  {learningStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setFormData({ ...formData, learningStyle: style.id })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.learningStyle === style.id
                          ? 'border-primary bg-primary/10'
                          : 'border-cardBorder hover:border-primary'
                      }`}
                    >
                      <div className="text-3xl mb-2">{style.icon}</div>
                      <div className="font-medium">{style.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Knowledge Level: {formData.knowledgeLevel}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.knowledgeLevel}
                  onChange={(e) => setFormData({ ...formData, knowledgeLevel: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Beginner</span>
                  <span>Advanced</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Weak Areas (optional)</label>
                <div className="space-y-3">
                  {formData.weakAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.weakAreas.map((area, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-20 border border-red-400 rounded-full text-sm text-red-300"
                        >
                          {area}
                          <button
                            onClick={() => removeWeakArea(area)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    onKeyDown={handleWeakAreaInput}
                    className="w-full px-4 py-3 bg-background border border-cardBorder rounded-lg focus:border-primary focus:outline-none"
                    placeholder="Type weak area and press Enter to add..."
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-display text-3xl font-bold mb-8">Final details</h2>
              
              <div>
                <label className="block text-sm font-medium mb-4">Energy Pattern</label>
                <div className="grid grid-cols-3 gap-4">
                  {energyPatterns.map((pattern) => (
                    <button
                      key={pattern.id}
                      onClick={() => setFormData({ ...formData, learningPattern: pattern.id })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.learningPattern === pattern.id
                          ? 'border-primary bg-primary/10'
                          : 'border-cardBorder hover:border-primary'
                      }`}
                    >
                      <div className="text-3xl mb-2">{pattern.icon}</div>
                      <div className="font-medium">{pattern.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Goal</label>
                <div className="relative">
                  <textarea
                    value={formData.goal}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setFormData({ ...formData, goal: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-background border border-cardBorder rounded-lg focus:border-primary focus:outline-none resize-none"
                    rows={3}
                    placeholder="What do you want to achieve?"
                    maxLength={200}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                    {formData.goal.length}/200
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Syllabus (optional)</label>
                <div className="border-2 border-dashed border-cardBorder rounded-lg p-8 text-center">
                  {formData.syllabusFile ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{formData.syllabusFile.name}</span>
                      <button
                        onClick={() => setFormData({ ...formData, syllabusFile: null })}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm text-gray-400">Click to upload syllabus PDF</div>
                      <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-6 py-3 border border-cardBorder rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            {(() => {
              console.log('Current form state:', {
                step,
                subjects: formData.subjects,
                subjectsLength: formData.subjects.length,
                examDate: formData.examDate,
                dailyHours: formData.dailyHours,
                learningStyle: formData.learningStyle,
                learningPattern: formData.learningPattern,
                goal: formData.goal
              });
              
              const isStep1Valid = formData.subjects.length > 0 && formData.examDate && formData.dailyHours >= 0;
              const isStep2Valid = !!formData.learningStyle;
              const hasLearningPattern = !!formData.learningPattern;
              const hasGoal = !!formData.goal;
              const isStep3Valid = hasLearningPattern && hasGoal;
              
              console.log('Detailed validation:', {
                isStep1Valid,
                isStep2Valid,
                hasLearningPattern,
                hasGoal,
                isStep3Valid,
                learningPatternValue: formData.learningPattern,
                goalValue: formData.goal
              });
              
              if (step === 3) {
                return (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !isStep3Valid}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate Plan'}
                  </button>
                );
              } else {
                const isDisabled = (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid);
                console.log('Next button disabled:', isDisabled);
                
                return (
                  <button
                    onClick={handleNext}
                    disabled={isDisabled}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                );
              }
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
