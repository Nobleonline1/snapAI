// main.js - Handles camera, image upload, speech input, and AI comment generation

document.addEventListener('DOMContentLoaded', function() {
    // --- Elements ---
    const cameraFeed = document.getElementById('camera-feed');
    const startCameraBtn = document.getElementById('start-camera-btn');
    const capturePhotoBtn = document.getElementById('capture-photo-btn');
    const cameraCanvas = document.getElementById('camera-canvas');
    const capturedImageDisplay = document.getElementById('captured-image-display');

    const uploadInput = document.getElementById('upload-input');
    const uploadedImageDisplay = document.getElementById('uploaded-image-display');

    const startSpeechBtn = document.getElementById('start-speech-btn');
    const stopSpeechBtn = document.getElementById('stop-speech-btn');
    const speechTextDisplay = document.getElementById('speech-text-display');

    const generateCommentBtn = document.getElementById('generate-comment-btn');
    const commentOutputStatus = document.getElementById('comment-output-status');
    const commentOutput = document.getElementById('comment-output');

    let currentInputData = null; // Stores the data to send to AI (base64 image or text)
    let currentInputType = null; // 'image' or 'speech'

    let mediaRecorder; // For speech recording
    let audioChunks = [];

    // --- Helper function for displaying status ---
    function setStatus(message, isError = false) {
        if (commentOutputStatus) {
            commentOutputStatus.textContent = message;
            commentOutputStatus.style.color = isError ? 'red' : 'green';
            commentOutputStatus.style.display = 'block';
        }
    }

    // --- Camera Functions ---
    if (startCameraBtn && cameraFeed && capturePhotoBtn && cameraCanvas && capturedImageDisplay) {
        startCameraBtn.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                cameraFeed.srcObject = stream;
                cameraFeed.style.display = 'block';
                startCameraBtn.disabled = true;
                capturePhotoBtn.disabled = false;
                setStatus('Camera started.');
            } catch (err) {
                console.error('Error accessing camera:', err);
                setStatus('Error starting camera. Please check permissions.', true);
            }
        });

        capturePhotoBtn.addEventListener('click', () => {
            cameraCanvas.width = cameraFeed.videoWidth;
            cameraCanvas.height = cameraFeed.videoHeight;
            const context = cameraCanvas.getContext('2d');
            context.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);

            const imageDataUrl = cameraCanvas.toDataURL('image/png'); // Get base64 image
            capturedImageDisplay.src = imageDataUrl;
            capturedImageDisplay.style.display = 'block';

            // Stop camera stream
            const stream = cameraFeed.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            cameraFeed.srcObject = null;
            cameraFeed.style.display = 'none';

            // Store data for AI generation
            currentInputData = imageDataUrl.split(',')[1]; // Get base64 string without "data:image/png;base64," prefix
            currentInputType = 'image';
            generateCommentBtn.disabled = false; // Enable generate button

            setStatus('Photo captured!');
        });
    }

    // --- Image Upload Function ---
    if (uploadInput && uploadedImageDisplay) {
        uploadInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedImageDisplay.src = e.target.result;
                    uploadedImageDisplay.style.display = 'block';

                    // Store data for AI generation
                    currentInputData = e.target.result.split(',')[1]; // Base64 string
                    currentInputType = 'image';
                    generateCommentBtn.disabled = false; // Enable generate button
                    setStatus('Image uploaded!');
                };
                reader.onerror = (e) => {
                    console.error('File reading error:', e);
                    setStatus('Error reading image file.', true);
                };
                reader.readAsDataURL(file);
            } else {
                setStatus('Please select a valid image file.', true);
                uploadedImageDisplay.style.display = 'none';
                generateCommentBtn.disabled = true;
            }
        });
    }

    // --- Speech Input Functions ---
    if (startSpeechBtn && stopSpeechBtn && speechTextDisplay) {
        startSpeechBtn.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Use webm as pydub handles it
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const base64Audio = e.target.result.split(',')[1]; // Get base64 string
                        currentInputData = base64Audio;
                        currentInputType = 'speech';
                        generateCommentBtn.disabled = false; // Enable generate button
                        setStatus('Recording stopped. Ready to generate.');
                        // Optionally, you might want to send this audio to a speech-to-text API here first
                        // and display the transcribed text, then let generateComment use that text.
                        // For simplicity, we'll send the audio to the backend directly for now.
                    };
                    reader.readAsDataURL(audioBlob);

                    // Stop microphone stream
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                startSpeechBtn.disabled = true;
                stopSpeechBtn.disabled = false;
                speechTextDisplay.textContent = 'Recording... Speak now!';
                setStatus('Recording started.');
            } catch (err) {
                console.error('Error accessing microphone:', err);
                setStatus('Error starting microphone. Please check permissions.', true);
            }
        });

        stopSpeechBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                startSpeechBtn.disabled = false;
                stopSpeechBtn.disabled = true;
            }
        });
    }


    // --- Generate Comment Button Handler ---
    if (generateCommentBtn && commentOutput) {
        generateCommentBtn.addEventListener('click', async () => {
            if (!currentInputData || !currentInputType) {
                setStatus('Please capture an image, upload an image, or record speech first.', true);
                return;
            }

            setStatus('Generating comment... Please wait, this might take a moment.', false);
            commentOutput.value = ''; // Clear previous output
            generateCommentBtn.disabled = true; // Disable while generating

            try {
                const payload = {
                    type: currentInputType,
                    data: currentInputData
                };

                // Call the generateComment method from the api object (defined in api.js)
                const response = await api.generateComment(payload);

                if (response.comment) {
                    commentOutput.value = response.comment;
                    setStatus('Comment generated successfully!', false);
                } else {
                    setStatus('Failed to get a comment. Backend response missing "comment".', true);
                    console.error('Unexpected backend response:', response);
                }
            } catch (error) {
                console.error('Error generating comment:', error);
                setStatus(error.message || 'Failed to generate comment. Check console for details.', true);
            } finally {
                generateCommentBtn.disabled = false; // Re-enable button
                currentInputData = null; // Clear data after use
                currentInputType = null;
            }
        });
    }

    // --- Initial State and UI setup on load ---
    // Check if on index.html (the main app page)
    if (window.location.pathname.includes('index.html')) {
        // Ensure the user is logged in
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.log("No token found on index page, redirecting to login.");
            window.location.href = 'login.html'; // Redirect to login if no token
        }
        // If token exists, UI will be enabled by default, but we can set initial states
        capturePhotoBtn.disabled = true;
        stopSpeechBtn.disabled = true;
        generateCommentBtn.disabled = true; // Disabled until input is provided
    }
}); // End of DOMContentLoaded