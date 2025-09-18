// Global state
let currentQuestion = null;
let currentHints = [];
let currentHintIndex = 0;
let isFirstAttempt = true;
let hintsUsed = [];
let sessionStats = {
    totalQuestions: 0,
    correctFirstTry: 0,
    hintsUsed: 0,
    finalHintBeforeSolve: null
};

// Sample questions with LaTeX and hints
const questions = [
    {
        id: 1,
        question: "Find the largest prime factor of $1343 = 10^3 + 7^3$",
        answer: "79",
        hints: [
            "Notice that 1343 is expressed as a sum of two cubes: $10^3 + 7^3$. This suggests we might be able to factor it using a special formula.",
            "Recall the sum of cubes factorization formula: $x^3 + y^3 = (x + y)(x^2 - xy + y^2)$. This formula can help us factor 1343.",
            "Apply the sum of cubes formula with $x = 10$ and $y = 7$. This gives us $10^3 + 7^3 = (10 + 7)(10^2 - 10 \\cdot 7 + 7^2)$.",
            "Simplify the first factor: $10 + 7 = 17$. Now calculate the second factor: $10^2 - 10 \\cdot 7 + 7^2 = 100 - 70 + 49 = 79$.",
            "So we have $1343 = 17 \\times 79$. Now we need to check if these factors are prime or can be factored further.",
            "Check if 17 is prime by testing divisibility by primes less than $\\sqrt{17} \\approx 4.1$. Since 17 is not divisible by 2 or 3, it is prime.",
            "Check if 79 is prime by testing divisibility by primes less than $\\sqrt{79} \\approx 8.9$. Test 2, 3, 5, and 7 - none divide 79, so 79 is prime.",
            "Since both 17 and 79 are prime factors of 1343, and $79 > 17$, the largest prime factor of 1343 is $\\boxed{79}$."
        ]
    },
    {
        id: 2,
        question: "Find a primes $p$ such that $p^{1994}+p^{1995}$ is a perfect square.",
        answer: "3",
        hints: [
            "Start by factoring the expression $p^{1994}+p^{1995}$. Notice that both terms have a common factor of $p^{1994}$.",
            "Factor out $p^{1994}$ to get $p^{1994}+p^{1995} = p^{1994}(1+p)$.",
            "Since $p^{1994} = (p^{997})^2$ and 1994 is even, we have a perfect square times $(1+p)$.",
            "For the entire expression to be a perfect square, $(1+p)$ must also be a perfect square. So $1+p = n^2$ for some integer $n$.",
            "This means $p = n^2 - 1 = (n-1)(n+1)$ for some integer $n$.",
            "Since $p$ is prime, one of the factors $(n-1)$ or $(n+1)$ must equal 1, and the other must equal $p$.",
            "If $n-1 = 1$, then $n = 2$ and $p = (2-1)(2+1) = 1 \\cdot 3 = 3$. If $n+1 = 1$, then $n = 0$ and $p = (-1)(1) = -1$, which is not prime.",
            "Therefore, the only prime $p$ such that $p^{1994}+p^{1995}$ is a perfect square is $p = \\boxed{3}$."
        ]
    },
    {
        id: 3,
        question: "Find the value of $2^3-1^3+4^3-3^3+6^3-5^3+\\cdots+18^3-17^3$.",
        answer: "3159",
        hints: [
            "Notice the pattern: each term is of the form $(2n)^3 - (2n-1)^3$ where $n$ goes from 1 to 9.",
            "Use the difference of cubes formula: $a^3 - b^3 = (a-b)(a^2 + ab + b^2)$.",
            "Apply this to $(2n)^3 - (2n-1)^3$: $(2n)^3 - (2n-1)^3 = (2n - (2n-1))((2n)^2 + (2n)(2n-1) + (2n-1)^2)$.",
            "Simplify: $(2n)^3 - (2n-1)^3 = 1 \\cdot ((2n)^2 + (2n)(2n-1) + (2n-1)^2) = 4n^2 + 4n^2 - 2n + 4n^2 - 4n + 1$.",
            "Combine like terms: $(2n)^3 - (2n-1)^3 = 12n^2 - 6n + 1$.",
            "The sum becomes $\\sum_{n=1}^{9} (12n^2 - 6n + 1) = 12\\sum_{n=1}^{9} n^2 - 6\\sum_{n=1}^{9} n + \\sum_{n=1}^{9} 1$.",
            "Use the formulas: $\\sum_{k=1}^{n} k^2 = \\frac{n(n+1)(2n+1)}{6}$ and $\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$.",
            "Calculate: $12 \\cdot \\frac{9 \\cdot 10 \\cdot 19}{6} - 6 \\cdot \\frac{9 \\cdot 10}{2} + 9 = 12 \\cdot 285 - 6 \\cdot 45 + 9 = 3420 - 270 + 9 = \\boxed{3159}$."
        ]
    },
    {
        id: 4,
        question: "If $x,y$ are positive integers such that $xy = 2x + 3y + 5$, find the largest possible value of $x$.",
        answer: "14",
        hints: [
            "Start with the equation $xy = 2x + 3y + 5$ and rearrange it to get $xy - 2x - 3y = 5$.",
            "To factor this expression, we need to use Simon's Favorite Factoring Trick. Add 6 to both sides: $xy - 2x - 3y + 6 = 11$.",
            "Now the left side can be factored as $(x-3)(y-2) = 11$. This is the key insight of Simon's Favorite Factoring Trick.",
            "Since 11 is prime, the only positive integer factor pairs of 11 are $(1,11)$ and $(11,1)$.",
            "This gives us two cases: $(x-3, y-2) = (1,11)$ or $(x-3, y-2) = (11,1)$.",
            "For the first case: $x-3 = 1$ and $y-2 = 11$, so $x = 4$ and $y = 13$.",
            "For the second case: $x-3 = 11$ and $y-2 = 1$, so $x = 14$ and $y = 3$.",
            "The two solutions are $(x,y) = (4,13)$ and $(x,y) = (14,3)$. The largest possible value of $x$ is therefore $\\boxed{14}$."
        ]
    },
    {
        id: 5,
        question: "Find a prime factor $p > 250000$ of $1002004008016032$.",
        answer: "250501",
        hints: [
            "Notice that $1002004008016032$ can be written as $1000^5 + 1000^4 \\cdot 2 + 1000^3 \\cdot 2^2 + 1000^2 \\cdot 2^3 + 1000 \\cdot 2^4 + 2^5$.",
            "This is a geometric series: $x^5 + x^4y + x^3y^2 + x^2y^3 + xy^4 + y^5$ where $x = 1000$ and $y = 2$.",
            "Use the geometric series formula: $\\frac{x^6 - y^6}{x - y} = \\frac{1000^6 - 2^6}{1000 - 2}$.",
            "Factor the numerator using difference of squares: $1000^6 - 2^6 = (1000^3)^2 - (2^3)^2 = (1000^3 - 2^3)(1000^3 + 2^3)$.",
            "Further factor using sum and difference of cubes: $(1000^3 - 2^3)(1000^3 + 2^3) = (1000-2)(1000^2+1000\\cdot2+2^2)(1000+2)(1000^2-1000\\cdot2+2^2)$.",
            "Simplify: $= 998 \\cdot (1000000+2000+4) \\cdot 1002 \\cdot (1000000-2000+4) = 998 \\cdot 1002004 \\cdot 1002 \\cdot 998004$.",
            "The expression becomes $2^5 \\cdot \\frac{(500^3-1)(500^3+1)}{500-1} = 2^5 \\cdot \\frac{(500-1)(500^2+500+1)(500+1)(500^2-500+1)}{500-1}$.",
            "After canceling, we get $2^5 \\cdot (500^2+500+1)(500+1)(500^2-500+1)$. The factor $500^2+500+1 = 250000+500+1 = \\boxed{250501}$ is prime and greater than 250000."
        ]
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadRandomQuestion();
    setupEventListeners();
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
