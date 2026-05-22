import React, { useEffect } from 'react';
import { connectSocket, disconnectSocket, socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const StudentSession = () => {
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
    
    const handleConnect = () => {
      console.log('Connected to live session');
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      disconnectSocket();
    };
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-4">
            <span className="w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse"></span>
            Live Session
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900">Waiting for Professor...</h2>
          <p className="mt-2 text-gray-500">The quiz will start shortly. Please stand by.</p>
        </div>
        
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  );
};

export default StudentSession;
