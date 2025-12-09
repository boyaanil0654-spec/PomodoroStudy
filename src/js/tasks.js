/* ============================================
   TASK MANAGER
   ============================================ */

class TaskManager {
    constructor() {
        this.utils = utils;
        this.storage = storage;
        this.timer = timer;
        this.notifications = notifications;
        
        this.tasks = [];
        this.filter = 'all';
        this.sortBy = 'created';
        this.sortDirection = 'desc';
        this.currentEditId = null;
        
        this.init();
    }

    init() {
        this.loadTasks();
        this.renderTasks();
        this.setupEventListeners();
        this.updateStats();
    }

    loadTasks() {
        this.tasks = this.storage.getTasks();
    }

    saveTasks() {
        this.storage.saveTasks(this.tasks);
    }

    addTask(taskData) {
        const task = this.storage.addTask(taskData);
        this.tasks.unshift(task);
        
        // Update UI
        this.renderTasks();
        this.updateStats();
        
        // Show notification
        this.notifications.show(
            'Task Added',
            `"${task.title}" has been added to your tasks`,
            'success'
        );
        
        // Check for first task achievement
        if (this.tasks.length === 1) {
            this.storage.unlockAchievement('first_task');
        }
        
        return task;
    }

    updateTask(id, updates) {
        const updatedTask = this.storage.updateTask(id, updates);
        if (updatedTask) {
            this.loadTasks();
            this.renderTasks();
            this.updateStats();
        }
        return updatedTask;
    }

    deleteTask(id) {
        const deleted = this.storage.deleteTask(id);
        if (deleted) {
            this.loadTasks();
            this.renderTasks();
            this.updateStats();
            
            this.notifications.show(
                'Task Deleted',
                'Task has been removed from your list',
                'info'
            );
        }
        return deleted;
    }

    toggleTaskCompletion(id) {
        const task = this.storage.toggleTaskCompletion(id);
        if (task) {
            this.loadTasks();
            this.renderTasks();
            this.updateStats();
            
            const action = task.isCompleted ? 'completed' : 'uncompleted';
            this.notifications.show(
                `Task ${action}`,
                `"${task.title}" has been marked as ${action}`,
                task.isCompleted ? 'success' : 'info'
            );
        }
        return task;
    }

    setActiveTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && !task.isCompleted) {
            this.timer.setCurrentTask(task);
            
            this.notifications.show(
                'Task Activated',
                `Now working on: ${task.title}`,
                'focus'
            );
            
            return true;
        }
        return false;
    }

    updateTaskProgress(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && !task.isCompleted) {
            const newProgress = Math.min(
                task.completedPomodoros + 1,
                task.estimatedPomodoros
            );
            
            this.updateTask(id, { completedPomodoros: newProgress });
            
            if (newProgress >= task.estimatedPomodoros) {
                this.toggleTaskCompletion(id);
            }
            
            return true;
        }
        return false;
    }

    filterTasks(filter = 'all') {
        this.filter = filter;
        this.renderTasks();
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
    }

    sortTasks(by = 'created', direction = 'desc') {
        this.sortBy = by;
        this.sortDirection = direction;
        this.renderTasks();
    }

    getPriorityClass(priority) {
        const classes = {
            low: 'low',
            medium: 'medium',
            high: 'high',
            royal: 'royal'
        };
        return classes[priority] || 'medium';
    }

    getPriorityIcon(priority) {
        const icons = {
            low: 'fa-leaf',
            medium: 'fa-star',
            high: 'fa-fire',
            royal: 'fa-crown'
        };
        return icons[priority] || 'fa-star';
    }

    getCategoryIcon(category) {
        const icons = {
            study: 'fa-graduation-cap',
            work: 'fa-briefcase',
            project: 'fa-rocket',
            personal: 'fa-user',
            other: 'fa-tasks'
        };
        return icons[category] || 'fa-tasks';
    }

    calculateProgress(task) {
        return Math.round((task.completedPomodoros / task.estimatedPomodoros) * 100);
    }

    renderTasks() {
        const container = document.getElementById('tasksList');
        if (!container) return;
        
        // Filter tasks
        let filteredTasks = [...this.tasks];
        
        switch (this.filter) {
            case 'active':
                filteredTasks = filteredTasks.filter(t => !t.isCompleted);
                break;
            case 'completed':
                filteredTasks = filteredTasks.filter(t => t.isCompleted);
                break;
        }
        
        // Sort tasks
        filteredTasks.sort((a, b) => {
            let comparison = 0;
            
            switch (this.sortBy) {
                case 'priority':
                    const priorityOrder = { royal: 4, high: 3, medium: 2, low: 1 };
                    comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                    break;
                    
                case 'due':
                    if (!a.dueDate && !b.dueDate) comparison = 0;
                    else if (!a.dueDate) comparison = 1;
                    else if (!b.dueDate) comparison = -1;
                    else comparison = new Date(a.dueDate) - new Date(b.dueDate);
                    break;
                    
                case 'progress':
                    comparison = this.calculateProgress(a) - this.calculateProgress(b);
                    break;
                    
                case 'created':
                default:
                    comparison = new Date(b.createdAt) - new Date(a.createdAt);
                    break;
            }
            
            return this.sortDirection === 'desc' ? -comparison : comparison;
        });
        
        // Clear container
        container.innerHTML = '';
        
        // Show empty state if no tasks
        if (filteredTasks.length === 0) {
            let message = 'No tasks found';
            let icon = 'fa-tasks';
            
            switch (this.filter) {
                case 'active':
                    message = 'No active tasks';
                    icon = 'fa-check-circle';
                    break;
                case 'completed':
                    message = 'No completed tasks';
                    icon = 'fa-trophy';
                    break;
            }
            
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas ${icon}"></i>
                    <h3>${message}</h3>
                    <p>${this.filter === 'all' ? 'Add your first task to get started!' : 'Try changing your filter'}</p>
                    ${this.filter !== 'all' ? 
                        `<button class="empty-action-btn" onclick="taskManager.filterTasks('all')">
                            Show All Tasks
                        </button>` : 
                        `<button class="empty-action-btn" id="addFirstTask">
                            <i class="fas fa-plus-circle"></i>
                            Create First Task
                        </button>`
                    }
                </div>
            `;
            return;
        }
        
        // Render tasks
        filteredTasks.forEach(task => {
            const taskEl = this.createTaskElement(task);
            container.appendChild(taskEl);
        });
    }

    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item ${task.isCompleted ? 'completed' : ''}`;
        div.dataset.id = task.id;
        
        const priorityClass = this.getPriorityClass(task.priority);
        const priorityIcon = this.getPriorityIcon(task.priority);
        const categoryIcon = this.getCategoryIcon(task.category);
        const progress = this.calculateProgress(task);
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.isCompleted;
        
        div.innerHTML = `
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-actions">
                    <button class="task-action-btn set-active" title="Set as active task">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="task-action-btn edit-task" title="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn complete-task" title="${task.isCompleted ? 'Undo completion' : 'Mark complete'}">
                        <i class="fas ${task.isCompleted ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                </div>
            </div>
            
            ${task.description ? `
                <div class="task-description">
                    ${task.description}
                </div>
            ` : ''}
            
            <div class="task-details">
                <span class="task-priority ${priorityClass}">
                    <i class="fas ${priorityIcon}"></i>
                    ${task.priority}
                </span>
                
                <span class="task-category">
                    <i class="fas ${categoryIcon}"></i>
                    ${task.category}
                </span>
                
                ${task.dueDate ? `
                    <span class="task-due ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-calendar${isOverdue ? '-times' : '-check'}"></i>
                        ${new Date(task.dueDate).toLocaleDateString()}
                    </span>
                ` : ''}
                
                <div class="task-progress">
                    <div class="progress-indicator">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="task-pomodoros">
                        ${task.completedPomodoros}/${task.estimatedPomodoros}
                    </span>
                </div>
            </div>
        `;
        
        return div;
    }

    openTaskModal(task = null) {
        this.currentEditId = task?.id || null;
        
        const modal = document.getElementById('taskDetailModal');
        const modalOverlay = document.getElementById('taskDetailModal').closest('.modal-overlay');
        
        if (task) {
            // Edit mode
            document.getElementById('editTaskTitle').value = task.title;
            document.getElementById('editTaskDescription').value = task.description || '';
            document.getElementById('editTaskPriority').value = task.priority;
            document.getElementById('editTaskPomodoros').value = task.estimatedPomodoros;
            document.getElementById('editTaskCategory').value = task.category;
            document.getElementById('editTaskDueDate').value = task.dueDate ? 
                task.dueDate.split('T')[0] : '';
            
            // Update progress display
            const progress = this.calculateProgress(task);
            document.getElementById('progressText').textContent = 
                `${task.completedPomodoros}/${task.estimatedPomodoros} pomodoros completed`;
            document.getElementById('progressPercent').textContent = `${progress}%`;
            document.getElementById('progressFill').style.width = `${progress}%`;
            
            // Update modal title
            modal.querySelector('.modal-header h2').innerHTML = 
                '<i class="fas fa-edit"></i> Edit Task';
        } else {
            // Add mode
            document.getElementById('editTaskTitle').value = '';
            document.getElementById('editTaskDescription').value = '';
            document.getElementById('editTaskPriority').value = 'medium';
            document.getElementById('editTaskPomodoros').value = 1;
            document.getElementById('editTaskCategory').value = 'other';
            document.getElementById('editTaskDueDate').value = '';
            
            // Reset progress display
            document.getElementById('progressText').textContent = '0/1 pomodoros completed';
            document.getElementById('progressPercent').textContent = '0%';
            document.getElementById('progressFill').style.width = '0%';
            
            // Update modal title
            modal.querySelector('.modal-header h2').innerHTML = 
                '<i class="fas fa-plus"></i> Add New Task';
        }
        
        modalOverlay.classList.add('active');
        document.getElementById('editTaskTitle').focus();
    }

    closeTaskModal() {
        this.currentEditId = null;
        const modalOverlay = document.getElementById('taskDetailModal').closest('.modal-overlay');
        modalOverlay.classList.remove('active');
    }

    saveTask() {
        const title = document.getElementById('editTaskTitle').value.trim();
        if (!title) {
            this.notifications.show('Error', 'Task title is required', 'error');
            return;
        }
        
        const taskData = {
            title,
            description: document.getElementById('editTaskDescription').value.trim(),
            priority: document.getElementById('editTaskPriority').value,
            estimatedPomodoros: parseInt(document.getElementById('editTaskPomodoros').value) || 1,
            category: document.getElementById('editTaskCategory').value,
            dueDate: document.getElementById('editTaskDueDate').value || null
        };
        
        if (this.currentEditId) {
            // Update existing task
            this.updateTask(this.currentEditId, taskData);
            this.notifications.show('Task Updated', 'Task has been updated', 'success');
        } else {
            // Add new task
            this.addTask(taskData);
        }
        
        this.closeTaskModal();
    }

    deleteCurrentTask() {
        if (this.currentEditId) {
            if (confirm('Are you sure you want to delete this task?')) {
                this.deleteTask(this.currentEditId);
                this.closeTaskModal();
            }
        }
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.isCompleted).length;
        const activeTasks = totalTasks - completedTasks;
        
        // Update UI elements
        const totalTasksEl = document.getElementById('totalTasks');
        const completedTasksEl = document.getElementById('completedTasks');
        const completedTasksCountEl = document.getElementById('completedTasksCount');
        
        if (totalTasksEl) totalTasksEl.textContent = totalTasks;
        if (completedTasksEl) completedTasksEl.textContent = completedTasks;
        if (completedTasksCountEl) completedTasksCountEl.textContent = completedTasks;
        
        // Update completion rate
        const completionRate = totalTasks > 0 ? 
            Math.round((completedTasks / totalTasks) * 100) : 0;
        
        const progressFill = document.querySelector('.stat-progress .progress-fill');
        const progressPercent = document.querySelector('.stat-progress span');
        
        if (progressFill) progressFill.style.width = `${completionRate}%`;
        if (progressPercent) progressPercent.textContent = `${completionRate}%`;
    }

    getStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.isCompleted).length;
        const active = total - completed;
        
        const totalPomodoros = this.tasks.reduce((sum, t) => sum + t.estimatedPomodoros, 0);
        const completedPomodoros = this.tasks.reduce((sum, t) => sum + t.completedPomodoros, 0);
        
        const byPriority = {
            low: this.tasks.filter(t => t.priority === 'low'),
            medium: this.tasks.filter(t => t.priority === 'medium'),
            high: this.tasks.filter(t => t.priority === 'high'),
            royal: this.tasks.filter(t => t.priority === 'royal')
        };
        
        const byCategory = this.tasks.reduce((acc, task) => {
            acc[task.category] = (acc[task.category] || 0) + 1;
            return acc;
        }, {});
        
        return {
            total,
            completed,
            active,
            totalPomodoros,
            completedPomodoros,
            completionRate: total > 0 ? (completed / total) * 100 : 0,
            pomodoroRate: totalPomodoros > 0 ? (completedPomodoros / totalPomodoros) * 100 : 0,
            byPriority,
            byCategory
        };
    }

    setupEventListeners() {
        // Add task button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#addTaskBtn') || e.target.closest('#addFirstTask')) {
                this.openTaskModal();
            }
        });
        
        // Quick add from input
        const taskInput = document.getElementById('taskInput');
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        
        if (taskInput && saveTaskBtn) {
            // Enter key to add
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const priority = document.getElementById('taskPriority')?.value || 'medium';
                    this.addTask({
                        title: taskInput.value.trim(),
                        priority: priority
                    });
                    taskInput.value = '';
                }
            });
            
            // Save button click
            saveTaskBtn.addEventListener('click', () => {
                const priority = document.getElementById('taskPriority')?.value || 'medium';
                this.addTask({
                    title: taskInput.value.trim(),
                    priority: priority
                });
                taskInput.value = '';
            });
        }
        
        // Quick tags
        document.addEventListener('click', (e) => {
            const tagBtn = e.target.closest('.tag-btn');
            if (tagBtn) {
                const tag = tagBtn.dataset.tag;
                if (taskInput) {
                    taskInput.value = `${taskInput.value} ${tag}`.trim();
                    taskInput.focus();
                }
            }
        });
        
        // Task list event delegation
        const tasksList = document.getElementById('tasksList');
        if (tasksList) {
            tasksList.addEventListener('click', (e) => {
                const taskItem = e.target.closest('.task-item');
                if (!taskItem) return;
                
                const taskId = taskItem.dataset.id;
                const target = e.target.closest('button');
                
                if (!target) return;
                
                if (target.classList.contains('set-active')) {
                    this.setActiveTask(taskId);
                } else if (target.classList.contains('edit-task')) {
                    const task = this.tasks.find(t => t.id === taskId);
                    if (task) this.openTaskModal(task);
                } else if (target.classList.contains('complete-task')) {
                    this.toggleTaskCompletion(taskId);
                }
            });
        }
        
        // Filter buttons
        document.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('.filter-btn');
            if (filterBtn) {
                const filter = filterBtn.dataset.filter;
                this.filterTasks(filter);
            }
        });
        
        // Sort button
        const sortBtn = document.getElementById('sortTasks');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                // Cycle through sort options
                const sortOptions = [
                    { by: 'created', direction: 'desc' },
                    { by: 'priority', direction: 'desc' },
                    { by: 'due', direction: 'asc' },
                    { by: 'progress', direction: 'desc' }
                ];
                
                const currentIndex = sortOptions.findIndex(opt => 
                    opt.by === this.sortBy && opt.direction === this.sortDirection
                );
                
                const nextIndex = (currentIndex + 1) % sortOptions.length;
                const nextSort = sortOptions[nextIndex];
                
                this.sortTasks(nextSort.by, nextSort.direction);
                
                // Update sort button icon
                const icons = ['fa-sort-amount-down', 'fa-flag', 'fa-calendar', 'fa-chart-line'];
                sortBtn.innerHTML = `
                    <i class="fas ${icons[nextIndex]}"></i>
                    ${nextSort.by.charAt(0).toUpperCase() + nextSort.by.slice(1)}
                `;
            });
        }
        
        // Task modal buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('#saveTaskBtn')) {
                this.saveTask();
            } else if (e.target.closest('#deleteTaskBtn')) {
                this.deleteCurrentTask();
            } else if (e.target.closest('#cancelTaskEdit')) {
                this.closeTaskModal();
            }
        });
        
        // Close modal on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
            }
        });
    }
}

// Create global instance
let taskManager = null;

// Initialize when DOM is ready
utils.ready(() => {
    taskManager = new TaskManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}
