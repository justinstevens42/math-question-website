// Global state
let currentQuestion = null;
let currentHints = [];
let currentHintIndex = 0;
let isFirstAttempt = true;
let hintsUsed = [];
let questions = []; // Will be loaded from JSON file
let sessionStats = {
    totalQuestions: 0,
    correctFirstTry: 0,
    hintsUsed: 0,
    finalHintBeforeSolve: null
};

// LaunchDarkly SDK initialization
// You'll need this context later, but you can ignore it for now.
const context = {
  kind: 'user',
  key: 'context-key-123abc'
};

// Initialize LaunchDarkly client when the page loads
let ldClient = null;

function initializeLaunchDarkly() {
  if (window.LDClient) {
    ldClient = window.LDClient.initialize('68ccd8b8987d6c09973312f0', context);
    
    ldClient.on('initialized', function () {
      // Tracking your memberId lets us know you are connected.
      ldClient.track('68ccd8b8987d6c09973312ef');
      console.log('LaunchDarkly SDK successfully initialized!');
    });
  } else {
    console.log('LaunchDarkly SDK not loaded yet, retrying...');
    setTimeout(initializeLaunchDarkly, 100);
  }
}

// Function to load questions from JSON file
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        questions = data;
        console.log(`Loaded ${questions.length} questions from JSON file`);
        return true;
    } catch (error) {
        console.error('Error loading questions:', error);
        // Fallback to a simple question if JSON loading fails
        questions = [{
            id: 1,
            question: "What is 2 + 2?",
            answer: "4",
            hints: [
                "This is a basic arithmetic question.",
                "Add the two numbers together.",
                "The answer is 4."
            ]
        }];
        return false;
    }
}

// Function to add a new question dynamically
function addQuestion(questionData) {
    // Generate a new ID if not provided
    if (!questionData.id) {
        questionData.id = Math.max(...questions.map(q => q.id), 0) + 1;
    }
    
    questions.push(questionData);
    console.log(`Added new question with ID ${questionData.id}`);
    return questionData.id;
}

// Function to get all questions (useful for debugging or management)
function getAllQuestions() {
    return questions;
}

// Function to get a specific question by ID
function getQuestionById(id) {
    return questions.find(q => q.id === id);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    await loadQuestions();
    loadRandomQuestion();
    setupEventListeners();
    initializeLaunchDarkly();
});

function setupEventListeners() {
    const answerInput = document.getElementById('answer-input');
    answerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitAnswer();
        }
    });
}

function loadRandomQuestion() {
    const randomIndex = Math.floor(Math.random() * questions.length);
    currentQuestion = questions[randomIndex];
    currentHints = [...currentQuestion.hints];
    currentHintIndex = 0;
    isFirstAttempt = true;
    hintsUsed = [];
    
    // Update question display
    document.getElementById('question-text').innerHTML = currentQuestion.question;
    
    // Hide feedback containers
    document.getElementById('feedback-container').classList.add('hidden');
    document.getElementById('hint-feedback-container').classList.add('hidden');
    document.getElementById('stats-container').classList.add('hidden');
    
    // Clear answer input
    document.getElementById('answer-input').value = '';
    
    // Re-render MathJax
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

function submitAnswer() {
    const userAnswer = document.getElementById('answer-input').value.trim();
    const correctAnswer = currentQuestion.answer;
    
    if (!userAnswer) {
        alert('Please enter an answer before submitting.');
        return;
    }
    
    const isCorrect = checkAnswer(userAnswer, correctAnswer);
    
    if (isCorrect) {
        if (isFirstAttempt) {
            showCorrectAnswer();
        } else {
            showCorrectAnswerWithHints();
        }
    } else {
        if (isFirstAttempt) {
            showFirstHint();
        } else {
            showIncorrectAnswer();
        }
    }
    
    isFirstAttempt = false;
}

function checkAnswer(userAnswer, correctAnswer) {
    // Normalize answers for comparison
    const normalize = (answer) => {
        return answer.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[()]/g, '')
            .replace(/\^/g, '^');
    };
    
    return normalize(userAnswer) === normalize(correctAnswer);
}

function showCorrectAnswer() {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContent = document.getElementById('feedback-content');
    
    feedbackContainer.className = 'feedback-container correct';
    feedbackContent.innerHTML = `
        <h3>🎉 Correct!</h3>
        <p>Great job! You got it right on the first try.</p>
        <div class="solution">
            <h4>Solution:</h4>
            <p>${currentQuestion.question}</p>
            <p><strong>Answer:</strong> $${currentQuestion.answer}$</p>
        </div>
    `;
    
    feedbackContainer.classList.remove('hidden');
    
    // Update stats
    sessionStats.totalQuestions++;
    sessionStats.correctFirstTry++;
    
    // Re-render MathJax
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
    
    // Show next question option
    setTimeout(() => {
        showNextQuestionOption();
    }, 2000);
}

function showCorrectAnswerWithHints() {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContent = document.getElementById('feedback-content');
    
    feedbackContainer.className = 'feedback-container correct';
    feedbackContent.innerHTML = `
        <h3>🎉 Correct!</h3>
        <p>Well done! You solved it after using ${hintsUsed.length} hint(s).</p>
        <div class="solution">
            <h4>Solution:</h4>
            <p>${currentQuestion.question}</p>
            <p><strong>Answer:</strong> $${currentQuestion.answer}$</p>
        </div>
        <div class="hints-used">
            <h4>Hints you used:</h4>
            <ul>
                ${hintsUsed.map((hint, index) => `<li>${index + 1}. ${hint}</li>`).join('')}
            </ul>
        </div>
    `;
    
    feedbackContainer.classList.remove('hidden');
    
    // Update stats
    sessionStats.totalQuestions++;
    sessionStats.hintsUsed += hintsUsed.length;
    sessionStats.finalHintBeforeSolve = hintsUsed[hintsUsed.length - 1] || 'No hints used';
    
    // Re-render MathJax
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
    
    // Show next question option
    setTimeout(() => {
        showNextQuestionOption();
    }, 2000);
}

function showFirstHint() {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContent = document.getElementById('feedback-content');
    
    feedbackContainer.className = 'feedback-container hint';
    feedbackContent.innerHTML = `
        <h3>Not quite right</h3>
        <p>Here's a hint to help you:</p>
        <div class="hint-content">
            <p><strong>Hint:</strong> ${currentHints[currentHintIndex]}</p>
        </div>
    `;
    
    feedbackContainer.classList.remove('hidden');
    document.getElementById('action-buttons').classList.remove('hidden');
    
    // Track hint usage
    hintsUsed.push(currentHints[currentHintIndex]);
    currentHintIndex++;
}

function showIncorrectAnswer() {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackContent = document.getElementById('feedback-content');
    
    feedbackContainer.className = 'feedback-container incorrect';
    feedbackContent.innerHTML = `
        <h3>Incorrect</h3>
        <p>That's not the right answer. Would you like to try again or get another hint?</p>
    `;
    
    feedbackContainer.classList.remove('hidden');
    document.getElementById('action-buttons').classList.remove('hidden');
}

function showHint() {
    if (currentHintIndex < currentHints.length) {
        const feedbackContainer = document.getElementById('feedback-container');
        const feedbackContent = document.getElementById('feedback-content');
        
        feedbackContainer.className = 'feedback-container hint';
        feedbackContent.innerHTML = `
            <h3>Here's another hint:</h3>
            <div class="hint-content">
                <p><strong>Hint ${currentHintIndex + 1}:</strong> ${currentHints[currentHintIndex]}</p>
            </div>
        `;
        
        // Track hint usage
        hintsUsed.push(currentHints[currentHintIndex]);
        currentHintIndex++;
        
        // Show hint feedback
        document.getElementById('hint-feedback-container').classList.remove('hidden');
        document.getElementById('action-buttons').classList.add('hidden');
    } else {
        alert('No more hints available. Try to solve the problem!');
    }
}

function tryAgain() {
    // Clear answer input
    document.getElementById('answer-input').value = '';
    
    // Hide feedback containers
    document.getElementById('feedback-container').classList.add('hidden');
    document.getElementById('hint-feedback-container').classList.add('hidden');
    
    // Focus on answer input
    document.getElementById('answer-input').focus();
}

function hintFeedback(wasHelpful) {
    // Hide hint feedback container
    document.getElementById('hint-feedback-container').classList.add('hidden');
    
    // Show action buttons again
    document.getElementById('action-buttons').classList.remove('hidden');
    
    // You could store this feedback for analytics
    console.log(`Hint was helpful: ${wasHelpful}`);
}

function showNextQuestionOption() {
    const feedbackContent = document.getElementById('feedback-content');
    const nextQuestionHTML = `
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="loadRandomQuestion()" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                Next Question
            </button>
            <button onclick="showStats()" style="
                background: #48bb78;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                margin-left: 15px;
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                View Statistics
            </button>
        </div>
    `;
    
    feedbackContent.innerHTML += nextQuestionHTML;
}

function showStats() {
    const statsContainer = document.getElementById('stats-container');
    const statsContent = document.getElementById('stats-content');
    
    const accuracy = sessionStats.totalQuestions > 0 ? 
        ((sessionStats.correctFirstTry / sessionStats.totalQuestions) * 100).toFixed(1) : 0;
    
    statsContent.innerHTML = `
        <div class="stat-item">
            <strong>Total Questions:</strong> ${sessionStats.totalQuestions}
        </div>
        <div class="stat-item">
            <strong>Correct on First Try:</strong> ${sessionStats.correctFirstTry} (${accuracy}%)
        </div>
        <div class="stat-item">
            <strong>Total Hints Used:</strong> ${sessionStats.hintsUsed}
        </div>
        <div class="stat-item">
            <strong>Average Hints per Question:</strong> ${sessionStats.totalQuestions > 0 ? 
                (sessionStats.hintsUsed / sessionStats.totalQuestions).toFixed(1) : 0}
        </div>
        ${sessionStats.finalHintBeforeSolve ? `
        <div class="stat-item">
            <strong>Last Hint Used:</strong> "${sessionStats.finalHintBeforeSolve}"
        </div>
        ` : ''}
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="resetStats()" style="
                background: #f56565;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                margin-right: 10px;
            ">Reset Statistics</button>
            <button onclick="document.getElementById('stats-container').classList.add('hidden')" style="
                background: #4299e1;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
            ">Close</button>
        </div>
    `;
    
    statsContainer.classList.remove('hidden');
}

function resetStats() {
    sessionStats = {
        totalQuestions: 0,
        correctFirstTry: 0,
        hintsUsed: 0,
        finalHintBeforeSolve: null
    };
    
    document.getElementById('stats-container').classList.add('hidden');
    alert('Statistics have been reset!');
}
