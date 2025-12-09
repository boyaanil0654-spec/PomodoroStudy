/* ============================================
   POMODORO TIMER
   ============================================ */

class PomodoroTimer {
    constructor() {
        this.utils = utils;
        this.sounds = sounds;
        this.notifications = notifications;
        this.storage = storage;
        
        this.state = {
            timeLeft: 25 * 60, // 25 minutes in seconds
            totalTime: 25 * 60,
            isRunning: false,
            isBreak: false,
            sessionCount: 0,
            totalSessions: 4,
            currentTask: null,
            autoStartNext: false
        };
        
        this.timerInterval = null;
        this.startTime = null;
        this.currentSession = null;
        
        this.soundEnabled = true;
        this.notificationsEnabled = true;
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadState();
        this.updateDisplay();
        this.setupEventListeners();
        this.checkAutoStart();
        
        console.log('Timer initialized:', this.state);
    }

    loadSettings() {
        const settings = this.storage.getSettings();
        
        this.state.totalTime = settings.timer.focusDuration * 60;
        this.state.timeLeft = this.state.totalTime;
        this.state.totalSessions = settings.timer.sessionsPerSet;
        this.state.autoStartNext = settings.timer.autoStartBreaks;
        
        this.soundEnabled = settings.notifications.sounds;
        this.notificationsEnabled = settings.notifications.enabled;
    }

    loadState() {
        const savedState = this.utils.getLocalStorage('timer_state');
        if (savedState) {
            // Check if the saved timer was running
            if (savedState.isRunning && savedState.startTime) {
                const elapsed = Math.floor((Date.now() - new Date(savedState.startTime)) / 1000);
                const newTimeLeft = Math.max(0, savedState.timeLeft - elapsed);
                
                if (newTimeLeft > 0) {
                    this.state = { ...savedState, timeLeft: newTimeLeft };
                } else {
                    this.completeSession();
                }
            } else {
                this.state = savedState;
            }
        }
    }

    saveState() {
        const stateToSave = {
            ...this.state,
            startTime: this.state.isRunning ? new Date().toISOString() : null
        };
        this.utils.setLocalStorage('timer_state', stateToSave);
    }

    updateDisplay() {
        const time = this.utils.formatTime(this.state.timeLeft);
        
        // Update timer display
        const minutesEl = document.getElementById('timer-minutes');
        const secondsEl = document.getElementById('timer-seconds');
        
        if (minutesEl) minutesEl.textContent = time.minutes;
        if (secondsEl) secondsEl.textContent = time.seconds;
        
        // Update progress ring
        const progress = ((this.state.totalTime - this.state.timeLeft) / this.state.totalTime) * 942;
        const circle = document.querySelector('.progress-ring-circle');
        if (circle) {
            circle.style.strokeDashoffset = 942 - progress;
        }
        
        // Update mode indicator
        const modeEl = document.getElementById('timerMode');
        if (modeEl) {
            const icon = this.state.isBreak ? 'fa-coffee' : 'fa-brain';
            const text = this.state.isBreak ? 'BREAK TIME' : 'FOCUS SESSION';
            modeEl.innerHTML = `<i class="fas ${icon}"></i><span>${text}</span>`;
            modeEl.className = `timer-mode ${this.state.isBreak ? 'break-mode' : 'focus-mode'}`;
        }
        
        // Update session counter
        const sessionCountEl = document.getElementById('sessionCount');
        const totalSessionsEl = document.getElementById('totalSessions');
        if (sessionCountEl) sessionCountEl.textContent = this.state.sessionCount + 1;
        if (totalSessionsEl) totalSessionsEl.textContent = this.state.totalSessions;
        
        // Update timer status
        const statusEl = document.getElementById('timerStatus');
        if (statusEl) {
            statusEl.textContent = this.state.isRunning ? 'RUNNING' : 'PAUSED';
            statusEl.className = `status-badge ${this.state.isRunning ? 'running' : 'paused'}`;
        }
        
        // Update controls
        this.updateControls();
        
        // Update next break time
        this.updateNextBreakTime();
    }

    updateControls() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const skipBtn = document.getElementById('skipBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        if (startBtn) {
            startBtn.disabled = this.state.isRunning;
            startBtn.innerHTML = this.state.isBreak ? 
                `<i class="fas fa-play"></i><span>Start Break</span>` :
                `<i class="fas fa-play"></i><span>Start Focus</span>`;
        }
        
        if (pauseBtn) {
            pauseBtn.disabled = !this.state.isRunning;
        }
        
        if (skipBtn) {
            skipBtn.innerHTML = this.state.isBreak ? 
                `<i class="fas fa-forward"></i><span>Skip Break</span>` :
                `<i class="fas fa-forward"></i><span>Skip Session</span>`;
        }
    }

    updateNextBreakTime() {
        const nextBreakEl = document.getElementById('nextBreak');
        if (nextBreakEl) {
            if (this.state.isBreak) {
                nextBreakEl.textContent = 'Focus Next';
            } else {
                const settings = this.storage.getSettings();
                const breakMinutes = settings.timer.breakDuration;
                nextBreakEl.textContent = `${breakMinutes}:00`;
            }
        }
    }

    start() {
        if (this.state.isRunning) return;
        
        this.state.isRunning = true;
        this.startTime = Date.now();
        
        // Start session in storage
        if (!this.state.isBreak) {
            this.currentSession = this.storage.startSession(this.state.currentTask?.id);
        }
        
        // Start timer interval
        this.timerInterval = setInterval(() => this.tick(), 1000);
        
        // Update UI
        this.updateDisplay();
        this.saveState();
        
        // Play start sound
        if (this.soundEnabled) {
            this.sounds.play(this.state.isBreak ? 'breakStart' : 'focusStart');
        }
        
        // Show notification
        if (this.notificationsEnabled) {
            const title = this.state.isBreak ? 'Break Started' : 'Focus Session Started';
            const message = this.state.isBreak ? 
                'Time to relax and recharge!' : 
                'Time to focus and be productive!';
            this.notifications.show(title, message, this.state.isBreak ? 'break' : 'focus');
        }
        
        console.log('Timer started:', this.state);
    }

    pause() {
        if (!this.state.isRunning) return;
        
        this.state.isRunning = false;
        clearInterval(this.timerInterval);
        
        // Update UI
        this.updateDisplay();
        this.saveState();
        
        // Play pause sound
        if (this.soundEnabled) {
            this.sounds.play('pause');
        }
        
        console.log('Timer paused:', this.state);
    }

    reset() {
        this.pause();
        
        // Reset timer to default
        const settings = this.storage.getSettings();
        this.state.timeLeft = (this.state.isBreak ? 
            settings.timer.breakDuration : 
            settings.timer.focusDuration) * 60;
        this.state.totalTime = this.state.timeLeft;
        
        // Update UI
        this.updateDisplay();
        this.saveState();
        
        // Play reset sound
        if (this.soundEnabled) {
            this.sounds.play('reset');
        }
        
        console.log('Timer reset:', this.state);
    }

    skip() {
        this.pause();
        this.completeSession();
    }

    tick() {
        this.state.timeLeft--;
        
        // Check for warnings
        if (this.state.timeLeft === 60) {
            this.showTimeWarning('1 minute left!');
        } else if (this.state.timeLeft === 10) {
            this.showTimeWarning('10 seconds left!');
        }
        
        // Update display every second
        this.updateDisplay();
        this.saveState();
        
        // Check if time is up
        if (this.state.timeLeft <= 0) {
            this.completeSession();
        }
    }

    showTimeWarning(message) {
        // Visual warning
        const timerDisplay = document.querySelector('.timer-numbers');
        if (timerDisplay) {
            timerDisplay.classList.add('time-warning');
            setTimeout(() => {
                timerDisplay.classList.remove('time-warning');
            }, 1000);
        }
        
        // Sound warning
        if (this.soundEnabled) {
            this.sounds.play('warning');
        }
        
        // Notification
        if (this.notificationsEnabled) {
            this.notifications.show('Time Almost Up!', message, 'warning');
        }
    }

    completeSession() {
        clearInterval(this.timerInterval);
        this.state.isRunning = false;
        
        // Complete session in storage
        if (!this.state.isBreak && this.currentSession) {
            this.storage.completeSession(this.currentSession.id);
            
            // Update task progress
            if (this.state.currentTask) {
                this.storage.updateTask(this.state.currentTask.id, {
                    completedPomodoros: Math.min(
                        this.state.currentTask.completedPomodoros + 1,
                        this.state.currentTask.estimatedPomodoros
                    )
                });
                
                // Check if task is completed
                const updatedTask = this.storage.getTasks()
                    .find(t => t.id === this.state.currentTask.id);
                
                if (updatedTask && 
                    updatedTask.completedPomodoros >= updatedTask.estimatedPomodoros &&
                    !updatedTask.isCompleted) {
                    this.storage.toggleTaskCompletion(updatedTask.id);
                }
            }
            
            // Increment session count
            this.state.sessionCount++;
            
            // Check for long break
            if (this.state.sessionCount >= this.state.totalSessions) {
                this.startLongBreak();
                return;
            }
        }
        
        // Play completion sound
        if (this.soundEnabled) {
            this.sounds.play(this.state.isBreak ? 'breakComplete' : 'sessionComplete');
        }
        
        // Show completion notification
        const title = this.state.isBreak ? 'Break Complete!' : 'Session Complete!';
        const message = this.state.isBreak ? 
            'Great job! Time to get back to work.' : 
            'Excellent work! Time for a break.';
        this.notifications.show(title, message, 'success');
        
        // Switch session type
        this.switchSessionType();
        
        // Check achievements
        const unlocked = this.storage.checkAchievements();
        if (unlocked.length > 0) {
            unlocked.forEach(achievement => {
                this.notifications.show(
                    'Achievement Unlocked!',
                    `You unlocked: ${achievement.id.replace('_', ' ')}`,
                    'success'
                );
            });
        }
        
        console.log('Session completed:', this.state);
    }

    switchSessionType() {
        const settings = this.storage.getSettings();
        
        this.state.isBreak = !this.state.isBreak;
        
        if (this.state.isBreak) {
            this.state.totalTime = settings.timer.breakDuration * 60;
        } else {
            this.state.totalTime = settings.timer.focusDuration * 60;
        }
        
        this.state.timeLeft = this.state.totalTime;
        
        // Auto-start next session if enabled
        if ((this.state.isBreak && settings.timer.autoStartBreaks) ||
            (!this.state.isBreak && settings.timer.autoStartFocus)) {
            setTimeout(() => this.start(), 1000);
        }
        
        this.updateDisplay();
        this.saveState();
    }

    startLongBreak() {
        const settings = this.storage.getSettings();
        
        this.state.isBreak = true;
        this.state.sessionCount = 0;
        this.state.totalTime = settings.timer.longBreakDuration * 60;
        this.state.timeLeft = this.state.totalTime;
        
        // Update UI
        this.updateDisplay();
        
        // Play special sound
        if (this.soundEnabled) {
            this.sounds.play('longBreakStart');
        }
        
        // Show notification
        this.notifications.show(
            'Long Break Time!',
            'Great job completing a full pomodoro set! Take a longer break.',
            'break'
        );
        
        // Auto-start if enabled
        if (settings.timer.autoStartBreaks) {
            setTimeout(() => this.start(), 1000);
        }
        
        this.saveState();
    }

    setDuration(minutes, type = 'focus') {
        this.pause();
        
        if (type === 'focus') {
            this.state.isBreak = false;
            this.state.totalTime = minutes * 60;
        } else {
            this.state.isBreak = true;
            this.state.totalTime = minutes * 60;
        }
        
        this.state.timeLeft = this.state.totalTime;
        
        // Update active preset button
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.minutes) === minutes && 
                btn.dataset.type === type) {
                btn.classList.add('active');
            }
        });
        
        this.updateDisplay();
        this.saveState();
    }

    setCurrentTask(task) {
        this.state.currentTask = task;
        
        // Update UI
        const currentTaskEl = document.getElementById('currentTask');
        if (currentTaskEl) {
            currentTaskEl.textContent = task?.title || 'Select a task';
            currentTaskEl.title = task?.title || '';
        }
        
        this.saveState();
    }

    getCurrentTask() {
        return this.state.currentTask;
    }

    getStats() {
        return {
            timeLeft: this.state.timeLeft,
            isRunning: this.state.isRunning,
            isBreak: this.state.isBreak,
            sessionCount: this.state.sessionCount,
            totalSessions: this.state.totalSessions,
            currentTask: this.state.currentTask,
            progress: ((this.state.totalTime - this.state.timeLeft) / this.state.totalTime) * 100
        };
    }

    checkAutoStart() {
        // Check if timer was running when page was closed
        if (this.state.isRunning) {
            this.start();
        }
    }

    setupEventListeners() {
        // Timer control buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('#startBtn')) {
                this.start();
            } else if (e.target.closest('#pauseBtn')) {
                this.pause();
            } else if (e.target.closest('#skipBtn')) {
                this.skip();
            } else if (e.target.closest('#resetBtn')) {
                this.reset();
            }
        });
        
        // Preset buttons
        document.addEventListener('click', (e) => {
            const presetBtn = e.target.closest('.preset-btn');
            if (presetBtn) {
                const minutes = parseInt(presetBtn.dataset.minutes);
                const type = presetBtn.dataset.type;
                this.setDuration(minutes, type);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable) {
                return;
            }
            
            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    if (this.state.isRunning) {
                        this.pause();
                    } else {
                        this.start();
                    }
                    break;
                    
                case 'n':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.skip();
                    }
                    break;
                    
                case 'r':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.reset();
                    }
                    break;
                    
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        const presets = [
                            { minutes: 25, type: 'focus' },
                            { minutes: 15, type: 'focus' },
                            { minutes: 50, type: 'focus' },
                            { minutes: 5, type: 'break' },
                            { minutes: 15, type: 'break' }
                        ];
                        const index = parseInt(e.key) - 1;
                        if (presets[index]) {
                            this.setDuration(presets[index].minutes, presets[index].type);
                        }
                    }
                    break;
            }
        });
        
        // Settings changes
        window.addEventListener('settingsChanged', (e) => {
            this.loadSettings();
            this.updateDisplay();
        });
    }

    destroy() {
        this.pause();
        clearInterval(this.timerInterval);
        this.saveState();
    }
}

// Create global instance
let timer = null;

// Initialize when DOM is ready
utils.ready(() => {
    timer = new PomodoroTimer();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PomodoroTimer;
}
