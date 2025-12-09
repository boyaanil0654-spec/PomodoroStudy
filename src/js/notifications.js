/* ============================================
   NOTIFICATION MANAGER
   ============================================ */

class NotificationManager {
    constructor() {
        this.utils = utils;
        this.storage = storage;
        this.sounds = sounds;
        
        this.permission = 'default';
        this.notificationsEnabled = true;
        this.soundEnabled = true;
        this.volume = 50;
        
        this.notificationContainer = null;
        this.queue = [];
        this.maxNotifications = 5;
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.initContainer();
        this.requestPermission();
        this.setupEventListeners();
        
        console.log('Notification Manager initialized');
    }

    loadSettings() {
        const settings = this.storage.getSettings();
        this.notificationsEnabled = settings?.notifications?.enabled ?? true;
        this.soundEnabled = settings?.notifications?.sounds ?? true;
        this.volume = settings?.notifications?.volume ?? 50;
        
        // Check Do Not Disturb
        const dnd = settings?.notifications?.doNotDisturb;
        if (dnd?.enabled) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const startTime = this.timeToMinutes(dnd.startTime);
            const endTime = this.timeToMinutes(dnd.endTime);
            
            if (startTime < endTime) {
                // Normal range (e.g., 22:00 - 07:00)
                if (currentTime >= startTime && currentTime <= endTime) {
                    this.notificationsEnabled = false;
                }
            } else {
                // Overnight range (e.g., 22:00 - 07:00)
                if (currentTime >= startTime || currentTime <= endTime) {
                    this.notificationsEnabled = false;
                }
            }
        }
    }

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + (minutes || 0);
    }

    initContainer() {
        // Create notification container if it doesn't exist
        this.notificationContainer = document.getElementById('notificationContainer');
        if (!this.notificationContainer) {
            this.notificationContainer = this.utils.createElement('div', 'notification-container', {
                id: 'notificationContainer'
            });
            document.body.appendChild(this.notificationContainer);
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }
        
        if (Notification.permission === 'default' && this.notificationsEnabled) {
            try {
                this.permission = await Notification.requestPermission();
                console.log('Notification permission:', this.permission);
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        } else {
            this.permission = Notification.permission;
        }
    }

    show(title, message, type = 'info', duration = 5000) {
        // Don't show if notifications are disabled
        if (!this.notificationsEnabled) return;
        
        // Add to queue
        const notification = {
            id: this.utils.generateShortId(),
            title,
            message,
            type,
            duration,
            timestamp: Date.now()
        };
        
        this.queue.push(notification);
        
        // Show browser notification
        this.showBrowserNotification(notification);
        
        // Show in-app notification
        this.showInAppNotification(notification);
        
        // Play sound
        this.playSound(type);
        
        // Clean up old notifications
        this.cleanupQueue();
        
        return notification.id;
    }

    showBrowserNotification(notification) {
        if (this.permission !== 'granted') return;
        if (!('Notification' in window)) return;
        
        const options = {
            body: notification.message,
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/icon-72x72.png',
            tag: 'pomodoro-notification',
            requireInteraction: false,
            silent: !this.soundEnabled,
            data: {
                id: notification.id,
                url: window.location.href
            }
        };
        
        try {
            const browserNotification = new Notification(notification.title, options);
            
            browserNotification.onclick = () => {
                window.focus();
                browserNotification.close();
            };
            
            setTimeout(() => browserNotification.close(), notification.duration);
        } catch (error) {
            console.log('Browser notification failed:', error);
        }
    }

    showInAppNotification(notification) {
        const notificationEl = this.createNotificationElement(notification);
        this.notificationContainer.appendChild(notificationEl);
        
        // Animate in
        setTimeout(() => {
            notificationEl.classList.add('show');
        }, 10);
        
        // Auto-remove after duration
        if (notification.duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, notification.duration);
        }
        
        // Update notification toggle icon
        this.updateNotificationToggle();
    }

    createNotificationElement(notification) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            focus: 'fa-brain',
            break: 'fa-coffee'
        };
        
        const icon = icons[notification.type] || icons.info;
        
        return this.utils.createElement('div', ['notification', `notification-${notification.type}`], {
            'data-id': notification.id,
            html: `
                <div class="notification-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                </div>
                <button class="notification-close" title="Dismiss">
                    &times;
                </button>
            `
        });
    }

    removeNotification(id) {
        // Remove from queue
        this.queue = this.queue.filter(n => n.id !== id);
        
        // Remove from DOM
        const notificationEl = document.querySelector(`.notification[data-id="${id}"]`);
        if (notificationEl) {
            notificationEl.classList.remove('show');
            notificationEl.classList.add('hide');
            
            setTimeout(() => {
                if (notificationEl.parentNode) {
                    notificationEl.parentNode.removeChild(notificationEl);
                }
            }, 300);
        }
        
        // Update notification toggle icon
        this.updateNotificationToggle();
    }

    clearAll() {
        // Clear queue
        this.queue = [];
        
        // Remove all notification elements
        const notifications = this.notificationContainer.querySelectorAll('.notification');
        notifications.forEach(notification => {
            notification.classList.remove('show');
            notification.classList.add('hide');
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
        
        // Update notification toggle icon
        this.updateNotificationToggle();
    }

    cleanupQueue() {
        // Remove old notifications from queue
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        this.queue = this.queue.filter(n => now - n.timestamp < maxAge);
        
        // Limit number of notifications
        if (this.queue.length > this.maxNotifications) {
            const toRemove = this.queue.slice(0, this.queue.length - this.maxNotifications);
            toRemove.forEach(n => this.removeNotification(n.id));
        }
    }

    updateNotificationToggle() {
        const toggleBtn = document.getElementById('notificationToggle');
        if (toggleBtn) {
            const hasNotifications = this.queue.length > 0;
            toggleBtn.classList.toggle('has-notifications', hasNotifications);
        }
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        
        const sounds = {
            info: 'notification',
            success: 'complete',
            warning: 'warning',
            error: 'alert',
            focus: 'focusStart',
            break: 'breakStart'
        };
        
        const soundType = sounds[type] || 'notification';
        this.sounds.play(soundType, this.volume / 100);
    }

    showSessionNotification(sessionType) {
        const notifications = {
            focus: {
                title: 'Focus Session Started',
                message: 'Time to concentrate! Stay focused and productive.',
                type: 'focus'
            },
            break: {
                title: 'Break Time!',
                message: 'Take a moment to relax and recharge your energy.',
                type: 'break'
            },
            complete: {
                title: 'Session Complete!',
                message: 'Great work! Ready for the next session?',
                type: 'success'
            },
            longBreak: {
                title: 'Long Break Time!',
                message: 'Excellent progress! Take a longer break to refresh.',
                type: 'break'
            }
        };
        
        const notification = notifications[sessionType] || notifications.focus;
        this.show(notification.title, notification.message, notification.type, 8000);
    }

    showAchievement(title, description) {
        this.show(
            '🏆 Achievement Unlocked!',
            `${title}: ${description}`,
            'success',
            10000
        );
    }

    showWelcome() {
        if (!this.utils.getLocalStorage('welcome_shown')) {
            setTimeout(() => {
                this.show(
                    '👑 Welcome to Royal Pomodoro!',
                    'Start your first focus session or add a task to begin your productivity journey.',
                    'info',
                    10000
                );
                this.utils.setLocalStorage('welcome_shown', true);
            }, 2000);
        }
    }

    setupEventListeners() {
        // Close notification buttons
        this.notificationContainer.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.notification-close');
            if (closeBtn) {
                const notification = closeBtn.closest('.notification');
                const id = notification?.dataset.id;
                if (id) {
                    this.removeNotification(id);
                }
            }
        });
        
        // Notification toggle
        const toggleBtn = document.getElementById('notificationToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleNotifications();
            });
        }
        
        // Settings changes
        window.addEventListener('settingsChanged', () => {
            this.loadSettings();
        });
    }

    toggleNotifications() {
        this.notificationsEnabled = !this.notificationsEnabled;
        
        if (this.notificationsEnabled) {
            this.requestPermission();
            this.show(
                'Notifications Enabled',
                'You will now receive notifications',
                'success'
            );
        } else {
            this.show(
                'Notifications Disabled',
                'You will not receive notifications',
                'info'
            );
        }
        
        // Save setting
        const settings = this.storage.getSettings();
        settings.notifications.enabled = this.notificationsEnabled;
        this.storage.saveSettings(settings);
    }

    getStats() {
        return {
            total: this.queue.length,
            enabled: this.notificationsEnabled,
            soundEnabled: this.soundEnabled,
            permission: this.permission,
            supported: 'Notification' in window
        };
    }
}

// Create global instance
let notifications = null;

// Initialize when DOM is ready
utils.ready(() => {
    notifications = new NotificationManager();
    notifications.showWelcome();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
