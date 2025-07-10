// api.js - Centralized API client for all backend interactions

// IMPORTANT: Set this to the exact URL your Flask backend is running on.
// If your Flask app runs on http://127.0.0.1:5000, use that.
// If it runs on http://localhost:5000, use that.
const BASE_URL = "http://127.0.0.1:5000"; 

/**
 * Generic utility function to make API requests to the backend.
 *
 * @param {string} endpoint - The API endpoint relative to BASE_URL (e.g., "/api/auth/signup").
 * @param {string} method - The HTTP method (e.g., "GET", "POST", "PUT", "DELETE").
 * @param {object|null} data - The request body data (will be JSON.stringify'd).
 * @param {boolean} needsAuth - True if the request requires an authentication token.
 * @returns {Promise<object>} - A promise that resolves with the JSON response from the server.
 * @throws {Error} - Throws an error if the request fails or returns a non-OK status.
 */
async function apiRequest(endpoint, method = 'GET', data = null, needsAuth = true) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
    };

    if (needsAuth) {
        const token = localStorage.getItem('access_token'); // Assuming you store the token in localStorage
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            // If authentication is required but no token is found, redirect to login
            // Only redirect if not already on login/signup to prevent infinite loops
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html') && !currentPath.includes('signup.html')) {
                console.warn('Authentication token missing. Redirecting to login.');
                window.location.href = 'login.html'; // Adjust this to your actual login page
                throw new Error("Authentication required."); // Stop further execution
            }
        }
    }

    const options = {
        method: method,
        headers: headers,
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);

        // Check if the response status is not in the 2xx range (e.g., 400, 401, 500)
        if (!response.ok) {
            let errorData;
            try {
                // Try to parse error message from JSON response
                errorData = await response.json();
            } catch (jsonError) {
                // If response is not JSON, use status text
                errorData = { message: response.statusText || 'Unknown error', status: response.status };
            }
            console.error(`API Error for ${method} ${endpoint}:`, errorData);
            throw new Error(errorData.message || 'API request failed');
        }

        // Return the JSON response if successful
        return await response.json();
    } catch (error) {
        console.error('Network or unexpected API Request Error:', error);
        throw error; // Re-throw to be caught by the calling function
    }
}

// Define specific API methods for easier use
const api = {
    // Authentication
    signup: (userData) => apiRequest('/api/auth/signup', 'POST', userData, false), // No auth needed for signup
    login: (credentials) => apiRequest('/api/auth/login', 'POST', credentials, false), // No auth needed for login
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Optionally make a backend logout request if your API has one
        // apiRequest('/api/auth/logout', 'POST', null, true);
        window.location.href = 'login.html'; // Redirect to login page
    },
    // AI Comment Generation
    generateComment: (imageData) => apiRequest('/api/ai/generate-comment', 'POST', imageData, true), // Requires auth
    
    // User Management (example)
    getUserProfile: () => apiRequest('/api/user/profile', 'GET', null, true), // Requires auth
    updateUserProfile: (profileData) => apiRequest('/api/user/profile', 'PUT', profileData, true), // Requires auth

    // Add more API calls as your application grows
    // For example:
    // getComments: (postId) => apiRequest(`/api/posts/${postId}/comments`, 'GET', null, true),
    // postComment: (postId, commentData) => apiRequest(`/api/posts/${postId}/comments`, 'POST', commentData, true),
};

// Make the `api` object globally accessible (or import it if using modules)
// For simple setups with direct script includes, attaching to window is common.
window.api = api;