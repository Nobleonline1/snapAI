// auth.js - Handles user authentication (signup, login, logout)
// Assumes api.js is loaded first and defines the 'api' global object.

document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signup-form');
    const signupUsernameInput = document.getElementById('username');
    const signupEmailInput = document.getElementById('email');
    const signupPasswordInput = document.getElementById('password');

    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');

    const authMessageDisplay = document.getElementById('auth-message');
    const logoutBtn = document.getElementById('logout-btn');

    // NEW: Resend email elements
    const resendEmailToggle = document.getElementById('resend-email-toggle');
    const resendSection = document.getElementById('resend-section');
    const resendEmailInput = document.getElementById('resend-email-input');
    const resendEmailButton = document.getElementById('resend-email-button');
    const resendMessageDisplay = document.getElementById('resend-message');

    // NEW: Verification page elements
    const verifyMessageDisplay = document.getElementById('verify-message');
    const verifyTitle = document.getElementById('verify-title');
    const loginLink = document.getElementById('login-link');


    // Helper function to display messages
    function displayMessage(msg, isError = false) {
        const targetDisplay = isError ? authMessageDisplay : (resendMessageDisplay || authMessageDisplay);
        if (targetDisplay) {
            targetDisplay.textContent = msg;
            targetDisplay.classList.remove('success-message', 'error-message');
            targetDisplay.classList.add(isError ? 'error-message' : 'success-message');
            targetDisplay.style.display = 'block';
        } else {
            console.warn(`Message display element not found. Message: "${msg}" (Error: ${isError})`);
        }
    }

    // New helper function for resend messages
    function displayResendMessage(msg, isError = false) {
        if (resendMessageDisplay) {
            resendMessageDisplay.textContent = msg;
            resendMessageDisplay.classList.remove('success-message', 'error-message');
            resendMessageDisplay.classList.add(isError ? 'error-message' : 'success-message');
            resendMessageDisplay.style.display = 'block';
        }
    }

    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');
    const isSignupPage = currentPath.includes('signup.html');
    const isVerifyPage = currentPath.includes('verify.html');
    const token = localStorage.getItem('access_token');

    if (!token && !isLoginPage && !isSignupPage && !isVerifyPage) {
        console.log("No authentication token found. Redirecting to login page.");
        window.location.href = 'login.html';
    } else if (token && (isLoginPage || isSignupPage || isVerifyPage)) {
        console.log("Authentication token found. Redirecting from auth page to index.");
        // window.location.href = 'index.html'; // We will not redirect from verify page
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
                displayMessage(data.message || 'Signup successful! Please check your email to verify your account.', false);
                // Optionally hide the form and show the resend link section
                signupForm.style.display = 'none';

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
                const errorMessage = error.message || 'An unknown error occurred during login.';
                displayMessage(errorMessage, true);
            }
        });
    }

    // --- Logout Button Handler (on index.html) ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            api.logout();
        });
    }

    // --- Resend Email Handlers ---
    if (resendEmailToggle && resendSection && resendEmailButton) {
        resendEmailToggle.addEventListener('click', function(event) {
            event.preventDefault();
            resendSection.style.display = resendSection.style.display === 'none' ? 'block' : 'none';
            if (isLoginPage) {
                resendEmailInput.value = loginEmailInput.value;
            } else if (isSignupPage) {
                resendEmailInput.value = signupEmailInput.value;
            }
        });

        resendEmailButton.addEventListener('click', async function() {
            const email = resendEmailInput.value.trim();

            if (!email) {
                displayResendMessage('Please enter your email.', true);
                return;
            }

            displayResendMessage('Resending email...', false);

            try {
                const data = await api.resendVerificationEmail({ email });
                displayResendMessage(data.message || 'Verification email resent successfully!', false);
            } catch (error) {
                console.error('Resend email error:', error);
                const errorMessage = error.message || 'An error occurred. Please try again.';
                displayResendMessage(errorMessage, true);
            }
        });
    }

    // --- NEW: Email Verification Handler (for verify.html) ---
    if (isVerifyPage) {
        async function verifyUser() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                verifyTitle.textContent = "Verification Failed";
                verifyMessageDisplay.textContent = "No verification token found.";
                verifyMessageDisplay.classList.add('error-message');
                verifyMessageDisplay.style.display = 'block';
                return;
            }

            try {
                const response = await api.verifyEmail(token);
                verifyTitle.textContent = "Email Verified!";
                verifyMessageDisplay.textContent = response.message || "Your email has been successfully verified. You can now log in.";
                verifyMessageDisplay.classList.add('success-message');
                verifyMessageDisplay.style.display = 'block';
                loginLink.style.display = 'block'; // Show login link on success
            } catch (error) {
                verifyTitle.textContent = "Verification Failed";
                const errorMessage = error.message || 'An error occurred during verification. The link may be invalid or expired.';
                verifyMessageDisplay.textContent = errorMessage;
                verifyMessageDisplay.classList.add('error-message');
                verifyMessageDisplay.style.display = 'block';
            }
        }
        verifyUser();
    }
}); // End of DOMContentLoaded
