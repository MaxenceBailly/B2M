// Gestion des données utilisateur
        class UserData {
            constructor() {
                this.loadData();
            }

            loadData() {
                const saved = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('mathtrainer='));
                
                if (saved) {
                    const data = JSON.parse(decodeURIComponent(saved.split('=')[1]));
                    this.username = data.username || 'Élève';
                    this.level = data.level || 1;
                    this.xp = data.xp || 0;
                    this.stats = data.stats || {
                        totalQuestions: 0,
                        correctAnswers: 0,
                        currentStreak: 0,
                        bestStreak: 0,
                        modes: {
                            'calcul-mental': { level: 1, xp: 0, questions: 0, correct: 0 }
                        }
                    };
                } else {
                    this.username = 'Élève';
                    this.level = 1;
                    this.xp = 0;
                    this.stats = {
                        totalQuestions: 0,
                        correctAnswers: 0,
                        currentStreak: 0,
                        bestStreak: 0,
                        modes: {
                            'calcul-mental': { level: 1, xp: 0, questions: 0, correct: 0 }
                        }
                    };
                }
            }

            saveData() {
                const data = {
                    username: this.username,
                    level: this.level,
                    xp: this.xp,
                    stats: this.stats
                };
                document.cookie = `mathtrainer=${encodeURIComponent(JSON.stringify(data))}; expires=${new Date(Date.now() + 365*24*60*60*1000).toUTCString()}; path=/`;
            }

            addXP(amount) {
                this.xp += amount;
                const xpNeeded = this.level * 100;
                if (this.xp >= xpNeeded) {
                    this.level++;
                    this.xp -= xpNeeded;
                }
                this.saveData();
            }

            updateStats(mode, correct) {
                this.stats.totalQuestions++;
                if (correct) {
                    this.stats.correctAnswers++;
                    this.stats.currentStreak++;
                    if (this.stats.currentStreak > this.stats.bestStreak) {
                        this.stats.bestStreak = this.stats.currentStreak;
                    }
                } else {
                    this.stats.currentStreak = 0;
                }

                if (!this.stats.modes[mode]) {
                    this.stats.modes[mode] = { level: 1, xp: 0, questions: 0, correct: 0 };
                }
                
                this.stats.modes[mode].questions++;
                if (correct) {
                    this.stats.modes[mode].correct++;
                    this.stats.modes[mode].xp += 10;
                    if (this.stats.modes[mode].xp >= this.stats.modes[mode].level * 50) {
                        this.stats.modes[mode].level++;
                        this.stats.modes[mode].xp = 0;
                    }
                }

                this.saveData();
            }
        }

        // Générateur de questions
        class QuestionGenerator {
            static generateCalculMental(level) {
                const operations = ['+', '-', '*', '/'];
                const operation = operations[Math.floor(Math.random() * operations.length)];
                
                let num1, num2, answer;
                
                switch(operation) {
                    case '+':
                        num1 = Math.floor(Math.random() * (level * 10)) + 1;
                        num2 = Math.floor(Math.random() * (level * 10)) + 1;
                        answer = num1 + num2;
                        break;
                    case '-':
                        num1 = Math.floor(Math.random() * (level * 10)) + level * 5;
                        num2 = Math.floor(Math.random() * num1) + 1;
                        answer = num1 - num2;
                        break;
                    case '*':
                        num1 = Math.floor(Math.random() * Math.min(level + 5, 12)) + 1;
                        num2 = Math.floor(Math.random() * Math.min(level + 5, 12)) + 1;
                        answer = num1 * num2;
                        break;
                    case '/':
                        answer = Math.floor(Math.random() * (level * 5)) + 1;
                        num2 = Math.floor(Math.random() * (level + 2)) + 2;
                        num1 = answer * num2;
                        break;
                }
                
                return {
                    question: `${num1} ${operation} ${num2} = ?`,
                    answer: answer
                };
            }
        }

        // Jeu principal
        class MathGame {
            constructor() {
                this.userData = new UserData();
                this.currentMode = null;
                this.currentQuestion = null;
                this.gameScore = 0;
                this.gameStreak = 0;
                this.gameStartTime = null;
                this.gameTimer = null;
                
                this.initializeElements();
                this.updateUI();
                this.setupEventListeners();
                this.applyTheme();
            }

            initializeElements() {
                this.homeScreen = document.getElementById('home-screen');
                this.gameScreen = document.getElementById('game-screen');
                this.questionText = document.getElementById('question-text');
                this.answerInput = document.getElementById('answer-input');
                this.submitBtn = document.getElementById('submit-btn');
                this.resultMessage = document.getElementById('result-message');
                this.backBtn = document.getElementById('back-btn');
                this.themeToggle = document.getElementById('theme-toggle');
            }

            updateUI() {
                // Header
                document.getElementById('username').textContent = this.userData.username;
                document.getElementById('user-level').textContent = this.userData.level;
                
                const xpNeeded = this.userData.level * 100;
                const xpPercent = (this.userData.xp / xpNeeded) * 100;
                document.getElementById('xp-fill').style.width = `${xpPercent}%`;
                document.getElementById('xp-text').textContent = `${this.userData.xp}/${xpNeeded} XP`;

                // Stats
                const accuracy = this.userData.stats.totalQuestions > 0 
                    ? Math.round((this.userData.stats.correctAnswers / this.userData.stats.totalQuestions) * 100)
                    : 0;
                
                document.getElementById('accuracy-percent').textContent = `${accuracy}%`;
                this.updateProgressRing('accuracy-circle', accuracy);
                
                document.getElementById('total-questions').textContent = this.userData.stats.totalQuestions;
                document.getElementById('current-streak').textContent = this.userData.stats.currentStreak;

                // Mode levels
                const calculLevel = this.userData.stats.modes['calcul-mental']?.level || 1;
                document.getElementById('calcul-level').textContent = calculLevel;
            }

            updateProgressRing(id, percent) {
                const circle = document.getElementById(id);
                const radius = 32;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (percent / 100) * circumference;
                
                circle.style.strokeDasharray = circumference;
                circle.style.strokeDashoffset = offset;
            }

            setupEventListeners() {
                // Mode selection
                document.querySelectorAll('.mode-card.available').forEach(card => {
                    card.addEventListener('click', () => {
                        const mode = card.dataset.mode;
                        this.startGame(mode);
                    });
                });

                // Game controls
                this.submitBtn.addEventListener('click', () => this.submitAnswer());
                this.answerInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.submitAnswer();
                });
                this.backBtn.addEventListener('click', () => this.endGame());

                // Theme toggle
                this.themeToggle.addEventListener('click', () => this.toggleTheme());
            }

            startGame(mode) {
                this.currentMode = mode;
                this.gameScore = 0;
                this.gameStreak = 0;
                this.gameStartTime = Date.now();
                
                this.homeScreen.style.display = 'none';
                this.gameScreen.style.display = 'block';
                
                this.startGameTimer();
                this.generateNewQuestion();
                this.answerInput.focus();
            }

            generateNewQuestion() {
                const level = this.userData.stats.modes[this.currentMode]?.level || 1;
                
                switch(this.currentMode) {
                    case 'calcul-mental':
                        this.currentQuestion = QuestionGenerator.generateCalculMental(level);
                        break;
                }
                
                this.questionText.textContent = this.currentQuestion.question;
                this.answerInput.value = '';
                this.resultMessage.style.display = 'none';
                this.answerInput.focus();
            }

            submitAnswer() {
                const userAnswer = parseInt(this.answerInput.value);
                const correct = userAnswer === this.currentQuestion.answer;
                
                this.showResult(correct);
                this.updateGameStats(correct);
                this.userData.updateStats(this.currentMode, correct);
                
                if (correct) {
                    this.userData.addXP(10 + this.gameStreak);
                }
                
                this.updateUI();
                this.updateGameUI();
                
                setTimeout(() => {
                    this.generateNewQuestion();
                }, 1500);
            }

            showResult(correct) {
                this.resultMessage.style.display = 'block';
                if (correct) {
                    this.resultMessage.className = 'result-message result-correct';
                    this.resultMessage.textContent = `Correct ! +${10 + this.gameStreak} XP`;
                } else {
                    this.resultMessage.className = 'result-message result-incorrect';
                    this.resultMessage.textContent = `Incorrect. La réponse était ${this.currentQuestion.answer}`;
                }
            }

            updateGameStats(correct) {
                if (correct) {
                    this.gameScore += 10 + this.gameStreak;
                    this.gameStreak++;
                } else {
                    this.gameStreak = 0;
                }
            }

            updateGameUI() {
                document.getElementById('game-score').textContent = this.gameScore;
                document.getElementById('game-streak').textContent = this.gameStreak;
            }

            startGameTimer() {
                this.gameTimer = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    document.getElementById('game-time').textContent = 
                        `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }, 1000);
            }

            endGame() {
                if (this.gameTimer) {
                    clearInterval(this.gameTimer);
                }
                
                this.gameScreen.style.display = 'none';
                this.homeScreen.style.display = 'block';
                this.updateUI();
            }

            toggleTheme() {
                const currentTheme = document.body.dataset.theme;
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.body.dataset.theme = newTheme;
                this.themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
                
                // Save theme preference
                document.cookie = `theme=${newTheme}; expires=${new Date(Date.now() + 365*24*60*60*1000).toUTCString()}; path=/`;
            }

            applyTheme() {
                const savedTheme = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('theme='));
                
                if (savedTheme) {
                    const theme = savedTheme.split('=')[1];
                    document.body.dataset.theme = theme;
                    this.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
                }
            }
        }

        // Initialisation du jeu
        document.addEventListener('DOMContentLoaded', () => {
            new MathGame();
        });