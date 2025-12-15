import React, { useState, useEffect } from 'react';
import { BookOpen, Trophy, ChevronRight, Clock, CheckCircle, XCircle, RotateCcw, Settings, RefreshCw, Database } from 'lucide-react';

// Configuration - Update this with your Google Sheet URL
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKOTdOabg8YkThCV3pmIJjUNapPu_3WRoVsXSKPG4JMiH8jEvzQy-N-C8Badz20zMsua0Ni6fk8Dt7/pub?output=csvRL_HERE';

// Topic metadata
const TOPICS_METADATA = {
  form4: {
    title: "Form 4 Topics",
    topics: [
      { id: 'form4-functions', name: 'Functions', description: 'Composite functions, inverse functions' },
      { id: 'form4-quadratic-equations', name: 'Quadratic Equations', description: 'Solving, discriminant, roots' },
      { id: 'form4-quadratic-functions', name: 'Quadratic Functions', description: 'Graphs, max/min points, axis of symmetry' },
      { id: 'form4-indices-logarithms', name: 'Indices & Logarithms', description: 'Laws of indices and logarithms' }
    ]
  },
  form5: {
    title: "Form 5 Topics",
    topics: [
      { id: 'form5-progressions', name: 'Progressions', description: 'Arithmetic and geometric progressions' },
      { id: 'form5-integration', name: 'Integration', description: 'Indefinite and definite integration' },
      { id: 'form5-vectors', name: 'Vectors', description: 'Vector operations, magnitude, unit vectors' },
      { id: 'form5-probability', name: 'Probability', description: 'Basic probability, independent events' }
    ]
  }
};

export default function SPMAddMathApp() {
  const [questionsData, setQuestionsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch questions from Google Sheets
  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SHEET_URL);
      const csvText = await response.text();
      const parsed = parseCSVToQuestions(csvText);
      setQuestionsData(parsed);
      setLastUpdated(new Date());
      localStorage.setItem('spm-questions-cache', JSON.stringify(parsed));
      localStorage.setItem('spm-questions-timestamp', new Date().toISOString());
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Try to load from cache
      const cached = localStorage.getItem('spm-questions-cache');
      if (cached) {
        setQuestionsData(JSON.parse(cached));
        const timestamp = localStorage.getItem('spm-questions-timestamp');
        setLastUpdated(timestamp ? new Date(timestamp) : null);
      }
      alert('Could not fetch latest questions. Using cached version.');
    }
    setIsLoading(false);
  };

  // Parse CSV to questions object
  const parseCSVToQuestions = (csvText) => {
    const lines = csvText.split('\n');
    const questions = {};
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handle quotes)
      const parts = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      if (parts.length >= 8) {
        const [topicId, question, optA, optB, optC, optD, correct, explanation, diagram] = parts;
        
        if (!questions[topicId]) {
          questions[topicId] = [];
        }
        
        questions[topicId].push({
          id: `q_${topicId}_${i}`,
          question: question.replace(/^"|"$/g, ''),
          options: [
            optA.replace(/^"|"$/g, ''),
            optB.replace(/^"|"$/g, ''),
            optC.replace(/^"|"$/g, ''),
            optD.replace(/^"|"$/g, '')
          ],
          correct: parseInt(correct) || 0,
          explanation: explanation.replace(/^"|"$/g, ''),
          diagram: diagram && diagram.trim() !== '' ? diagram.replace(/^"|"$/g, '') : null
        });
      }
    }
    
    return questions;
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRandomQuestions = (topicId, count) => {
    const allQuestions = questionsData[topicId] || [];
    const availableCount = allQuestions.length;
    const questionsToGet = Math.min(count, availableCount);
    
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, questionsToGet);
  };

  const handleFormSelect = (form) => {
    setSelectedForm(form);
    setSelectedTopicId(null);
    setShowSettings(false);
  };

  const handleTopicSelect = (topicId) => {
    setSelectedTopicId(topicId);
    setShowSettings(true);
  };

  const startPractice = () => {
    const questions = getRandomQuestions(selectedTopicId, numQuestions);
    setPracticeQuestions(questions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnsweredQuestions([]);
    setTimeSpent(0);
    setIsTimerRunning(true);
    setShowSettings(false);
  };

  const handleAnswerSelect = (index) => {
    if (showExplanation) return;
    
    setSelectedAnswer(index);
    const currentQuestion = practiceQuestions[currentQuestionIndex];
    const isCorrect = index === currentQuestion.correct;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setAnsweredQuestions(prev => [...prev, {
      question: currentQuestion.question,
      correct: isCorrect,
      userAnswer: index,
      correctAnswer: currentQuestion.correct
    }]);
    
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < practiceQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setIsTimerRunning(false);
    }
  };

  const handleReset = () => {
    setSelectedTopicId(null);
    setPracticeQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnsweredQuestions([]);
    setTimeSpent(0);
    setIsTimerRunning(false);
    setShowSettings(false);
  };

  const isQuizComplete = practiceQuestions.length > 0 && currentQuestionIndex === practiceQuestions.length - 1 && showExplanation;

  const getTopicInfo = (topicId) => {
    for (const form of Object.values(TOPICS_METADATA)) {
      const topic = form.topics.find(t => t.id === topicId);
      if (topic) return topic;
    }
    return null;
  };

  const selectedTopic = selectedTopicId ? getTopicInfo(selectedTopicId) : null;
  const availableQuestions = selectedTopicId ? (questionsData[selectedTopicId]?.length || 0) : 0;

  // Loading screen
  if (isLoading && !selectedForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Questions...</h2>
          <p className="text-gray-600">Fetching latest questions from database</p>
        </div>
      </div>
    );
  }

  // Home screen
  if (!selectedForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div></div>
            <button
              onClick={fetchQuestions}
              className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-lg transition-all flex items-center text-indigo-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Questions
            </button>
          </div>

          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="w-16 h-16 text-indigo-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">SPM Additional Mathematics</h1>
            <p className="text-gray-600">Practice questions for SPM Add Math preparation</p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-2">
                Questions updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div 
              onClick={() => handleFormSelect('form4')}
              className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all transform hover:scale-105"
            >
              <h2 className="text-2xl font-bold text-indigo-600 mb-4">Form 4</h2>
              <ul className="space-y-2 text-gray-700">
                {TOPICS_METADATA.form4.topics.map(topic => (
                  <li key={topic.id} className="flex items-center">
                    <ChevronRight className="w-4 h-4 mr-2 text-indigo-500" />
                    {topic.name}
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-sm text-gray-500">
                {TOPICS_METADATA.form4.topics.reduce((sum, t) => sum + (questionsData[t.id]?.length || 0), 0)} questions available
              </div>
            </div>

            <div 
              onClick={() => handleFormSelect('form5')}
              className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all transform hover:scale-105"
            >
              <h2 className="text-2xl font-bold text-purple-600 mb-4">Form 5</h2>
              <ul className="space-y-2 text-gray-700">
                {TOPICS_METADATA.form5.topics.map(topic => (
                  <li key={topic.id} className="flex items-center">
                    <ChevronRight className="w-4 h-4 mr-2 text-purple-500" />
                    {topic.name}
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-sm text-gray-500">
                {TOPICS_METADATA.form5.topics.reduce((sum, t) => sum + (questionsData[t.id]?.length || 0), 0)} questions available
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">How It Works</h3>
            <ol className="space-y-2 text-gray-600">
              <li>1. Questions are loaded from Google Sheets</li>
              <li>2. Select Form 4 or Form 5</li>
              <li>3. Choose a topic to practice</li>
              <li>4. Select how many questions you want</li>
              <li>5. Answer questions and get instant feedback with explanations</li>
            </ol>
          </div>

          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-800">
              <strong>Note:</strong> Questions are synced from Google Sheets. Click "Refresh Questions" to get the latest updates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Topic selection screen
  if (!selectedTopicId || showSettings) {
    const formData = TOPICS_METADATA[selectedForm];
    
    if (showSettings && selectedTopic) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
          <div className="max-w-2xl mx-auto">
            <button 
              onClick={() => {
                setShowSettings(false);
                setSelectedTopicId(null);
              }}
              className="mb-6 text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              ← Back to Topics
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <Settings className="w-8 h-8 text-indigo-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-800">Practice Settings</h2>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{selectedTopic.name}</h3>
                <p className="text-gray-600">{selectedTopic.description}</p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-blue-800">
                  <strong>{availableQuestions} questions</strong> available for this topic
                </p>
              </div>

              <div className="mb-8">
                <label className="block text-gray-700 font-semibold mb-3">
                  How many questions do you want to practice?
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableQuestions}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.min(Math.max(1, parseInt(e.target.value) || 1), availableQuestions))}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Choose between 1 and {availableQuestions} questions
                </p>
              </div>

              <button
                onClick={startPractice}
                disabled={numQuestions < 1 || numQuestions > availableQuestions}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Start Practice
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => setSelectedForm(null)}
            className="mb-6 text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            ← Back to Form Selection
          </button>

          <h1 className="text-3xl font-bold text-gray-800 mb-8">{formData.title}</h1>

          <div className="grid md:grid-cols-2 gap-4">
            {formData.topics.map(topic => (
              <div 
                key={topic.id}
                onClick={() => handleTopicSelect(topic.id)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-xl transition-all transform hover:scale-105"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-2">{topic.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{topic.description}</p>
                <p className="text-gray-600 text-sm">{questionsData[topic.id]?.length || 0} questions available</p>
                <div className="mt-4 text-indigo-600 flex items-center">
                  Start Practice <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = practiceQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / practiceQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={handleReset}
          className="mb-6 text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          ← Back to Topics
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{selectedTopic.name}</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center text-gray-600">
                <Clock className="w-5 h-5 mr-2" />
                {formatTime(timeSpent)}
              </div>
              <div className="flex items-center text-gray-600">
                <Trophy className="w-5 h-5 mr-2" />
                {score}/{practiceQuestions.length}
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Question {currentQuestionIndex + 1} of {practiceQuestions.length}
          </p>
        </div>

        {!isQuizComplete ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              {currentQuestion.question}
            </h3>

            {currentQuestion.diagram && (
              <div className="mb-6 flex justify-center">
                <img 
                  src={currentQuestion.diagram} 
                  alt="Question diagram" 
                  className="max-w-full rounded-lg shadow-md"
                  style={{ maxHeight: '300px' }}
                />
              </div>
            )}

            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, index) => {
                let bgColor = 'bg-gray-50 hover:bg-gray-100';
                let borderColor = 'border-gray-200';
                
                if (showExplanation) {
                  if (index === currentQuestion.correct) {
                    bgColor = 'bg-green-50';
                    borderColor = 'border-green-500';
                  } else if (index === selectedAnswer && index !== currentQuestion.correct) {
                    bgColor = 'bg-red-50';
                    borderColor = 'border-red-500';
                  }
                } else if (selectedAnswer === index) {
                  bgColor = 'bg-indigo-50';
                  borderColor = 'border-indigo-500';
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showExplanation}
                    className={`w-full p-4 rounded-lg border-2 ${borderColor} ${bgColor} text-left transition-all flex items-center justify-between ${!showExplanation && 'hover:shadow-md'}`}
                  >
                    <span className="font-medium text-gray-800">{option}</span>
                    {showExplanation && index === currentQuestion.correct && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                    {showExplanation && index === selectedAnswer && index !== currentQuestion.correct && (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <h4 className="font-bold text-blue-900 mb-2">Explanation:</h4>
                <p className="text-blue-800">{currentQuestion.explanation}</p>
              </div>
            )}

            {showExplanation && (
              <button
                onClick={handleNextQuestion}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
              >
                {currentQuestionIndex < practiceQuestions.length - 1 ? 'Next Question' : 'View Results'}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
              <p className="text-gray-600">Great job on completing this topic!</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Score</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {Math.round((score / practiceQuestions.length) * 100)}%
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Correct</p>
                <p className="text-3xl font-bold text-green-600">{score}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">Time</p>
                <p className="text-3xl font-bold text-blue-600">{formatTime(timeSpent)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const questions = getRandomQuestions(selectedTopicId, numQuestions);
                  setPracticeQuestions(questions);
                  setCurrentQuestionIndex(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                  setScore(0);
                  setAnsweredQuestions([]);
                  setTimeSpent(0);
                  setIsTimerRunning(true);
                }}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center justify-center"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Retry This Topic
              </button>
              <button
                onClick={handleReset}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Choose Another Topic
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}