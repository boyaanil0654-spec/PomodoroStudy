/* ============================================
   ANALYTICS DASHBOARD
   ============================================ */

class AnalyticsDashboard {
    constructor() {
        this.utils = utils;
        this.storage = storage;
        this.taskManager = taskManager;
        
        this.charts = {
            focus: null,
            distribution: null
        };
        
        this.currentPeriod = 'week';
        this.chartType = 'bar';
        
        this.init();
    }

    init() {
        this.renderCharts();
        this.updateStats();
        this.setupEventListeners();
        this.setupAutoUpdate();
    }

    getFocusData(period = 'week') {
        const sessions = this.storage.getSessions();
        const workSessions = sessions.filter(s => s.type === 'work' && s.duration > 0);
        
        let labels = [];
        let data = [];
        
        switch (period) {
            case 'today':
                const today = this.utils.formatDate().date;
                const todaySessions = workSessions.filter(s => s.startTime.startsWith(today));
                const totalMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
                
                // Create hourly breakdown
                labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
                data = Array(24).fill(0);
                
                todaySessions.forEach(session => {
                    const hour = new Date(session.startTime).getHours();
                    data[hour] += session.duration;
                });
                
                // Convert to hours
                data = data.map(minutes => Math.round(minutes / 6) / 10); // Keep one decimal
                break;
                
            case 'week':
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const todayDate = new Date();
                
                labels = [];
                data = Array(7).fill(0);
                
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(todayDate);
                    date.setDate(date.getDate() - i);
                    
                    const dateStr = this.utils.formatDate(date).date;
                    const daySessions = workSessions.filter(s => s.startTime.startsWith(dateStr));
                    
                    const totalMinutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
                    data[6 - i] = Math.round(totalMinutes / 6) / 10; // Keep one decimal
                    labels.push(days[date.getDay()]);
                }
                break;
                
            case 'month':
                const now = new Date();
                const daysInMonth = this.utils.getDaysInMonth(now.getFullYear(), now.getMonth());
                
                labels = [];
                data = Array(daysInMonth).fill(0);
                
                for (let i = 1; i <= daysInMonth; i++) {
                    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                    const daySessions = workSessions.filter(s => s.startTime.startsWith(dateStr));
                    
                    const totalMinutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
                    data[i - 1] = Math.round(totalMinutes / 6) / 10;
                    
                    if (i % 5 === 0 || i === 1 || i === daysInMonth) {
                        labels.push(`Day ${i}`);
                    } else {
                        labels.push('');
                    }
                }
                break;
        }
        
        return { labels, data };
    }

    getTaskDistributionData() {
        const tasks = this.storage.getTasks();
        const stats = this.taskManager ? this.taskManager.getStats() : { byPriority: {} };
        
        // Priority distribution
        const priorityData = {
            labels: ['Low', 'Medium', 'High', 'Royal'],
            datasets: [{
                data: [
                    stats.byPriority.low?.length || 0,
                    stats.byPriority.medium?.length || 0,
                    stats.byPriority.high?.length || 0,
                    stats.byPriority.royal?.length || 0
                ],
                backgroundColor: [
                    'rgba(108, 117, 125, 0.7)',    // Low - gray
                    'rgba(255, 215, 0, 0.7)',      // Medium - gold
                    'rgba(255, 65, 108, 0.7)',     // High - red
                    'rgba(114, 9, 183, 0.7)'       // Royal - purple
                ],
                borderColor: [
                    '#6c757d',
                    '#ffd700',
                    '#ff416c',
                    '#7209b7'
                ],
                borderWidth: 2
            }]
        };
        
        // Completion status
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.isCompleted).length;
        const activeTasks = totalTasks - completedTasks;
        
        const completionData = {
            labels: ['Completed', 'Active'],
            datasets: [{
                data: [completedTasks, activeTasks],
                backgroundColor: [
                    'rgba(0, 180, 216, 0.7)',      // Completed - blue
                    'rgba(255, 215, 0, 0.7)'       // Active - gold
                ],
                borderColor: ['#00b4d8', '#ffd700'],
                borderWidth: 2
            }]
        };
        
        return { priorityData, completionData };
    }

    renderCharts() {
        this.renderFocusChart();
        this.renderDistributionChart();
    }

    renderFocusChart() {
        const ctx = document.getElementById('focusChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.focus) {
            this.charts.focus.destroy();
        }
        
        const { labels, data } = this.getFocusData(this.currentPeriod);
        
        this.charts.focus = new Chart(ctx, {
            type: this.chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Focus Hours',
                    data: data,
                    backgroundColor: this.createGradient(ctx),
                    borderColor: '#ffd700',
                    borderWidth: 2,
                    borderRadius: 5,
                    hoverBackgroundColor: '#ffed4e',
                    fill: this.chartType === 'line'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 17, 40, 0.9)',
                        titleColor: '#ffd700',
                        bodyColor: '#f8f9fa',
                        borderColor: '#ffd700',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                return `${value.toFixed(1)} hours`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#adb5bd',
                            callback: (value) => `${value}h`
                        },
                        title: {
                            display: true,
                            text: 'Hours',
                            color: '#ffd700',
                            font: {
                                family: 'Orbitron',
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#adb5bd'
                        },
                        title: {
                            display: true,
                            text: this.getPeriodLabel(),
                            color: '#ffd700',
                            font: {
                                family: 'Orbitron',
                                size: 12
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    renderDistributionChart() {
        const ctx = document.getElementById('taskDistributionChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.distribution) {
            this.charts.distribution.destroy();
        }
        
        const { priorityData, completionData } = this.getTaskDistributionData();
        
        this.charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: priorityData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#f8f9fa',
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 17, 40, 0.9)',
                        titleColor: '#ffd700',
                        bodyColor: '#f8f9fa',
                        borderColor: '#ffd700',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} tasks (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    createGradient(ctx) {
        if (this.chartType === 'line') {
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 237, 78, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0.1)');
            return gradient;
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            gradient.addColorStop(0.7, 'rgba(255, 237, 78, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0.4)');
            return gradient;
        }
    }

    getPeriodLabel() {
        switch (this.currentPeriod) {
            case 'today': return 'Hours of Day';
            case 'week': return 'Days of Week';
            case 'month': return 'Days of Month';
            default: return 'Days';
        }
    }

    updateStats() {
        const stats = this.storage.getStatistics();
        const taskStats = this.taskManager ? this.taskManager.getStats() : { 
            completionRate: 0, 
            completed: 0 
        };
        
        // Update stat cards
        this.updateStatCard('totalFocusTime', this.formatFocusTime(stats.totalFocusMinutes));
        this.updateStatCard('currentStreak', stats.currentStreak);
        this.updateStatCard('completedTasksCount', taskStats.completed || 0);
        this.updateStatCard('productivityScore', `${stats.productivityScore || 0}%`);
        
        // Update navigation stats
        this.updateNavStats(stats);
        
        // Update progress bars
        this.updateProgressBars(taskStats.completionRate);
        
        // Update trends
        this.updateTrends();
    }

    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateNavStats(stats) {
        const navStreak = document.getElementById('nav-streak');
        const navTotal = document.getElementById('nav-total');
        
        if (navStreak) navStreak.textContent = stats.currentStreak;
        if (navTotal) navTotal.textContent = this.formatFocusTime(stats.totalFocusMinutes, true);
    }

    updateProgressBars(completionRate) {
        const progressFill = document.querySelector('.stat-progress .progress-fill');
        if (progressFill) {
            progressFill.style.width = `${completionRate}%`;
        }
        
        const progressText = document.querySelector('.stat-progress span');
        if (progressText) {
            progressText.textContent = `${Math.round(completionRate)}%`;
        }
    }

    updateTrends() {
        const today = this.utils.formatDate().date;
        const yesterday = this.utils.formatDate(new Date(Date.now() - 86400000)).date;
        
        const stats = this.storage.getStatistics();
        const todayMinutes = stats.dailyTotals[today] || 0;
        const yesterdayMinutes = stats.dailyTotals[yesterday] || 0;
        
        let trendText = '+0% today';
        let trendIcon = 'fa-minus';
        
        if (yesterdayMinutes > 0) {
            const change = ((todayMinutes - yesterdayMinutes) / yesterdayMinutes) * 100;
            if (change > 0) {
                trendText = `+${Math.round(change)}% today`;
                trendIcon = 'fa-arrow-up';
            } else if (change < 0) {
                trendText = `${Math.round(change)}% today`;
                trendIcon = 'fa-arrow-down';
            }
        }
        
        const trendElement = document.querySelector('.stat-trend');
        if (trendElement) {
            trendElement.innerHTML = `<i class="fas ${trendIcon}"></i><span>${trendText}</span>`;
        }
    }

    formatFocusTime(minutes, compact = false) {
        if (compact) {
            const hours = Math.floor(minutes / 60);
            return `${hours}h`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins.toString().padStart(2, '0')}m`;
        }
    }

    exportData() {
        const data = this.storage.exportData();
        const filename = `royal-pomodoro-analytics-${new Date().toISOString().split('T')[0]}.json`;
        this.utils.downloadFile(data, filename, 'application/json');
        
        this.notifications.show(
            'Data Exported',
            `Analytics data saved to ${filename}`,
            'success'
        );
    }

    setupAutoUpdate() {
        // Update stats every minute
        setInterval(() => {
            this.updateStats();
        }, 60000);
        
        // Update charts every 5 minutes
        setInterval(() => {
            this.renderCharts();
        }, 300000);
    }

    setupEventListeners() {
        // Period selector
        document.addEventListener('click', (e) => {
            const periodBtn = e.target.closest('.period-btn');
            if (periodBtn) {
                this.currentPeriod = periodBtn.dataset.period;
                
                // Update active button
                document.querySelectorAll('.period-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                periodBtn.classList.add('active');
                
                // Re-render chart
                this.renderFocusChart();
            }
        });
        
        // Chart type selector
        const chartTypeSelect = document.getElementById('chartType');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', (e) => {
                this.chartType = e.target.value;
                this.renderFocusChart();
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('exportData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
        
        // Data changes
        window.addEventListener('dataChanged', () => {
            this.updateStats();
            this.renderCharts();
        });
        
        // Settings changes
        window.addEventListener('settingsChanged', () => {
            this.renderCharts();
        });
    }

    refresh() {
        this.updateStats();
        this.renderCharts();
    }
}

// Create global instance
let analytics = null;

// Initialize when DOM is ready
utils.ready(() => {
    analytics = new AnalyticsDashboard();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsDashboard;
}
