import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const apiHost = API_BASE_URL.replace(/\/+$/, '');
const api = axios.create({
  baseURL: apiHost.endsWith('/api') ? apiHost : `${apiHost}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.updateQuiz = async (id, quizData) => {
  const response = await api.put(`/quizzes/${id}`, quizData);
  return response.data;
};

api.generateQuizFromFiles = async (formData) => {
  const uploadResponse = await api.post('/upload', formData);

  const text = uploadResponse.data?.consolidatedText;
  const difficulty = formData.get('difficulty') || 'medium';

  const isAdvanced = formData.get('isAdvanced') === 'true';
  let matrix = null;
  let numQuestions = Number(formData.get('numQuestions') || 10);

  if (isAdvanced) {
    const raw = formData.get('matrix');
    matrix = raw ? JSON.parse(raw) : null;
    if (matrix) {
      numQuestions = Object.values(matrix).reduce(
        (s, d) => s + (d.easy || 0) + (d.medium || 0) + (d.hard || 0), 0
      );
    }
  }

  const customPrompt = formData.get('customPrompt') || '';

  const generationResponse = await api.post('/ai/generate', {
    text,
    numQuestions,
    difficulty,
    customPrompt,
    ...(isAdvanced && matrix ? { isAdvanced: true, matrix } : {}),
  });

  return {
    ...generationResponse.data,
    upload: uploadResponse.data,
  };
};

export default api;
