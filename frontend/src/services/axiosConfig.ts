import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';

// Create two axios instances - one for the agent and one for direct backend access
// Use environment variables for base URLs, with fallbacks
const agentBaseURL = import.meta.env.VITE_AGENT_URL || 'http://localhost:5001';
const backendBaseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8443';

console.log("Using Agent URL:", agentBaseURL); // Add console logs for debugging
console.log("Using Backend URL:", backendBaseURL);

const agentApi: AxiosInstance = axios.create({
  baseURL: agentBaseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const backendApi: AxiosInstance = axios.create({
  baseURL: backendBaseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add a request interceptor to attach the authentication token to all requests
const addAuthInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // Ensure headers object exists
      config.headers = config.headers || {};
      
      // Set authorization header if token exists
      if (token) {
        // Make sure the token has the proper Bearer format
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        config.headers.Authorization = formattedToken;
        
        // Save the properly formatted token back to localStorage
        if (formattedToken !== token) {
          localStorage.setItem('token', formattedToken);
        }
        
        if (process.env.NODE_ENV === 'development') {
          const tokenStart = formattedToken.substring(0, 15);
          const tokenEnd = formattedToken.length > 20 ? formattedToken.substring(formattedToken.length - 5) : '';
          console.log(`Request with auth token: ${config.url}, token: ${tokenStart}...${tokenEnd}`);
        }
      } else {
        // No token found, try to recover from store state
        try {
          const storedState = localStorage.getItem('eva-store');
          if (storedState) {
            const parsedState = JSON.parse(storedState);
            if (parsedState?.state?.token) {
              const recoveredToken = parsedState.state.token;
              const formattedToken = recoveredToken.startsWith('Bearer ') ? recoveredToken : `Bearer ${recoveredToken}`;
              config.headers.Authorization = formattedToken;
              
              // Save the recovered token
              localStorage.setItem('token', formattedToken);
              console.log(`Recovered and saved token from store state for request: ${config.url}`);
            }
          }
        } catch (e) {
          console.error('Error attempting to recover token:', e);
        }
      }
      
      return config;
    },
    (error: any) => {
      return Promise.reject(error);
    }
  );
};

// Add auth interceptors to both instances
addAuthInterceptor(agentApi);
addAuthInterceptor(backendApi);

// Add a response interceptor to handle errors
const addErrorInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: any) => {
      // Log detailed error information for debugging
      if (error.response) {
        console.error('Error response:', {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        });
        
        // If we receive a 401 Unauthorized error, clear token and redirect to login
        if (error.response.status === 401) {
          const token = localStorage.getItem('token');
          console.error('Authentication error - current token:', token ? token.substring(0, 10) + '...' : 'none');
          
          // Clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
      } else {
        // Something happened in setting up the request
        console.error('Error message:', error.message);
      }
      
      return Promise.reject(error);
    }
  );
};

// Add error interceptors to both instances
addErrorInterceptor(agentApi);
addErrorInterceptor(backendApi);

// Export both instances
export { agentApi, backendApi };
export default agentApi; 