// auth.js - Handles user authentication (signup, login, logout)
// Assumes api.js is loaded first and defines the 'api' global object.

document.addEventListener('DOMContentLoaded', function() {
    // ... (Your existing element selections and checkAuthStatus function) ...
    const signupForm = document.getElementById('signup-form');
    const signupUsernameInput = document.getElementById('username');
    const signupEmailInput = document.getElementById('email');
    const signupPasswordInput = document.getElementById('password');

    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');

    const authMessageDisplay = document.getElementById('auth-message');
    const logoutBtn = document.getElementById('logout-btn');

    // Helper function to display messages
    function displayMessage(msg, isError = false) {
        if (authMessageDisplay) {
            authMessageDisplay.textContent = msg;
            authMessageDisplay.classList.remove('success-message', 'error-message');
            authMessageDisplay.classList.add(isError ? 'error-message' : 'success-message');
            authMessageDisplay.style.display = 'block'; // Ensure it's visible
            // console.log(`Displaying message: "${msg}" (Error: ${isError})`); // <--- ADD THIS FOR DEBUGGING
        } else {
            console.warn(`Message display element not found (ID: auth-message). Message: "${msg}" (Error: ${isError})`);
        }
    }

    // ... (Your existing check Authentication Status on Load) ...
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');
    const isSignupPage = currentPath.includes('signup.html');
    const token = localStorage.getItem('access_token');

    if (!token && !isLoginPage && !isSignupPage) {
        console.log("No authentication token found. Redirecting to login page.");
        window.location.href = 'login.html';
    } else if (token && (isLoginPage || isSignupPage)) {
        console.log("Authentication token found. Redirecting from auth page to index.");
        window.location.href = 'index.html';
    }

    // --- Signup Form Submission Handler ---
    if (signupForm) {
        signupForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const username = signupUsernameInput.value.trim();
            const email = signupEmailInput.value.trim();
            const password = signupPasswordInput.value.trim();

            if (!username || !email || !password) {
                displayMessage('Please fill in all fields.', true);
                return;
            }

            displayMessage('Signing up...', false);

            try {
                const data = await api.signup({ username, email, password });
                displayMessage(data.message || 'Signup successful! Please check your email to verify your account.', false); // <--- IMPROVED MESSAGE

                // Redirect to login page after successful signup, giving time to read message
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000); // <--- INCREASED DELAY TO 3 SECONDS

            } catch (error) {
                console.error('Signup error:', error);
                const errorMessage = error.message || 'An error occurred during signup.';
                displayMessage(errorMessage, true);
            }
        });
    }

    // --- Login Form Submission Handler ---
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (!email || !password) {
                displayMessage('Please enter your email and password.', true);
                return;
            }

            displayMessage('Logging in...', false);

            try {
                const data = await api.login({ email, password });

                if (data.access_token) {
                    localStorage.setItem('access_token', data.access_token);
                    if (data.refresh_token) {
                        localStorage.setItem('refresh_token', data.refresh_token);
                    }
                    displayMessage('Login successful! Redirecting...', false);
                    window.location.href = 'index.html';
                } else {
                    displayMessage('Login failed: Invalid credentials or no token received.', true);
                }
            } catch (error) {
                console.error('Login error:', error);
                // The API error object is already structured, display its message directly
                const errorMessage = error.message || 'An unknown error occurred during login.';
                displayMessage(errorMessage, true); // This will now show "Account not verified..."
            }
        });
    }

    // --- Logout Button Handler (on index.html) ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            api.logout();
        });
    }
}); // End of DOMContentLoaded