import axios from 'axios';

// Use the agent for all API requests
// The agent will forward requests to the backend appropriately
const api = axios.create({
  baseURL: 'http://localhost:5001',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add a request interceptor to attach the authentication token to all requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // Ensure headers object exists
    config.headers = config.headers || {};
    
    // Set authorization header if token exists
    if (token) {
      // Make sure the token has the proper Bearer format
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.Authorization = formattedToken;
      
      if (process.env.NODE_ENV === 'development') {
        const tokenStart = formattedToken.substring(0, 15);
        const tokenEnd = formattedToken.length > 20 ? formattedToken.substring(formattedToken.length - 5) : '';
        console.log(`Request with auth token: ${config.url}, token: ${tokenStart}...${tokenEnd}`);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Request without auth token: ${config.url} - no token found in localStorage`);
        // Try to recover the token or request reauthorization
        try {
          const storedState = localStorage.getItem('eva-store');
          if (storedState) {
            const parsedState = JSON.parse(storedState);
            if (parsedState?.state?.token) {
              const recoveredToken = parsedState.state.token;
              const formattedToken = recoveredToken.startsWith('Bearer ') ? recoveredToken : `Bearer ${recoveredToken}`;
              config.headers.Authorization = formattedToken;
              console.log(`Recovered token from store state and applied to request: ${config.url}`);
              
              // Also save it back to the main token location
              localStorage.setItem('token', formattedToken);
            }
          }
        } catch (e) {
          console.error('Error attempting to recover token:', e);
        }
      }
    }
    
    // Set content type and accept headers
    config.headers['Content-Type'] = 'application/json';
    config.headers.Accept = 'application/json';
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed error information for debugging
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      console.error('Error response:', {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error request:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error message:', error.message);
    }
    
    // If we receive a 401 Unauthorized error, clear token and redirect to login
    if (error.response && error.response.status === 401) {
      const token = localStorage.getItem('token');
      console.error('Authentication error - current token:', token ? token.substring(0, 10) + '...' : 'none');
      
      // Show a more user-friendly message
      if (window.confirm('Your session has expired. Please log in again.')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 