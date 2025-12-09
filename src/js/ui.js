/* ============================================
   USER INTERFACE MANAGER
   ============================================ */

class UIManager {
    constructor() {
        this.utils = utils;
        this.storage = storage;
        this.notifications = notifications;
        
        this.currentTheme = 'royal';
        this.isModalOpen = false;
        this.isLoading = true;
        
        this.init();
    }

    init() {
        this.loadTheme();
        this.setupParticles();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.showLoadingScreen();
        
        console.log('UI Manager initialized');
    }

    loadTheme() {
        const settings = this.storage.getSettings();
        this.currentTheme = settings?.appearance?.theme || 'royal';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Update theme picker
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === this.currentTheme) {
                option.classList.add('active');
            }
        });
    }

    setupParticles() {
        const container = document.getElementById('particles');
        if (!container) return;
        
        const particleCount = 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.utils.createElement('div', 'particle');
            
            // Random properties
            const size = this.utils.randomFloat(1, 3);
            const x = this.utils.randomFloat(0, 100);
            const y = this.utils.randomFloat(0, 100);
            const duration = this.utils.randomFloat(20, 40);
            const delay = this.utils.randomFloat(0, 20);
            
            // Apply styles
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${x}%`;
            particle.style.top = `${y}%`;
            particle.style.opacity = this.utils.randomFloat(0.1, 0.3);
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            container.appendChild(particle);
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (!loadingScreen) return;
        
        // Simulate loading progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            const progressBar = loadingScreen.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                
                // Hide loading screen
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    document.body.classList.remove('loading');
                    this.isLoading = false;
                    
                    // Show welcome notification
                    setTimeout(() => {
                        notifications.showWelcome();
                    }, 1000);
                }, 500);
            }
        }, 100);
    }

    setupEventListeners() {
        // Theme toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('#themeToggle')) {
                this.toggleTheme();
            }
        });
        
        // Theme picker
        document.addEventListener('click', (e) => {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                this.setTheme(themeOption.dataset.theme);
            }
        });
        
        // Modal controls
        this.setupModalControls();
        
        // Settings modal
        this.setupSettingsModal();
        
        // Task modal
        this.setupTaskModal();
        
        // Premium modal
        this.setupPremiumModal();
        
        // Shortcuts help
        this.setupShortcutsHelp();
        
        // Footer tips
        this.setupFooterTips();
    }

    setupModalControls() {
        // Close modals on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeAllModals();
            }
        });
        
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Close buttons
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.modal-close, .close-modal');
            if (closeBtn) {
                const modal = closeBtn.closest('.modal-overlay');
                if (modal) {
                    modal.classList.remove('active');
                }
            }
        });
    }

    setupSettingsModal() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        
        if (settingsBtn && settingsModal) {
            // Open settings
            settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
            
            // Tab switching
            const tabBtns = settingsModal.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    this.switchSettingsTab(tab);
                });
            });
            
            // Slider updates
            const sliders = settingsModal.querySelectorAll('input[type="range"]');
            sliders.forEach(slider => {
                slider.addEventListener('input', (e) => {
                    const value = e.target.value;
                    const display = e.target.nextElementSibling;
                    if (display && display.classList.contains('slider-value')) {
                        if (e.target.id.includes('Duration')) {
                            display.textContent = `${value} min`;
                        } else if (e.target.id.includes('Volume')) {
                            display.textContent = `${value}%`;
                        }
                    }
                });
            });
            
            // Save settings
            const saveBtn = document.getElementById('saveSettings');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveSettings();
                });
            }
            
            // Cancel settings
            const cancelBtn = document.getElementById('cancelSettings');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    settingsModal.classList.remove('active');
                });
            }
            
            // Reset buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('#resetTasks')) {
                    if (confirm('Reset all tasks?')) {
                        this.storage.resetData('tasks');
                        window.dispatchEvent(new Event('dataChanged'));
                        this.notifications.show('Tasks Reset', 'All tasks have been reset', 'info');
                    }
                } else if (e.target.closest('#resetSessions')) {
                    if (confirm('Reset all sessions?')) {
                        this.storage.resetData('sessions');
                        window.dispatchEvent(new Event('dataChanged'));
                        this.notifications.show('Sessions Reset', 'All sessions have been reset', 'info');
                    }
                } else if (e.target.closest('#resetAll')) {
                    if (confirm('Reset ALL data? This cannot be undone!')) {
                        this.storage.resetData('all');
                        window.dispatchEvent(new Event('dataChanged'));
                        this.notifications.show('Data Reset', 'All data has been reset', 'info');
                    }
                }
            });
            
            // Backup/Restore
            document.addEventListener('click', (e) => {
                if (e.target.closest('#backupData')) {
                    this.storage.backupData();
                    this.notifications.show('Backup Created', 'Data backup saved to your device', 'success');
                } else if (e.target.closest('#restoreData')) {
                    this.openFilePicker();
                }
            });
        }
    }

    setupTaskModal() {
        // Task modal is handled by TaskManager
    }

    setupPremiumModal() {
        const premiumBtn = document.getElementById('premiumBtn');
        const premiumModal = document.getElementById('premiumModal');
        
        if (premiumBtn && premiumModal) {
            premiumBtn.addEventListener('click', () => {
                premiumModal.classList.add('active');
            });
            
            const closeBtn = premiumModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    premiumModal.classList.remove('active');
                });
            }
            
            const closeModalBtn = document.getElementById('closePremiumModal');
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', () => {
                    premiumModal.classList.remove('active');
                });
            }
        }
    }

    setupShortcutsHelp() {
        // Show shortcuts help
        document.addEventListener('keydown', (e) => {
            if (e.key === '?') {
                e.preventDefault();
                this.toggleShortcutsHelp();
            }
        });
        
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        if (shortcutsHelp) {
            const closeBtn = shortcutsHelp.querySelector('.close-shortcuts');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    shortcutsHelp.classList.remove('show');
                });
            }
        }
    }

    setupFooterTips() {
        const refreshBtn = document.getElementById('refreshTip');
        const tipElement = document.getElementById('productivityTip');
        
        if (refreshBtn && tipElement) {
            const tips = [
                "Take regular breaks to maintain focus and prevent burnout.",
                "Prioritize your tasks - focus on what's most important first.",
                "Use the Pomodoro Technique: 25 minutes work, 5 minutes break.",
                "Stay hydrated! Drinking water improves cognitive function.",
                "Minimize distractions by turning off unnecessary notifications.",
                "Review your tasks at the end of each day and plan for tomorrow.",
                "Celebrate your accomplishments, no matter how small.",
                "Keep your workspace clean and organized for better focus.",
                "Practice deep breathing during breaks to reduce stress.",
                "Set realistic goals and break them into manageable chunks.",
                "Use the Royal Priority system to identify critical tasks.",
                "Track your progress with analytics to stay motivated.",
                "Take a walk during long breaks to refresh your mind.",
                "Practice the 2-minute rule: if it takes less than 2 minutes, do it now.",
                "Batch similar tasks together to improve efficiency.",
                "Use headphones with focus music to block out distractions.",
                "Stand up and stretch every hour to prevent physical strain.",
                "Learn to say no to tasks that don't align with your goals.",
                "Review your analytics weekly to identify productivity patterns.",
                "Remember: consistency is more important than perfection."
            ];
            
            let currentTip = 0;
            
            const showRandomTip = () => {
                const randomIndex = Math.floor(Math.random() * tips.length);
                currentTip = randomIndex;
                tipElement.textContent = tips[randomIndex];
            };
            
            // Initial tip
            showRandomTip();
            
            // Refresh button
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showRandomTip();
                
                // Add animation
                tipElement.style.opacity = '0';
                setTimeout(() => {
                    tipElement.style.opacity = '1';
                }, 300);
            });
            
            // Rotate tips every 30 seconds
            setInterval(showRandomTip, 30000);
        }
    }

    setupKeyboardShortcuts() {
        // Already handled in Timer.js, TaskManager.js
        // Add additional UI shortcuts here
        
        document.addEventListener('keydown', (e) => {
            // Settings: Ctrl/Cmd + ,
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                this.openSettingsModal();
            }
            
            // New task: Ctrl/Cmd + T
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                if (taskManager) {
                    taskManager.openTaskModal();
                }
            }
        });
    }

    toggleTheme() {
        const themes = ['royal', 'dark', 'purple', 'gold'];
        let currentIndex = themes.indexOf(this.currentTheme);
        currentIndex = (currentIndex + 1) % themes.length;
        
        this.setTheme(themes[currentIndex]);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // Save setting
        const settings = this.storage.getSettings();
        settings.appearance.theme = theme;
        this.storage.saveSettings(settings);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        
        this.notifications.show(
            'Theme Changed',
            `Switched to ${theme} theme`,
            'info'
        );
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        // Load current settings
        const settings = this.storage.getSettings();
        
        // Timer settings
        document.getElementById('focusDuration').value = settings.timer.focusDuration;
        document.getElementById('focusValue').textContent = `${settings.timer.focusDuration} min`;
        
        document.getElementById('breakDuration').value = settings.timer.breakDuration;
        document.getElementById('breakValue').textContent = `${settings.timer.breakDuration} min`;
        
        document.getElementById('longBreakDuration').value = settings.timer.longBreakDuration;
        document.getElementById('longBreakValue').textContent = `${settings.timer.longBreakDuration} min`;
        
        document.getElementById('sessionsPerSet').value = settings.timer.sessionsPerSet;
        
        document.getElementById('autoStartBreaks').checked = settings.timer.autoStartBreaks;
        document.getElementById('autoStartFocus').checked = settings.timer.autoStartFocus;
        
        // Notification settings
        document.getElementById('enableNotifications').checked = settings.notifications.enabled;
        document.getElementById('enableSounds').checked = settings.notifications.sounds;
        document.getElementById('notificationVolume').value = settings.notifications.volume;
        document.getElementById('volumeValue').textContent = `${settings.notifications.volume}%`;
        
        const dnd = settings.notifications.doNotDisturb;
        document.getElementById('dndStart').value = dnd.startTime;
        document.getElementById('dndEnd').value = dnd.endTime;
        
        // Appearance settings
        document.getElementById('reduceMotion').checked = settings.appearance.reduceMotion;
        document.getElementById('showSeconds').checked = settings.appearance.showSeconds;
        document.getElementById('compactView').checked = settings.appearance.compactView;
        
        // Data settings
        document.getElementById('autoSaveInterval').value = settings.data.autoSaveInterval;
        
        // Open modal
        modal.classList.add('active');
        this.isModalOpen = true;
        
        // Switch to first tab
        this.switchSettingsTab('timer');
    }

    switchSettingsTab(tab) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.settings-tab');
        
        // Update buttons
        tabBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // Update contents
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tab}Tab`) {
                content.classList.add('active');
            }
        });
    }

    saveSettings() {
        const settings = this.storage.getSettings();
        
        // Timer settings
        settings.timer.focusDuration = parseInt(document.getElementById('focusDuration').value);
        settings.timer.breakDuration = parseInt(document.getElementById('breakDuration').value);
        settings.timer.longBreakDuration = parseInt(document.getElementById('longBreakDuration').value);
        settings.timer.sessionsPerSet = parseInt(document.getElementById('sessionsPerSet').value);
        settings.timer.autoStartBreaks = document.getElementById('autoStartBreaks').checked;
        settings.timer.autoStartFocus = document.getElementById('autoStartFocus').checked;
        
        // Notification settings
        settings.notifications.enabled = document.getElementById('enableNotifications').checked;
        settings.notifications.sounds = document.getElementById('enableSounds').checked;
        settings.notifications.volume = parseInt(document.getElementById('notificationVolume').value);
        
        settings.notifications.doNotDisturb = {
            enabled: true, // Always enabled when times are set
            startTime: document.getElementById('dndStart').value,
            endTime: document.getElementById('dndEnd').value
        };
        
        // Appearance settings
        settings.appearance.reduceMotion = document.getElementById('reduceMotion').checked;
        settings.appearance.showSeconds = document.getElementById('showSeconds').checked;
        settings.appearance.compactView = document.getElementById('compactView').checked;
        
        // Data settings
        settings.data.autoSaveInterval = parseInt(document.getElementById('autoSaveInterval').value);
        
        // Save settings
        this.storage.saveSettings(settings);
        
        // Close modal
        document.getElementById('settingsModal').classList.remove('active');
        this.isModalOpen = false;
        
        // Dispatch event for other components
        window.dispatchEvent(new Event('settingsChanged'));
        
        this.notifications.show(
            'Settings Saved',
            'Your preferences have been updated',
            'success'
        );
    }

    openFilePicker() {
        const fileInput = document.getElementById('importFile');
        if (fileInput) {
            fileInput.click();
            
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importData(file);
                }
                
                // Reset input
                fileInput.value = '';
            };
        }
    }

    async importData(file) {
        try {
            const content = await this.utils.readFile(file);
            const success = this.storage.importData(content);
            
            if (success) {
                // Refresh all components
                window.dispatchEvent(new Event('dataChanged'));
                
                this.notifications.show(
                    'Data Imported',
                    'Your data has been successfully imported',
                    'success'
                );
            } else {
                this.notifications.show(
                    'Import Failed',
                    'Could not import the data file',
                    'error'
                );
            }
        } catch (error) {
            console.error('Error importing data:', error);
            this.notifications.show(
                'Import Error',
                'An error occurred while importing data',
                'error'
            );
        }
    }

    toggleShortcutsHelp() {
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        if (shortcutsHelp) {
            shortcutsHelp.classList.toggle('show');
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
        this.isModalOpen = false;
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = this.utils.createElement('div', ['toast', `toast-${type}`], {
            text: message
        });
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto-remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    updateSystemStatus() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-indicator span');
        
        if (statusDot && statusText) {
            const online = navigator.onLine;
            const storageAvailable = this.checkStorage();
            
            if (online && storageAvailable) {
                statusDot.className = 'status-dot online';
                statusText.textContent = 'All Systems Operational';
            } else if (!online) {
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Offline Mode';
            } else {
                statusDot.className = 'status-dot warning';
                statusText.textContent = 'Limited Functionality';
            }
        }
    }

    checkStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (error) {
            return false;
        }
    }

    getUIStats() {
        return {
            theme: this.currentTheme,
            modalOpen: this.isModalOpen,
            loading: this.isLoading,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
        };
    }
}

// Create global instance
let ui = null;

// Initialize when DOM is ready
utils.ready(() => {
    ui = new UIManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
