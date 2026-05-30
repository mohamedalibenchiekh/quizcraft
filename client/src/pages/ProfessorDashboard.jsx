import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ProfessorDashboard = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'published', 'draft'
  const [toggleLoading, setToggleLoading] = useState({});

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      // Hits GET /api/quizzes. Returns all quizzes created by this professor.
      const response = await api.get('/quizzes');
      if (response.data?.success) {
        setQuizzes(response.data.data || []);
      } else {
        setError('Failed to fetch quizzes');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error fetching quizzes from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApprove = async (quizId) => {
    try {
      setToggleLoading(prev => ({ ...prev, [quizId]: true }));
      // Hits PATCH /api/quizzes/:id/approve
      const response = await api.patch(`/quizzes/${quizId}/approve`);
      if (response.data?.success) {
        const updatedQuiz = response.data.data;
        // Update local state smoothly
        setQuizzes(prev => prev.map(q => q._id === quizId ? updatedQuiz : q));
      } else {
        alert(response.data?.message || 'Failed to update quiz approval status');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error communicating with server.');
    } finally {
      setToggleLoading(prev => ({ ...prev, [quizId]: false }));
    }
  };

  // Local filtering logic
  const filteredQuizzes = quizzes.filter(quiz => {
    if (filter === 'published') return quiz.isApproved;
    if (filter === 'draft') return !quiz.isApproved;
    return true;
  });

  // Calculate counts for filters
  const totalCount = quizzes.length;
  const publishedCount = quizzes.filter(q => q.isApproved).length;
  const draftCount = quizzes.filter(q => !q.isApproved).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up text-slate-900 dark:text-white">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1
            className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Professor Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Manage your quizzes, configure drafts, publish to classrooms, and trigger live sessions.
          </p>
        </div>
        <button
          onClick={() => navigate('/generator')}
          className="inline-flex items-center px-5 py-3 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_18px_rgba(34,211,238,0.3)] hover:translate-y-[-1px] text-white"
          style={{
            background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
          }}
        >
          <svg className="w-4.5 h-4.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create New Quiz
        </button>
      </div>

      {/* Error block */}
      {error && (
        <div className="mb-8 p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded-xl">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Filter Tabs & Stats Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex p-1 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          {[
            { id: 'all', label: 'All Quizzes', count: totalCount },
            { id: 'published', label: 'Published Only', count: publishedCount },
            { id: 'draft', label: 'Drafts Only', count: draftCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-200 flex items-center space-x-1.5 ${filter === tab.id
                  ? 'bg-indigo-600/90 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${filter === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-300 dark:bg-slate-900 text-slate-600 dark:text-slate-500'
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="w-10 h-10 animate-spin text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading quizzes...</span>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-16 text-center bg-white dark:bg-slate-900">
          <svg className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-slate-800 dark:text-white font-bold text-lg mb-1">No quizzes found</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
            {filter === 'all'
              ? "You haven't created any quizzes yet. Click 'Create New Quiz' to get started."
              : `No quizzes match the filter "${filter === 'published' ? 'Published' : 'Drafts'}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:translate-y-[-2px] transition-all duration-300 hover:border-indigo-500/25 flex flex-col justify-between overflow-hidden relative shadow-lg"
            >
              {/* Card top gradient bar */}
              <div className={`h-1.5 w-full ${quiz.isApproved ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-slate-600 to-slate-500'}`} />

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  {/* Status Badge & Question Count */}
                  <div className="flex justify-between items-center mb-4">
                    {quiz.isApproved ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/65 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-950/65 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20">
                        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-500 dark:bg-slate-400"></span>
                        Draft
                      </span>
                    )}
                    <span className="text-slate-500 dark:text-slate-500 text-xs font-medium">
                      {quiz.questions?.length || 0} Questions
                    </span>
                  </div>

                  <h3 className="text-slate-800 dark:text-white font-bold text-xl mb-2 line-clamp-1" title={quiz.title}>
                    {quiz.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-2 h-10">
                    {quiz.description || "No description provided."}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Interactive toggles */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => handleToggleApprove(quiz._id)}
                      disabled={toggleLoading[quiz._id]}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 flex items-center space-x-1.5 hover:translate-y-[-1px] disabled:opacity-50 ${quiz.isApproved
                          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-950/60'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-950/60'
                        }`}
                    >
                      {toggleLoading[quiz._id] ? (
                        <>
                          <svg className="w-3 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Processing...</span>
                        </>
                      ) : quiz.isApproved ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-3-3" />
                          </svg>
                          <span>Move to Draft</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Publish Quiz</span>
                        </>
                      )}
                    </button>

                    <span className="text-slate-500 dark:text-slate-500 text-xs">
                      Created {new Date(quiz.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Core quiz actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/host-session', { state: { quizId: quiz._id } })}
                      disabled={!quiz.isApproved}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1 ${quiz.isApproved
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md cursor-pointer hover:translate-y-[-1px]'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-70'
                        }`}
                      title={quiz.isApproved ? "Start a live game session" : "Publish the quiz to activate live sessions"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Start</span>
                    </button>

                    <button
                      className="px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all duration-200 cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      onClick={() => navigate(`/quizzes/edit/${quiz._id}`)}
                    >
                      Edit
                    </button>

                    <button
                      className="px-3 py-2.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all duration-200 cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      onClick={() => navigate(`/quizzes/analytics/${quiz._id}`)}
                    >
                      Analytics
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfessorDashboard;
