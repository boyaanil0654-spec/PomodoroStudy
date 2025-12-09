/* ============================================
   STORAGE MANAGER
   ============================================ */

class StorageManager {
    constructor() {
        this.utils = utils;
        this.keys = {
            SETTINGS: 'royal_pomodoro_settings',
            TASKS: 'royal_pomodoro_tasks',
            SESSIONS: 'royal_pomodoro_sessions',
            STATISTICS: 'royal_pomodoro_stats',
            ACHIEVEMENTS: 'royal_pomodoro_achievements',
            USER: 'royal_pomodoro_user'
        };

        this.defaultSettings = {
            timer: {
                focusDuration: 25,
                breakDuration: 5,
                longBreakDuration: 15,
                sessionsPerSet: 4,
                autoStartBreaks: true,
                autoStartFocus: false
            },
            notifications: {
                enabled: true,
                sounds: true,
                volume: 50,
                doNotDisturb: {
                    enabled: false,
                    startTime: '22:00',
                    endTime: '07:00'
                }
            },
            appearance: {
                theme: 'royal',
                reduceMotion: false,
                showSeconds: true,
                compactView: false
            },
            data: {
                autoSaveInterval: 60,
                lastBackup: null
            },
            version: '1.0.0'
        };

        this.defaultStatistics = {
            totalFocusMinutes: 0,
            totalSessions: 0,
            totalTasksCompleted: 0,
            currentStreak: 0,
            longestStreak: 0,
            dailyTotals: {},
            weeklyGoal: 20,
            monthlyGoal: 80,
            bestDay: { date: null, minutes: 0 },
            startDate: new Date().toISOString(),
            lastSessionDate: null,
            productivityScore: 0
        };

        this.defaultAchievements = [
            { id: 'first_session', unlocked: false, date: null },
            { id: 'first_task', unlocked: false, date: null },
            { id: '3_day_streak', unlocked: false, date: null },
            { id: '7_day_streak', unlocked: false, date: null },
            { id: '30_day_streak', unlocked: false, date: null },
            { id: '100_sessions', unlocked: false, date: null },
            { id: '500_sessions', unlocked: false, date: null },
            { id: '1000_sessions', unlocked: false, date: null },
            { id: 'royal_focus', unlocked: false, date: null },
            { id: 'productivity_master', unlocked: false, date: null }
        ];

        this.init();
    }

    init() {
        // Initialize default data if not exists
        this.ensureDefaults();
        
        // Set up auto-save
        this.setupAutoSave();
        
        // Set up beforeunload listener
        window.addEventListener('beforeunload', () => this.saveAll());
    }

    ensureDefaults() {
        if (!this.getSettings()) {
            this.saveSettings(this.defaultSettings);
        }
        
        if (!this.getTasks()) {
            this.saveTasks([]);
        }
        
        if (!this.getSessions()) {
            this.saveSessions([]);
        }
        
        if (!this.getStatistics()) {
            this.saveStatistics(this.defaultStatistics);
        }
        
        if (!this.getAchievements()) {
            this.saveAchievements(this.defaultAchievements);
        }
    }

    setupAutoSave() {
        const settings = this.getSettings();
        const interval = settings.data?.autoSaveInterval || 60;
        
        setInterval(() => {
            this.saveAll();
        }, interval * 1000);
    }

    // ===== SETTINGS =====
    getSettings() {
        return this.utils.getLocalStorage(this.keys.SETTINGS);
    }

    saveSettings(settings) {
        const current = this.getSettings();
        const merged = this.utils.mergeObjects(current || this.defaultSettings, settings);
        merged.version = '1.0.0';
        return this.utils.setLocalStorage(this.keys.SETTINGS, merged);
    }

    updateSettings(updates) {
        const current = this.getSettings();
        const updated = this.utils.mergeObjects(current, updates);
        return this.saveSettings(updated);
    }

    resetSettings() {
        return this.saveSettings(this.defaultSettings);
    }

    // ===== TASKS =====
    getTasks() {
        return this.utils.getLocalStorage(this.keys.TASKS, []);
    }

    saveTasks(tasks) {
        return this.utils.setLocalStorage(this.keys.TASKS, tasks);
    }

    addTask(task) {
        const tasks = this.getTasks();
        const newTask = {
            id: this.utils.generateShortId(),
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            category: task.category || 'other',
            estimatedPomodoros: task.estimatedPomodoros || 1,
            completedPomodoros: task.completedPomodoros || 0,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dueDate: task.dueDate || null,
            tags: task.tags || []
        };
        
        tasks.unshift(newTask);
        this.saveTasks(tasks);
        return newTask;
    }

    updateTask(id, updates) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(task => task.id === id);
        
        if (index !== -1) {
            tasks[index] = {
                ...tasks[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveTasks(tasks);
            return tasks[index];
        }
        
        return null;
    }

    deleteTask(id) {
        const tasks = this.getTasks();
        const filtered = tasks.filter(task => task.id !== id);
        this.saveTasks(filtered);
        return filtered.length < tasks.length;
    }

    toggleTaskCompletion(id) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(task => task.id === id);
        
        if (index !== -1) {
            tasks[index].isCompleted = !tasks[index].isCompleted;
            tasks[index].updatedAt = new Date().toISOString();
            
            if (tasks[index].isCompleted) {
                tasks[index].completedPomodoros = tasks[index].estimatedPomodoros;
            } else {
                tasks[index].completedPomodoros = 0;
            }
            
            this.saveTasks(tasks);
            return tasks[index];
        }
        
        return null;
    }

    // ===== SESSIONS =====
    getSessions() {
        return this.utils.getLocalStorage(this.keys.SESSIONS, []);
    }

    saveSessions(sessions) {
        return this.utils.setLocalStorage(this.keys.SESSIONS, sessions);
    }

    startSession(taskId = null) {
        const sessions = this.getSessions();
        const session = {
            id: this.utils.generateShortId(),
            taskId,
            type: 'work',
            startTime: new Date().toISOString(),
            endTime: null,
            duration: 0,
            wasCompleted: true,
            status: 'active'
        };
        
        sessions.push(session);
        this.saveSessions(sessions);
        return session;
    }

    completeSession(sessionId) {
        const sessions = this.getSessions();
        const session = sessions.find(s => s.id === sessionId);
        
        if (session) {
            const endTime = new Date();
            const startTime = new Date(session.startTime);
            const duration = Math.round((endTime - startTime) / 1000 / 60);
            
            session.endTime = endTime.toISOString();
            session.duration = duration;
            session.status = 'completed';
            
            this.saveSessions(sessions);
            this.updateStatistics(duration);
            
            return session;
        }
        
        return null;
    }

    getTodaySessions() {
        const sessions = this.getSessions();
        const today = this.utils.formatDate().date;
        return sessions.filter(session => 
            session.startTime.startsWith(today) && session.type === 'work'
        );
    }

    getWeekSessions() {
        const sessions = this.getSessions();
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        return sessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate >= weekStart && session.type === 'work';
        });
    }

    // ===== STATISTICS =====
    getStatistics() {
        return this.utils.getLocalStorage(this.keys.STATISTICS, this.defaultStatistics);
    }

    saveStatistics(stats) {
        return this.utils.setLocalStorage(this.keys.STATISTICS, stats);
    }

    updateStatistics(sessionMinutes) {
        const stats = this.getStatistics();
        const today = this.utils.formatDate().date;
        
        // Update totals
        stats.totalFocusMinutes += sessionMinutes;
        stats.totalSessions += 1;
        stats.lastSessionDate = new Date().toISOString();
        
        // Update daily total
        stats.dailyTotals[today] = (stats.dailyTotals[today] || 0) + sessionMinutes;
        
        // Update best day
        if (stats.dailyTotals[today] > (stats.bestDay.minutes || 0)) {
            stats.bestDay = { date: today, minutes: stats.dailyTotals[today] };
        }
        
        // Update streak
        this.updateStreak(stats);
        
        // Update productivity score
        this.updateProductivityScore(stats);
        
        this.saveStatistics(stats);
        return stats;
    }

    updateStreak(stats) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const todayStr = this.utils.formatDate(today).date;
        const yesterdayStr = this.utils.formatDate(yesterday).date;
        
        const studiedToday = (stats.dailyTotals[todayStr] || 0) > 0;
        const studiedYesterday = (stats.dailyTotals[yesterdayStr] || 0) > 0;
        
        if (studiedToday) {
            if (studiedYesterday) {
                // Continue streak
                stats.currentStreak += 1;
            } else if (stats.currentStreak === 0) {
                // Start new streak
                stats.currentStreak = 1;
            }
        } else {
            // Break streak
            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
            }
            stats.currentStreak = 0;
        }
    }

    updateProductivityScore(stats) {
        const tasks = this.getTasks();
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.isCompleted).length;
        
        const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const streakBonus = Math.min(stats.currentStreak * 5, 50); // Max 50% bonus
        const sessionConsistency = Math.min((stats.totalSessions / 100) * 50, 50); // Max 50%
        
        stats.productivityScore = Math.round(
            taskCompletionRate * 0.4 + // 40% weight
            streakBonus * 0.3 + // 30% weight
            sessionConsistency * 0.3 // 30% weight
        );
    }

    // ===== ACHIEVEMENTS =====
    getAchievements() {
        return this.utils.getLocalStorage(this.keys.ACHIEVEMENTS, this.defaultAchievements);
    }

    saveAchievements(achievements) {
        return this.utils.setLocalStorage(this.keys.ACHIEVEMENTS, achievements);
    }

    unlockAchievement(achievementId) {
        const achievements = this.getAchievements();
        const achievement = achievements.find(a => a.id === achievementId);
        
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            achievement.date = new Date().toISOString();
            this.saveAchievements(achievements);
            return achievement;
        }
        
        return null;
    }

    checkAchievements() {
        const stats = this.getStatistics();
        const tasks = this.getTasks();
        const achievements = this.getAchievements();
        const unlocked = [];
        
        // First session
        if (stats.totalSessions >= 1) {
            const achievement = this.unlockAchievement('first_session');
            if (achievement) unlocked.push(achievement);
        }
        
        // First task
        if (tasks.length >= 1) {
            const achievement = this.unlockAchievement('first_task');
            if (achievement) unlocked.push(achievement);
        }
        
        // Streak achievements
        if (stats.currentStreak >= 3) {
            const achievement = this.unlockAchievement('3_day_streak');
            if (achievement) unlocked.push(achievement);
        }
        
        if (stats.currentStreak >= 7) {
            const achievement = this.unlockAchievement('7_day_streak');
            if (achievement) unlocked.push(achievement);
        }
        
        if (stats.currentStreak >= 30) {
            const achievement = this.unlockAchievement('30_day_streak');
            if (achievement) unlocked.push(achievement);
        }
        
        // Session count achievements
        if (stats.totalSessions >= 100) {
            const achievement = this.unlockAchievement('100_sessions');
            if (achievement) unlocked.push(achievement);
        }
        
        if (stats.totalSessions >= 500) {
            const achievement = this.unlockAchievement('500_sessions');
            if (achievement) unlocked.push(achievement);
        }
        
        if (stats.totalSessions >= 1000) {
            const achievement = this.unlockAchievement('1000_sessions');
            if (achievement) unlocked.push(achievement);
        }
        
        return unlocked;
    }

    // ===== DATA MANAGEMENT =====
    exportData() {
        const data = {
            settings: this.getSettings(),
            tasks: this.getTasks(),
            sessions: this.getSessions(),
            statistics: this.getStatistics(),
            achievements: this.getAchievements(),
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        return JSON.stringify(data, null, 2);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.settings) this.saveSettings(data.settings);
            if (data.tasks) this.saveTasks(data.tasks);
            if (data.sessions) this.saveSessions(data.sessions);
            if (data.statistics) this.saveStatistics(data.statistics);
            if (data.achievements) this.saveAchievements(data.achievements);
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    backupData() {
        const data = this.exportData();
        const filename = `royal-pomodoro-backup-${new Date().toISOString().split('T')[0]}.json`;
        this.utils.downloadFile(data, filename, 'application/json');
        
        // Update last backup date
        const settings = this.getSettings();
        settings.data.lastBackup = new Date().toISOString();
        this.saveSettings(settings);
        
        return filename;
    }

    resetData(type = 'all') {
        switch (type) {
            case 'tasks':
                this.saveTasks([]);
                break;
            case 'sessions':
                this.saveSessions([]);
                break;
            case 'statistics':
                this.saveStatistics(this.defaultStatistics);
                break;
            case 'achievements':
                this.saveAchievements(this.defaultAchievements);
                break;
            case 'settings':
                this.resetSettings();
                break;
            case 'all':
                this.saveTasks([]);
                this.saveSessions([]);
                this.saveStatistics(this.defaultStatistics);
                this.saveAchievements(this.defaultAchievements);
                this.resetSettings();
                break;
        }
    }

    // ===== UTILITIES =====
    saveAll() {
        // This is called by auto-save
        const tasks = this.getTasks();
        const sessions = this.getSessions();
        const statistics = this.getStatistics();
        
        // Check for any changes that need to be saved
        this.saveTasks(tasks);
        this.saveSessions(sessions);
        this.saveStatistics(statistics);
    }

    getDataSize() {
        let total = 0;
        
        Object.values(this.keys).forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                total += new Blob([data]).size;
            }
        });
        
        return {
            bytes: total,
            kilobytes: (total / 1024).toFixed(2),
            megabytes: (total / 1024 / 1024).toFixed(2)
        };
    }

    clearAll() {
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        this.ensureDefaults();
    }

    // ===== MEMORY MANAGEMENT =====
    optimizeStorage() {
        const sessions = this.getSessions();
        const tasks = this.getTasks();
        
        // Keep only last 1000 sessions
        if (sessions.length > 1000) {
            const sorted = sessions.sort((a, b) => 
                new Date(b.startTime) - new Date(a.startTime)
            );
            this.saveSessions(sorted.slice(0, 1000));
        }
        
        // Remove completed tasks older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const filteredTasks = tasks.filter(task => {
            if (!task.isCompleted) return true;
            const updatedDate = new Date(task.updatedAt);
            return updatedDate > thirtyDaysAgo;
        });
        
        if (filteredTasks.length < tasks.length) {
            this.saveTasks(filteredTasks);
        }
    }
}

// Create global instance
const storage = new StorageManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storage;
}
