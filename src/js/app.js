/* ============================================
   MAIN APPLICATION
   ============================================ */

class RoyalPomodoroApp {
    constructor() {
        this.utils = utils;
        this.storage = storage;
        this.timer = timer;
        this.taskManager = taskManager;
        this.analytics = analytics;
        this.notifications = notifications;
        this.sounds = sounds;
        this.ui = ui;
        
        this.appVersion = '1.0.0';
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    init() {
        console.log('🎯 Royal Pomodoro App Initializing...');
        
        // Check system requirements
        if (!this.checkRequirements()) {
            this.showError('Your browser does not meet the requirements for this app.');
            return;
        }
        
        // Initialize components
        this.initializeComponents();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        // Check for updates
        this.checkForUpdates();
        
        this.isInitialized = true;
        console.log('👑 Royal Pomodoro App Ready!');
    }

    checkRequirements() {
        const requirements = {
            localStorage: 'localStorage' in window,
            es6: typeof Symbol !== 'undefined',
            fetch: 'fetch' in window,
            promises: 'Promise' in window,
            canvas: 'HTMLCanvasElement' in window
        };
        
        const missing = Object.entries(requirements)
            .filter(([name, available]) => !available)
            .map(([name]) => name);
        
        if (missing.length > 0) {
            console.error('Missing requirements:', missing);
            return false;
        }
        
        return true;
    }

    initializeComponents() {
        // Components are already initialized by their respective classes
        // This is where we would set up inter-component communication
        
        // Set up component references
        if (this.timer && this.taskManager) {
            // Timer can notify task manager when sessions complete
            // This is already handled in timer.js
        }
        
        // Initialize service worker
        this.initializeServiceWorker();
    }

    initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registered:', registration);
                        
                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            console.log('New service worker found:', newWorker);
                            
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    this.showUpdateNotification();
                                }
                            });
                        });
                    })
                    .catch(error => {
                        console.log('ServiceWorker registration failed:', error);
                    });
            });
        }
    }

    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.ui.updateSystemStatus();
            this.notifications.show('Back Online', 'Connection restored', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.ui.updateSystemStatus();
            this.notifications.show('Offline Mode', 'Working with local data', 'warning');
        });
        
        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppHide();
            } else {
                this.onAppShow();
            }
        });
        
        // Before unload
        window.addEventListener('beforeunload', (e) => {
            this.onAppUnload(e);
        });
        
        // Resize events
        window.addEventListener('resize', this.utils.throttle(() => {
            this.onWindowResize();
        }, 300));
        
        // Data changes
        window.addEventListener('dataChanged', () => {
            this.onDataChanged();
        });
        
        // Settings changes
        window.addEventListener('settingsChanged', () => {
            this.onSettingsChanged();
        });
        
        // Theme changes
        window.addEventListener('themeChanged', (e) => {
            this.onThemeChanged(e.detail.theme);
        });
        
        // Error handling
        window.addEventListener('error', (e) => {
            this.onError(e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.onUnhandledRejection(e.reason);
        });
    }

    startPeriodicUpdates() {
        // Update system status every minute
        setInterval(() => {
            this.ui.updateSystemStatus();
        }, 60000);
        
        // Save all data every 5 minutes
        setInterval(() => {
            this.saveAllData();
        }, 300000);
        
        // Check for achievements every 10 minutes
        setInterval(() => {
            this.checkAchievements();
        }, 600000);
        
        // Optimize storage every hour
        setInterval(() => {
            this.storage.optimizeStorage();
        }, 3600000);
    }

    checkForUpdates() {
        // Check for app updates
        const lastUpdateCheck = this.utils.getLocalStorage('last_update_check');
        const now = Date.now();
        
        // Check once per day
        if (!lastUpdateCheck || now - lastUpdateCheck > 24 * 60 * 60 * 1000) {
            this.utils.setLocalStorage('last_update_check', now);
            
            // In a real app, this would fetch from an API
            console.log('Update check performed');
        }
    }

    showUpdateNotification() {
        this.notifications.show(
            'Update Available',
            'A new version is available. Refresh to update.',
            'info'
        );
    }

    onAppHide() {
        // App went to background
        console.log('App hidden');
        
        // Save current state
        this.saveAllData();
        
        // Pause timer if running
        if (this.timer && this.timer.state.isRunning) {
            this.timer.pause();
        }
    }

    onAppShow() {
        // App came to foreground
        console.log('App shown');
        
        // Update everything
        if (this.timer) this.timer.updateDisplay();
        if (this.taskManager) this.taskManager.renderTasks();
        if (this.analytics) this.analytics.refresh();
        if (this.ui) this.ui.updateSystemStatus();
    }

    onAppUnload(e) {
        // Save all data before closing
        this.saveAllData();
        
        // Clean up
        if (this.timer) this.timer.destroy();
        
        console.log('App unloading');
    }

    onWindowResize() {
        // Handle responsive design updates
        if (this.analytics) {
            this.analytics.renderCharts();
        }
    }

    onDataChanged() {
        // Data was modified - update components
        if (this.taskManager) {
            this.taskManager.loadTasks();
            this.taskManager.renderTasks();
            this.taskManager.updateStats();
        }
        
        if (this.analytics) {
            this.analytics.updateStats();
            this.analytics.renderCharts();
        }
        
        // Update navigation stats
        this.updateNavigationStats();
    }

    onSettingsChanged() {
        // Settings were updated
        if (this.timer) this.timer.loadSettings();
        if (this.notifications) this.notifications.loadSettings();
        if (this.sounds) this.sounds.loadSettings();
        if (this.ui) this.ui.loadTheme();
        
        // Update UI based on settings
        this.applySettingsToUI();
    }

    onThemeChanged(theme) {
        // Theme was changed
        console.log('Theme changed to:', theme);
        
        // Update any theme-specific UI
        this.updateThemeSpecificUI(theme);
    }

    onError(error) {
        console.error('Application error:', error);
        
        // Show user-friendly error message
        this.showError('An unexpected error occurred. Please try again.');
        
        // Log to server in production
        if (this.isOnline && process.env.NODE_ENV === 'production') {
            this.logError(error);
        }
    }

    onUnhandledRejection(reason) {
        console.error('Unhandled promise rejection:', reason);
        this.onError(reason);
    }

    applySettingsToUI() {
        const settings = this.storage.getSettings();
        
        // Apply reduce motion
        if (settings.appearance.reduceMotion) {
            document.documentElement.style.setProperty('--transition-normal', '0ms');
            document.documentElement.style.setProperty('--transition-slow', '0ms');
        } else {
            document.documentElement.style.setProperty('--transition-normal', '300ms');
            document.documentElement.style.setProperty('--transition-slow', '500ms');
        }
        
        // Apply compact view
        if (settings.appearance.compactView) {
            document.body.classList.add('compact-view');
        } else {
            document.body.classList.remove('compact-view');
        }
        
        // Apply show seconds
        const secondsDisplay = document.getElementById('timer-seconds');
        if (secondsDisplay) {
            if (!settings.appearance.showSeconds) {
                secondsDisplay.style.display = 'none';
                document.querySelector('.timer-colon')?.style.display = 'none';
            } else {
                secondsDisplay.style.display = 'block';
                document.querySelector('.timer-colon')?.style.display = 'block';
            }
        }
    }

    updateThemeSpecificUI(theme) {
        // Update any theme-specific elements
        const logo = document.querySelector('.logo h1');
        if (logo) {
            // Update gradient based on theme
            const gradients = {
                royal: 'linear-gradient(to right, #ffd700, #fff)',
                dark: 'linear-gradient(to right, #ffd700, #ffed4e)',
                purple: 'linear-gradient(to right, #9d4edd, #ffd700)',
                gold: 'linear-gradient(to right, #ffd700, #ffffff)'
            };
            
            logo.style.backgroundImage = gradients[theme] || gradients.royal;
        }
    }

    updateNavigationStats() {
        const stats = this.storage.getStatistics();
        
        // Update streak
        const navStreak = document.getElementById('nav-streak');
        if (navStreak) navStreak.textContent = stats.currentStreak;
        
        // Update total focus time
        const navTotal = document.getElementById('nav-total');
        if (navTotal) {
            const hours = Math.floor(stats.totalFocusMinutes / 60);
            navTotal.textContent = `${hours}h`;
        }
    }

    saveAllData() {
        if (this.storage) {
            this.storage.saveAll();
        }
    }

    checkAchievements() {
        if (this.storage) {
            const unlocked = this.storage.checkAchievements();
            
            unlocked.forEach(achievement => {
                this.notifications.showAchievement(
                    achievement.id.replace('_', ' '),
                    'Great work! Keep it up!'
                );
            });
        }
    }

    logError(error) {
        // In a real app, send to error tracking service
        const errorData = {
            message: error.message,
            stack: error.stack,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            appVersion: this.appVersion
        };
        
        console.log('Error logged:', errorData);
    }

    showError(message) {
        const errorDiv = this.utils.createElement('div', 'error-message', {
            html: `
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>${message}</div>
                    <button class="error-close">&times;</button>
                </div>
            `
        });
        
        document.body.appendChild(errorDiv);
        
        // Animate in
        setTimeout(() => {
            errorDiv.classList.add('show');
        }, 10);
        
        // Close button
        const closeBtn = errorDiv.querySelector('.error-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                errorDiv.classList.remove('show');
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.parentNode.removeChild(errorDiv);
                    }
                }, 300);
            });
        }
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.classList.remove('show');
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.parentNode.removeChild(errorDiv);
                    }
                }, 300);
            }
        }, 10000);
    }

    getAppStats() {
        const storageSize = this.storage.getDataSize();
        const uiStats = this.ui.getUIStats();
        const timerStats = this.timer.getStats();
        const taskStats = this.taskManager.getStats();
        const notificationStats = this.notifications.getStats();
        const soundStats = this.sounds.getStats();
        
        return {
            version: this.appVersion,
            initialized: this.isInitialized,
            online: this.isOnline,
            storage: storageSize,
            ui: uiStats,
            timer: timerStats,
            tasks: taskStats,
            notifications: notificationStats,
            sounds: soundStats,
            timestamp: new Date().toISOString()
        };
    }

    exportDebugInfo() {
        const debugInfo = this.getAppStats();
        const filename = `royal-pomodoro-debug-${new Date().toISOString().split('T')[0]}.json`;
        this.utils.downloadFile(JSON.stringify(debugInfo, null, 2), filename, 'application/json');
        
        this.notifications.show(
            'Debug Info Exported',
            'Debug information saved to your device',
            'success'
        );
    }

    // Public API methods
    startTimer() {
        if (this.timer) {
            this.timer.start();
        }
    }

    pauseTimer() {
        if (this.timer) {
            this.timer.pause();
        }
    }

    addTask(title, priority = 'medium') {
        if (this.taskManager) {
            return this.taskManager.addTask({ title, priority });
        }
        return null;
    }

    getProductivityScore() {
        const stats = this.storage.getStatistics();
        return stats.productivityScore || 0;
    }

    resetApp() {
        if (confirm('Are you sure you want to reset the entire app? This will delete all data!')) {
            this.storage.clearAll();
            localStorage.clear();
            
            // Reload the page
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
}

// Create and initialize the app
let app = null;

utils.ready(() => {
    app = new RoyalPomodoroApp();
    
    // Make app available globally for debugging
    window.RoyalPomodoro = app;
    
    // Export debug info on Ctrl+Shift+D
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            app.exportDebugInfo();
        }
    });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoyalPomodoroApp;
}
