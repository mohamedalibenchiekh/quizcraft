import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuizGenerator = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quiz Generator</h1>
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
      
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
        <p className="text-gray-500 mb-6">Create a new quiz by adding questions below.</p>
        
        {/* Placeholder for quiz generator form */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="mt-2 block text-sm font-medium text-gray-900">Add a new question</span>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            Save Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizGenerator;
