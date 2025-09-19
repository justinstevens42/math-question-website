// Global state
let currentQuestion = null;
let currentHints = [];
let currentHintIndex = 0;
let isFirstAttempt = true;
let hintsUsed = [];
let questions = []; // Will be loaded from JSON file
let currentQuestionIndex = 0; // Track which question we're on
let sessionStats = {
    totalQuestions: 0,
    correctFirstTry: 0,
    hintsUsed: 0,
    finalHintBeforeSolve: null
};

// --- LaunchDarkly setup (A/B hints) ---
let ldClient = null;
let activeHintVariant = 'control'; // The variant for the user's session

// Create a stable anonymous key for the user to ensure consistent bucketing
function getOrCreateLdUserKey() {
    const storageKey = 'ld_user_key';
    let key = localStorage.getItem(storageKey);
    if (key) return key;

    // Use crypto for a high-quality random key if available
    if (window.crypto && window.crypto.randomUUID) {
        key = window.crypto.randomUUID();
    } else {
        // Fallback for older browsers
        key = 'user-' + Math.random().toString(36).substring(2, 15) + Date.now();
    }
    localStorage.setItem(storageKey, key);
    return key;
}

function initializeLaunchDarkly() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
        console.log("Skipping LaunchDarkly on localhost.");
        return;
    }

    // Wait for the SDK to be available on the window object
    if (!window.LDClient) {
        window.addEventListener('load', initializeLaunchDarkly, { once: true });
        console.log("LaunchDarkly SDK not ready, will try again on page load.");
        return;
    }

    // Verbatim initialization code
    const context = {
      kind: 'user',
      key: getOrCreateLdUserKey(), // Use our stable anonymous key
      anonymous: true
    };
    const client = window.LDClient.initialize('68ccd8b8987d6c09973312f0', context);

    client.on('initialized', function () {
      // Tracking your memberId lets us know you are connected.
      client.track('68ccd8b8987d6c09973312ef');
      console.log('SDK successfully initialized!');
    });

    // Wire up the client for our experiment logic
    ldClient = client;
    ldClient.on('ready', function () {
        // Fetch a boolean flag to decide between two variants.
        // false = claude, true = chatgpt
        const useChatGPT = ldClient.variation('hint-variant-experiment', false); // Default to false (Claude)
        activeHintVariant = useChatGPT ? 'chatgpt' : 'claude';
        console.log(`LaunchDarkly assigned this user to hint variant: ${activeHintVariant}`);
    });
}

// Safe tracking wrapper; no-ops if LD unavailable
function ldTrack(eventKey, data) {
    try {
        if (ldClient && typeof ldClient.track === 'function') {
            ldClient.track(eventKey, data);
        }
    } catch (e) {
        console.warn("LD track failed", e);
    }
}

// Select hint steps for a question, supporting two schemas:
// 1) hints: string[]
// 2) hints: Array<{ variant: string, steps: string[] }>
function selectHintSteps(question) {
    const hints = question.hints || [];
    if (!Array.isArray(hints)) return [];
    if (hints.length === 0) return [];
    if (typeof hints[0] === 'string') return hints; // simple schema

    // variant schema
    const variantName = activeHintVariant || 'control';
    const match = hints.find(h => h && h.variant === variantName);
    const control = hints.find(h => h && h.variant === 'control');
    const chosen = match || control || hints[0];
    return Array.isArray(chosen.steps) ? chosen.steps : [];
}


async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        questions = data;
        console.log(`Loaded ${questions.length} questions from JSON file`);
        // Do not log full questions to avoid exposing answers in console
        return true;
    } catch (error) {
        console.error('Error loading questions:', error);
        // Fallback to a simple question if JSON loading fails
        questions = [{
            id: 1,
            question: "What is 2 + 2?",
            answer: "4",
            solution: "This is a basic arithmetic question. 2 + 2 = 4.",
            hints: [
                "This is a basic arithmetic question.",
                "Add the two numbers together.",
                "The answer is 4."
            ]
        }];
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadQuestions();
    setupEventListeners();
    initializeLaunchDarkly();
    
    // Robustly wait for MathJax to be ready
    const waitForMathJaxReady = () => {
        try {
            if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
                window.MathJax.startup.promise.then(() => {
                    console.log('MathJax is ready! Version:', window.MathJax.version);
                    loadNextQuestion();
                });
                return;
            }
        } catch (e) {
            console.warn('Error checking MathJax readiness, retrying...', e);
        }
        // Poll until MathJax is available
        setTimeout(waitForMathJaxReady, 100);
    };
    waitForMathJaxReady();
});

function setupEventListeners() {
    const answerInput = document.getElementById('answer-input');
    answerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitAnswer();
        }
    });
}

function loadNextQuestion() {
    console.log('Loading next question...');
    
    console.log('Available questions:', questions.length);
    console.log('Current question index:', currentQuestionIndex);
    
    // Check if we've gone through all questions
    if (currentQuestionIndex >= questions.length) {
        // All questions completed - show completion message
        document.getElementById('question-text').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2>🎉 Congratulations! 🎉</h2>
                <p>You've completed all ${questions.length} math problems!</p>
                <p>Great job working through each one systematically.</p>
                <button onclick="resetSession()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Start Over
                </button>
            </div>
        `;
        document.getElementById('answer-input').style.display = 'none';
        document.getElementById('submit-btn').style.display = 'none';
        return;
    }
    
    currentQuestion = questions[currentQuestionIndex];
    console.log('Selected question id:', currentQuestion.id);
    
    currentHints = selectHintSteps(currentQuestion);
    currentHintIndex = 0;
    isFirstAttempt = true;
    hintsUsed = [];
    
    // Update question display with question number
    document.getElementById('question-text').innerHTML = `
        <div style="margin-bottom: 15px; font-weight: bold; color: #667eea; font-size: 1.1em;">
            Problem ${currentQuestionIndex + 1} of ${questions.length}
        </div>
        ${currentQuestion.question}
    `;
    // Do not log question text to avoid exposing content in console
    
    // Hide feedback containers
    document.getElementById('feedback-container').classList.add('hidden');
    document.getElementById('hint-feedback-container').classList.add('hidden');
    document.getElementById('stats-container').classList.add('hidden');
    
    // Clear answer input
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').style.display = 'block';
    document.getElementById('submit-btn').style.display = 'block';
    
    // Re-render MathJax
    setTimeout(() => {
        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise();
        }
    }, 100);
}

function submitAnswer() {
    const userAnswer = document.getElementById('answer-input').value.trim();
    const correctAnswer = currentQuestion.answer;

    if (userAnswer === correctAnswer) {
        if (isFirstAttempt) {
            sessionStats.correctFirstTry++;
        }
        showCorrectAnswer();
    } else {
        if (isFirstAttempt) {
            isFirstAttempt = false;
            showFirstHint();
        } else {
            // Subsequent wrong attempts → show next hint while available
            if (currentHintIndex < currentHints.length) {
                showHint();
            } else {
                // No more hints left → reveal solution
                showSolutionAfterHints();
            }
        }
    }
}

function showCorrectAnswer() {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContent = document.getElementById('feedback-content');
    
    feedbackContainer.className = 'feedback-container correct';
    
    let feedbackHTML = `
        <h3>Correct!</h3>
        <p>Well done! Your answer is correct.</p>
    `;
    
    // Add solution if available
    if (currentQuestion.solution) {
        feedbackHTML += `
            <div class="solution">
                <h4>Solution:</h4>
                <p>${currentQuestion.solution}</p>
            </div>
        `;
    }
    
    // Append a manual Next Question button so the solution stays visible
    feedbackHTML += `
        <div style="margin-top: 20px; text-align: center;">
            <button id="next-question-btn" onclick="goToNextQuestion()" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;">
                Next Question
            </button>
        </div>
    `;

    feedbackContent.innerHTML = feedbackHTML;
    feedbackContainer.classList.remove('hidden');
    
    // Update stats
    sessionStats.totalQuestions++;
    if (hintsUsed.length > 0) {
        sessionStats.hintsUsed += hintsUsed.length;
        sessionStats.finalHintBeforeSolve = hintsUsed[hintsUsed.length - 1];
    }
    
    // Re-render MathJax
    setTimeout(() => {
        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise();
        }
    }, 100);

    // --- New Tracking ---
    trackProblemCompletion(true);
    // --- End New Tracking ---
}

// Handler for the Next Question button to advance explicitly
function goToNextQuestion() {
    const nextBtn = document.getElementById('next-question-btn');
    if (nextBtn) {
        nextBtn.disabled = true;
    }
    currentQuestionIndex++;
    loadNextQuestion();
}

function showFirstHint() {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContent = document.getElementById('feedback-content');
    
    feedbackContainer.className = 'feedback-container hint';
    
    // Show all hints up to the current one
    let hintsHTML = `
        <h3>Not quite right</h3>
        <p>Here are the hints to help you:</p>
    `;
    
    for (let i = 0; i <= currentHintIndex; i++) {
        hintsHTML += `
            <div class="hint-content">
                <p><strong>Hint ${i + 1}:</strong> ${currentHints[i]}</p>
            </div>
        `;
    }
    
    feedbackContent.innerHTML = hintsHTML;
    
    feedbackContainer.classList.remove('hidden');
    
    // Track hint usage
    hintsUsed.push(currentHints[currentHintIndex]);
    currentHintIndex++;
    
    // Re-render MathJax for the hint with proper timing
    setTimeout(() => {
        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise();
        }
    }, 100);
    
    // Show hint feedback for the first hint
    setTimeout(() => {
        document.getElementById('hint-feedback-container').classList.remove('hidden');
    }, 1000);
}

function showHint() {
    if (currentHintIndex < currentHints.length) {
        const feedbackContainer = document.getElementById('feedback-container');
        const feedbackContent = document.getElementById('feedback-content');
        
        feedbackContainer.className = 'feedback-container hint';
        
        // Show all hints up to the current one
        let hintsHTML = `
            <h3>Here are all the hints so far:</h3>
        `;
        
        for (let i = 0; i <= currentHintIndex; i++) {
            hintsHTML += `
                <div class="hint-content">
                    <p><strong>Hint ${i + 1}:</strong> ${currentHints[i]}</p>
                </div>
            `;
        }
        
        feedbackContent.innerHTML = hintsHTML;
        
        // Track hint usage
        hintsUsed.push(currentHints[currentHintIndex]);
        currentHintIndex++;
        
        // Re-render MathJax for the hint with proper timing
        setTimeout(() => {
            if (window.MathJax && MathJax.typesetPromise) {
                MathJax.typesetPromise();
            }
        }, 100);
        
        // Show hint feedback
        setTimeout(() => {
            document.getElementById('hint-feedback-container').classList.remove('hidden');
        }, 1000);
    } else {
        alert('No more hints available. Try to solve the problem!');
    }
}

function showIncorrectAnswer() {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContent = document.getElementById('feedback-content');
    
    feedbackContainer.className = 'feedback-container incorrect';
    feedbackContent.innerHTML = `
        <h3>Incorrect</h3>
        <p>That's not the right answer.</p>
    `;
    
    feedbackContainer.classList.remove('hidden');
}

// When the learner has used all hints and is still incorrect, reveal the solution
function showSolutionAfterHints() {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContent = document.getElementById('feedback-content');
    
    feedbackContainer.className = 'feedback-container hint';
    
    let html = `
        <h3>Out of hints</h3>
        <p>No more hints available. Here's the solution:</p>
        <div class="solution">
            <h4>Solution:</h4>
            <p>${currentQuestion.solution || 'Solution unavailable.'}</p>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button id="next-question-btn" onclick="goToNextQuestion()" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;">
                Next Question
            </button>
        </div>
    `;
    
    feedbackContent.innerHTML = html;
    feedbackContainer.classList.remove('hidden');
    document.getElementById('hint-feedback-container').classList.add('hidden');

    // --- New Tracking ---
    trackProblemCompletion(false);
    // --- End New Tracking ---
    
    // Update stats similar to the correct flow (but without incrementing correctFirstTry)
    sessionStats.totalQuestions++;
    if (hintsUsed.length > 0) {
        sessionStats.hintsUsed += hintsUsed.length;
        sessionStats.finalHintBeforeSolve = hintsUsed[hintsUsed.length - 1];
    }
    
    // Typeset any math in the solution
    setTimeout(() => {
        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise();
        }
    }, 100);
}

function hintFeedback(helpful) {
    // Track hint helpfulness per variant
    const eventData = {
        questionId: currentQuestion.id,
        variant: activeHintVariant,
        hintIndex: currentHintIndex,
        helpful: helpful
    };
    ldTrack('hint-feedback', eventData);
    
    // Hide the feedback container
    document.getElementById('hint-feedback-container').classList.add('hidden');
    
    // You can add more sophisticated tracking here if needed
    // Optional additional instrumentation could go here
    if (helpful) {
        console.log('User found the hint helpful');
    } else {
        console.log('User did not find the hint helpful');
    }
}

// --- New Tracking Function ---
function trackProblemCompletion(solvedCorrectly) {
    const eventData = {
        questionId: currentQuestion.id,
        variant: activeHintVariant,
        solved: solvedCorrectly,
        hintsUsedCount: hintsUsed.length
    };
    ldTrack('problem-completed', eventData);
}
// --- End New Tracking Function ---

function resetSession() {
    currentQuestionIndex = 0;
    sessionStats = {
        totalQuestions: 0,
        correctFirstTry: 0,
        hintsUsed: 0,
        finalHintBeforeSolve: null
    };
    loadNextQuestion();
}

// Utility functions for question management
function addQuestion(question) {
    questions.push(question);
}

function getAllQuestions() {
    return questions;
}

function getQuestionById(id) {
    return questions.find(q => q.id === id);
}