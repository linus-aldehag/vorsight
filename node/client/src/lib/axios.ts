import axios from 'axios';

const api = axios.create({
    baseURL: '/api/web/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling (optional, but good for debugging)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // You could handle 401s here to redirect to login, etc.
        return Promise.reject(error);
    }
);

export default api;
