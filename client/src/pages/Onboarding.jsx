import { useState, useEffect } from 'react';
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

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subjects: [],
    examDate: '',
    learningStyle: '',
    knowledgeLevel: 50,
    dailyHours: 3,
    energyPattern: '',
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

  const addWeakArea = (area) => {
    if (area && !formData.weakAreas.includes(area)) {
      setFormData({ ...formData, weakAreas: [...formData.weakAreas, area] });
    }
  };

  const handleWeakAreaInput = (e) => {
    const value = e.target.value;
    if (e.key === 'Enter') {
      e.preventDefault();
      addWeakArea(value);
      e.target.value = '';
    }
  };

  const removeWeakArea = (areaToRemove) => {
    setFormData({ ...formData, weakAreas: formData.weakAreas.filter(area => area !== areaToRemove) });
  };

  const addSubject = (subject) => {
    console.log('Adding subject:', subject);
    if (subject && !formData.subjects.includes(subject)) {
      const newSubjects = [...formData.subjects, subject];
      console.log('New subjects array:', newSubjects);
      setFormData({ ...formData, subjects: newSubjects });
    }
  };

  const removeSubject = (subjectToRemove) => {
    setFormData({ ...formData, subjects: formData.subjects.filter(s => s !== subjectToRemove) });
  };

  const handleSubjectInput = (e) => {
    const value = e.target.value;
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubject(value);
      e.target.value = '';
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, syllabusFile: file });
      toast.success('Syllabus file selected');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Step 1: Create user
      const payload = {
        name: formData.name,
        email: formData.email,
        learning_style: formData.learningStyle,
        knowledge_level: formData.knowledgeLevel,
        daily_hours: formData.dailyHours,
        energy_pattern: formData.energyPattern,
        goal: formData.goal,
      };
      console.log('Sending register payload:', payload);
      
      const registerRes = await api.post('/auth/register', payload);
      const { userId, name } = registerRes.data;
      
      localStorage.setItem('userId', String(userId));
      localStorage.setItem('userName', name);
      localStorage.setItem('userEmail', payload.email);
      
      // Now generate plan
      await generatePlan(userId);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 409) {
        // Account exists — offer to login instead of blocking
        const existingUserId = err.response.data.userId;
        const existingName = err.response.data.name;
        
        // Ask user what they want to do
        const wantsLogin = window.confirm(
          `Account found for ${payload.email} (${existingName}).\n\nClick OK to continue with this account, or Cancel to use a different email.` 
        );
        
        if (wantsLogin) {
          // Reuse existing account and generate a fresh plan
          localStorage.setItem('userId', String(existingUserId));
          localStorage.setItem('userName', existingName);
          localStorage.setItem('userEmail', payload.email);
          await generatePlan(existingUserId);
          navigate('/');
        }
        // If Cancel: stays on onboarding, user can change email
      } else {
        toast.error('Registration failed: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (userId) => {
    let syllabusSummary = formData.syllabusSummary;

    // Step 2: If PDF was uploaded, upload it and get summary
    if (formData.syllabusFile) {
      const formDataUpload = new FormData();
      formDataUpload.append('file', formData.syllabusFile);

      const uploadResponse = await api.post('/upload/syllabus', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      syllabusSummary = uploadResponse.data.summary;
    }

    // Step 3: Generate plan
    const planResponse = await api.post('/plan/generate', {
      userId,
      subject: formData.subjects.join(', '), // Join for backward compatibility
      subjects: formData.subjects,
      syllabusSummary: syllabusSummary || 'No syllabus provided',
      userProfile: {
        name: formData.name,
        email: formData.email,
        subject: formData.subjects.join(', '), // Join for backward compatibility
        subjects: formData.subjects,
        examDate: formData.examDate,
        learningStyle: formData.learningStyle,
        knowledgeLevel: formData.knowledgeLevel,
        dailyHours: formData.dailyHours,
        energyPattern: formData.energyPattern,
        weakAreas: formData.weakAreas,
        goal: formData.goal,
        totalDays: 14,
      },
    });

    console.log('Plan generation response:', planResponse.data);
    localStorage.setItem('planGenerated', 'true');
    console.log('Plan generated successfully');
    toast.success('Study plan generated successfully!');
  };

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
                  s <= step
                    ? 'bg-primary text-white'
                    : 'bg-card border border-cardBorder text-gray-500'
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
              <h2 className="font-display text-3xl font-bold mb-8">Let's get started!</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-cardBorder rounded-lg focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-cardBorder rounded-lg focus:border-primary focus:outline-none"
                  placeholder="Enter your email"
                />
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
                        const datalistOptions = Array.from(document.getElementById('subjects')?.options || []).map(opt => opt.value);
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <h2 className="font-display text-3xl font-bold mb-8">How do you learn best?</h2>

              <div>
                <label className="block text-sm font-medium mb-4">Learning Style</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {learningStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setFormData({ ...formData, learningStyle: style.id })}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        formData.learningStyle === style.id
                          ? 'border-primary bg-primary/20'
                          : 'border-cardBorder bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="text-4xl mb-2">{style.icon}</div>
                      <div className="font-medium">{style.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">
                  Knowledge Level: {formData.knowledgeLevel}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.knowledgeLevel}
                  onChange={(e) => setFormData({ ...formData, knowledgeLevel: parseInt(e.target.value) })}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Beginner</span>
                  <span>Intermediate</span>
                  <span>Advanced</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">
                  Daily Available Hours: {formData.dailyHours}
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={formData.dailyHours}
                  onChange={(e) => setFormData({ ...formData, dailyHours: parseInt(e.target.value) })}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <h2 className="font-display text-3xl font-bold mb-8">Final details</h2>

              <div>
                <label className="block text-sm font-medium mb-4">Energy Pattern</label>
                <div className="grid grid-cols-3 gap-4">
                  {energyPatterns.map((pattern) => (
                    <button
                      key={pattern.id}
                      onClick={() => setFormData({ ...formData, energyPattern: pattern.id })}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        formData.energyPattern === pattern.id
                          ? 'border-primary bg-primary/20'
                          : 'border-cardBorder bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="text-4xl mb-2">{pattern.icon}</div>
                      <div className="font-medium">{pattern.label}</div>
                    </button>
                  ))}
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
                            <X size={14} />
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

              <div>
                <label className="block text-sm font-medium mb-2">Goal Statement</label>
                <div className="relative">
                  <textarea
                    value={formData.goal}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setFormData({ ...formData, goal: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-background border border-cardBorder rounded-lg focus:border-primary focus:outline-none h-32 resize-none"
                    placeholder="I want to score 90% in my upcoming exam..."
                    maxLength={200}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                    {formData.goal.length}/200
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Upload Syllabus (PDF)</label>
                <div className="border-2 border-dashed border-cardBorder rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="syllabus-upload"
                  />
                  <label
                    htmlFor="syllabus-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <Upload className="w-12 h-12 text-gray-500" />
                    <div className="text-gray-400">
                      Click to upload or drag and drop
                    </div>
                    <div className="text-xs text-gray-500">PDF files only</div>
                  </label>
                  {formData.syllabusFile && (
                    <div className="mt-4 text-sm text-success">
                      ✓ {formData.syllabusFile.name} selected
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-8 border-t border-cardBorder">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 rounded-lg border border-cardBorder hover:border-primary transition-colors"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={(step === 1 && (!formData.name || !formData.email || !formData.subjects.length || !formData.examDate || !formData.dailyHours)) || (step === 2 && !formData.learningStyle)}
                className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.energyPattern || !formData.goal}
                className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '🧠 Building your plan...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

        {/* Loading Animation */}
        {loading && (
          <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xl font-medium">🧠 Building your plan...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
