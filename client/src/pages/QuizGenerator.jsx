import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const QuizGenerator = () => {
  const navigate = useNavigate();
  
  // State for quiz metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // State for questions list
  const [questions, setQuestions] = useState([]);
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Default question template generator
  const createDefaultQuestion = () => ({
    id: Date.now() + Math.random().toString(36).substr(2, 9), // Local client ID for React keys
    text: '',
    type: 'MCQ',
    options: ['', '', '', ''],
    correctAnswer: '',
    difficulty: 'medium',
    tags: []
  });

  // Action: Add new question card
  const handleAddQuestion = () => {
    setQuestions([...questions, createDefaultQuestion()]);
    setErrorMessages([]);
  };

  // Action: Remove question card
  const handleRemoveQuestion = (index) => {
    const removedQuestion = questions[index];
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);

    if (removedQuestion?.id) {
      const updatedTagInputs = { ...tagInputs };
      delete updatedTagInputs[removedQuestion.id];
      setTagInputs(updatedTagInputs);
    }

    setErrorMessages([]);
  };

  // Action: Edit question text
  const handleTextChange = (index, text) => {
    const updated = [...questions];
    updated[index].text = text;
    setQuestions(updated);
  };

  // Action: Edit question type & update defaults accordingly
  const handleTypeChange = (index, type) => {
    const updated = [...questions];
    updated[index].type = type;
    if (type === 'MCQ') {
      updated[index].options = ['', '', '', ''];
      updated[index].correctAnswer = '';
    } else if (type === 'True-False') {
      updated[index].options = ['True', 'False'];
      updated[index].correctAnswer = 'True';
    } else if (type === 'Short-Answer') {
      updated[index].options = [];
      updated[index].correctAnswer = '';
    }
    setQuestions(updated);
  };

  // Action: Edit question difficulty
  const handleDifficultyChange = (index, difficulty) => {
    const updated = [...questions];
    updated[index].difficulty = difficulty;
    setQuestions(updated);
  };

  // MCQ Options action: Edit option text
  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions];
    const oldValue = updated[qIndex].options[optIndex];
    updated[qIndex].options[optIndex] = value;
    
    // If the changed option was the chosen correct answer, update the correct answer string to match
    if (updated[qIndex].correctAnswer === oldValue && oldValue !== '') {
      updated[qIndex].correctAnswer = value;
    }
    setQuestions(updated);
  };

  // MCQ Options action: Add empty option input
  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  // MCQ Options action: Remove option input
  const handleRemoveOption = (qIndex, optIndex) => {
    const updated = [...questions];
    const removedValue = updated[qIndex].options[optIndex];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIndex);
    
    // If the removed option was the correct answer, reset the correct answer selection
    if (updated[qIndex].correctAnswer === removedValue) {
      updated[qIndex].correctAnswer = '';
    }
    setQuestions(updated);
  };

  // Action: Choose Correct Answer (for MCQ & True-False)
  const handleSelectCorrectAnswer = (qIndex, answer) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = answer;
    setQuestions(updated);
  };

  // Short Answer action: Declare manual correct answer string
  const handleShortAnswerChange = (qIndex, answer) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = answer;
    setQuestions(updated);
  };

  // Tags/Concepts action: Parse and add tags
  const [tagInputs, setTagInputs] = useState({});

  const handleTagInputChange = (questionId, value) => {
    setTagInputs({
      ...tagInputs,
      [questionId]: value
    });
  };

  const handleAddTag = (qIndex, questionId) => {
    const rawInput = tagInputs[questionId] || '';
    if (!rawInput.trim()) return;

    // Split on comma or just take the raw string
    const newTags = rawInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const updated = [...questions];
    const currentTags = updated[qIndex].tags || [];
    const mergedTags = [...currentTags];

    newTags.forEach(tag => {
      if (!mergedTags.includes(tag)) {
        mergedTags.push(tag);
      }
    });

    updated[qIndex].tags = mergedTags;
    setQuestions(updated);

    // Clear tag input for this question
    setTagInputs({
      ...tagInputs,
      [questionId]: ''
    });
  };

  const handleTagInputKeyDown = (qIndex, questionId, e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(qIndex, questionId);
    }
  };

  const handleRemoveTag = (qIndex, tagIndex) => {
    const updated = [...questions];
    updated[qIndex].tags = updated[qIndex].tags.filter((_, i) => i !== tagIndex);
    setQuestions(updated);
  };

  // Validation & Submission
  const validateForm = () => {
    const errors = [];
    if (!title.trim()) {
      errors.push('Quiz Title is required.');
    }
    if (questions.length === 0) {
      errors.push('Please add at least one question to the quiz.');
    }

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.text.trim()) {
        errors.push(`Question #${qNum} has empty question text.`);
      }
      
      if (q.type === 'MCQ') {
        const nonEmptyOptions = q.options.filter(opt => opt.trim().length > 0);
        if (nonEmptyOptions.length < 2) {
          errors.push(`Question #${qNum} (MCQ) must have at least 2 non-empty options.`);
        }
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          errors.push(`Question #${qNum} (MCQ) requires a selected correct answer.`);
        } else if (!nonEmptyOptions.includes(q.correctAnswer.trim())) {
          errors.push(`Question #${qNum} (MCQ) correct answer must match one of its option choices.`);
        }
      } else if (q.type === 'True-False') {
        if (!q.correctAnswer || (q.correctAnswer !== 'True' && q.correctAnswer !== 'False')) {
          errors.push(`Question #${qNum} (True-False) requires a correct answer of True or False.`);
        }
      } else if (q.type === 'Short-Answer') {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          errors.push(`Question #${qNum} (Short-Answer) requires a keyword correct answer.`);
        }
      }
    });

    return errors;
  };

  const handleSaveAndPublish = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrorMessages(validationErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrorMessages([]);
    setIsSubmitting(true);

    // Format the payload to strip local react keys (like 'id')
    const formattedQuestions = questions.map(q => ({
      text: q.text,
      type: q.type,
      options: q.type === 'MCQ' 
        ? q.options.filter(o => o.trim() !== '') 
        : q.options,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      tags: q.tags
    }));

    const payload = {
      title,
      description,
      questions: formattedQuestions
    };

    try {
      const res = await api.post('/quizzes', payload);
      setSuccessMessage('Quiz created successfully! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMessages([
        err.response?.data?.message || 'Server encountered an error while saving the quiz.'
      ]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Panel */}
      <div className="mb-8 flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-green-400 bg-clip-text text-transparent"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quiz Creator
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Design your dynamic assessment, setup static questions and publish to the room.
          </p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
          style={{
            borderColor: 'rgba(139, 92, 246, 0.3)',
            background: 'rgba(139, 92, 246, 0.05)',
            color: 'var(--color-brand-300)'
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {/* Error & Success Notification Panels */}
      {errorMessages.length > 0 && (
        <div className="mb-8 p-5 border border-red-500/30 bg-red-950/20 rounded-xl animate-fade-in-up">
          <div className="flex items-center space-x-2 text-red-400 font-bold mb-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Please fix the following validation errors:</span>
          </div>
          <ul className="list-disc list-inside text-sm text-red-300 space-y-1 ml-1">
            {errorMessages.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && (
        <div className="mb-8 p-5 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 font-bold rounded-xl flex items-center space-x-3 animate-fade-in-up">
          <svg className="w-6 h-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="space-y-8">
        
        {/* A. GLOBAL QUIZ METADATA HEADER CARD */}
        <div className="glass-card gradient-border p-6 shadow-xl animate-fade-in-up">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Quiz Details</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="quiz-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Quiz Title <span className="text-red-400">*</span>
              </label>
              <input
                id="quiz-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CS101: Midterm Database Exam"
                className="w-full px-4 py-3 rounded-lg border text-white transition-all duration-200 outline-none"
                style={{
                  background: 'var(--color-surface-input)',
                  borderColor: 'rgba(139, 92, 246, 0.15)',
                }}
              />
            </div>
            
            <div>
              <label htmlFor="quiz-desc" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Description
              </label>
              <textarea
                id="quiz-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description, guidelines, or instructions for the student session..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border text-white transition-all duration-200 outline-none resize-none"
                style={{
                  background: 'var(--color-surface-input)',
                  borderColor: 'rgba(139, 92, 246, 0.15)',
                }}
              />
            </div>
          </div>
        </div>

        {/* B. DYNAMIC QUESTION BUILDER CARD/LIST */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Questions ({questions.length})</span>
            </h2>
            <button
              onClick={handleAddQuestion}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_18px_rgba(34,211,238,0.3)] hover:translate-y-[-1px] text-white"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-950/10">
              <svg className="mx-auto h-12 w-12 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="block text-sm font-medium text-slate-400">No questions added yet.</span>
              <p className="text-xs text-slate-500 mt-1">Click the "Add Question" button to start building your quiz.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, index) => (
                <div 
                  key={q.id} 
                  className="glass-card p-6 shadow-lg border border-slate-800 relative transition-all duration-300 hover:border-indigo-500/20"
                >
                  {/* Card Header details */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-900/40 text-indigo-300 text-sm font-bold border border-indigo-500/20">
                        {index + 1}
                      </span>
                      <h3 className="font-bold text-white text-base">Question Details</h3>
                    </div>
                    
                    <div className="flex items-center space-x-3 ml-auto">
                      {/* Difficulty Selector */}
                      <div className="flex items-center space-x-1.5">
                        <label htmlFor={`difficulty-${q.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Difficulty:</label>
                        <select
                          id={`difficulty-${q.id}`}
                          value={q.difficulty}
                          onChange={(e) => handleDifficultyChange(index, e.target.value)}
                          className="bg-slate-900 text-xs text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      {/* Delete Trash Icon */}
                      <button
                        onClick={() => handleRemoveQuestion(index)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Question"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Question Main Inputs */}
                  <div className="space-y-4">
                    {/* Text input */}
                    <div>
                      <label htmlFor={`text-${q.id}`} className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Question Text <span className="text-red-400">*</span>
                      </label>
                      <input
                        id={`text-${q.id}`}
                        type="text"
                        value={q.text}
                        onChange={(e) => handleTextChange(index, e.target.value)}
                        placeholder="e.g. Which of the following is a Hook in React?"
                        className="w-full px-4 py-3 rounded-lg border text-white transition-all duration-200 outline-none"
                        style={{
                          background: 'var(--color-surface-input)',
                          borderColor: 'rgba(139, 92, 246, 0.15)',
                        }}
                      />
                    </div>

                    {/* Question Type Selection (Pill Selector) */}
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Question Type
                      </span>
                      <div className="inline-flex p-1 rounded-lg bg-slate-950/40 border border-slate-800/80">
                        {['MCQ', 'True-False', 'Short-Answer'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleTypeChange(index, type)}
                            className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 ${
                              q.type === type
                                ? 'bg-indigo-600/90 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* C. DYNAMIC OPTIONS BLOCK */}

                    {/* MCQ Option type */}
                    {q.type === 'MCQ' && (
                      <div className="space-y-3 p-4 bg-slate-950/20 border border-slate-800/40 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Configure Choices & Set Correct Answer
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(index)}
                            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Choice</span>
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {q.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-3">
                              {/* Selection mechanism to mark correctAnswer */}
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctAnswer === option && option !== ''}
                                onChange={() => handleSelectCorrectAnswer(index, option)}
                                disabled={option.trim() === ''}
                                className="w-4.5 h-4.5 text-indigo-600 border-slate-700 bg-slate-900 cursor-pointer focus:ring-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mark as Correct Answer"
                              />
                              
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                                placeholder={`Choice #${optIdx + 1}`}
                                className="flex-1 px-3.5 py-2 rounded-lg border text-sm text-white outline-none"
                                style={{
                                  background: 'var(--color-surface-input)',
                                  borderColor: 'rgba(139, 92, 246, 0.15)',
                                }}
                              />

                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(index, optIdx)}
                                  className="text-slate-500 hover:text-red-400 p-1.5 transition-colors"
                                >
                                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {(!q.correctAnswer || !q.options.includes(q.correctAnswer)) && (
                          <p className="text-[11px] text-amber-400 mt-2 font-medium flex items-center">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Fill options and click the radio icon to select the correct answer.
                          </p>
                        )}
                      </div>
                    )}

                    {/* True-False type */}
                    {q.type === 'True-False' && (
                      <div className="p-4 bg-slate-950/20 border border-slate-800/40 rounded-xl space-y-3">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Set Correct Response
                        </span>
                        <div className="flex items-center space-x-6">
                          {['True', 'False'].map((label) => (
                            <label key={label} className="flex items-center space-x-2.5 cursor-pointer text-sm font-medium text-slate-200">
                              <input
                                type="radio"
                                name={`correct-tf-${q.id}`}
                                checked={q.correctAnswer === label}
                                onChange={() => handleSelectCorrectAnswer(index, label)}
                                className="w-4.5 h-4.5 text-indigo-600 border-slate-700 bg-slate-900 cursor-pointer focus:ring-indigo-500"
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Short-Answer type */}
                    {q.type === 'Short-Answer' && (
                      <div className="p-4 bg-slate-950/20 border border-slate-800/40 rounded-xl space-y-3">
                        <label htmlFor={`correct-sa-${q.id}`} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Precise Correct Answer Match String <span className="text-red-400">*</span>
                        </label>
                        <input
                          id={`correct-sa-${q.id}`}
                          type="text"
                          value={q.correctAnswer}
                          onChange={(e) => handleShortAnswerChange(index, e.target.value)}
                          placeholder="e.g. useState"
                          className="w-full px-4 py-2.5 rounded-lg border text-sm text-white outline-none"
                          style={{
                            background: 'var(--color-surface-input)',
                            borderColor: 'rgba(139, 92, 246, 0.15)',
                          }}
                        />
                        <p className="text-[11px] text-slate-400">
                          Students must enter text exactly matching this keyword string (case-sensitive or trimmed match checks).
                        </p>
                      </div>
                    )}

                    {/* Tags and Concepts visual manager */}
                    <div>
                      <label htmlFor={`tags-${q.id}`} className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Concepts / Tags
                      </label>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          id={`tags-${q.id}`}
                          type="text"
                          value={tagInputs[q.id] || ''}
                          onChange={(e) => handleTagInputChange(q.id, e.target.value)}
                          onKeyDown={(e) => handleTagInputKeyDown(index, q.id, e)}
                          placeholder="Type tags (e.g. hooks, state) and press comma or Enter"
                          className="flex-1 px-4 py-2.5 rounded-lg border text-sm text-white outline-none"
                          style={{
                            background: 'var(--color-surface-input)',
                            borderColor: 'rgba(139, 92, 246, 0.15)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTag(index, q.id)}
                          className="px-4 py-2.5 rounded-lg text-xs font-bold bg-indigo-900/30 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900/50"
                        >
                          Add Tag
                        </button>
                      </div>

                      {q.tags && q.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {q.tags.map((tag, tagIdx) => (
                            <span 
                              key={tagIdx} 
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/65 text-indigo-300 border border-indigo-500/20"
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(index, tagIdx)}
                                className="ml-1.5 text-indigo-400 hover:text-red-400 font-bold text-xs"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global actions at base */}
        <div className="pt-6 border-t border-slate-900 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            {questions.length > 0 ? (
              <span>Configuring {questions.length} question(s)</span>
            ) : (
              <span>Add at least one question to save</span>
            )}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndPublish}
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-lg text-sm font-bold shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_22px_rgba(124,58,237,0.5)] transition-all cursor-pointer text-white flex items-center space-x-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save & Publish Quiz</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QuizGenerator;
