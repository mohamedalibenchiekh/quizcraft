import axios from 'axios';

const apiHost = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
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

api.generateQuizFromFiles = async (formData) => {
  const uploadResponse = await api.post('/upload', formData);

  const text = uploadResponse.data?.consolidatedText;
  const numQuestions = Number(formData.get('numQuestions') || 10);
  const difficulty = formData.get('difficulty') || 'medium';

  const generationResponse = await api.post('/ai/generate', {
    text,
    numQuestions,
    difficulty,
  });

  return {
    ...generationResponse.data,
    upload: uploadResponse.data,
  };
};

export default api;
