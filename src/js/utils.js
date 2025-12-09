/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

class Utils {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleFlags = new Map();
    }

    // DOM manipulation
    createElement(tag, className, attributes = {}) {
        const element = document.createElement(tag);
        if (className) {
            if (Array.isArray(className)) {
                element.classList.add(...className);
            } else {
                element.classList.add(className);
            }
        }
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'text') {
                element.textContent = value;
            } else if (key === 'html') {
                element.innerHTML = value;
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        return element;
    }

    getElement(selector) {
        return document.querySelector(selector);
    }

    getElements(selector) {
        return document.querySelectorAll(selector);
    }

    // Time formatting
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return {
            minutes: mins.toString().padStart(2, '0'),
            seconds: secs.toString().padStart(2, '0'),
            totalMinutes: mins,
            totalSeconds: seconds
        };
    }

    formatDuration(minutes) {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins.toString().padStart(2, '0')}m`;
        }
        return `${minutes}m`;
    }

    formatDate(date = new Date()) {
        return {
            iso: date.toISOString(),
            date: date.toISOString().split('T')[0],
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            day: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            weekday: date.toLocaleDateString([], { weekday: 'short' }),
            full: date.toLocaleDateString()
        };
    }

    // Debounce function
    debounce(func, delay = 300) {
        return (...args) => {
            clearTimeout(this.debounceTimers.get(func));
            const timer = setTimeout(() => func(...args), delay);
            this.debounceTimers.set(func, timer);
        };
    }

    // Throttle function
    throttle(func, limit = 300) {
        return (...args) => {
            if (!this.throttleFlags.get(func)) {
                func(...args);
                this.throttleFlags.set(func, true);
                setTimeout(() => this.throttleFlags.set(func, false), limit);
            }
        };
    }

    // Storage helpers
    getLocalStorage(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Error reading localStorage:', error);
            return defaultValue;
        }
    }

    setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    }

    removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // UUID generation
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    generateShortId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Validation
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    isValidTime(time) {
        const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return re.test(time);
    }

    isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    // Math utilities
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Color utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    lightenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const r = Math.min(255, rgb.r + (255 - rgb.r) * (percent / 100));
        const g = Math.min(255, rgb.g + (255 - rgb.g) * (percent / 100));
        const b = Math.min(255, rgb.b + (255 - rgb.b) * (percent / 100));
        
        return this.rgbToHex(Math.floor(r), Math.floor(g), Math.floor(b));
    }

    darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const r = Math.max(0, rgb.r * (1 - percent / 100));
        const g = Math.max(0, rgb.g * (1 - percent / 100));
        const b = Math.max(0, rgb.b * (1 - percent / 100));
        
        return this.rgbToHex(Math.floor(r), Math.floor(g), Math.floor(b));
    }

    // Date utilities
    getWeekNumber(date = new Date()) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    isYesterday(date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return date.getDate() === yesterday.getDate() &&
               date.getMonth() === yesterday.getMonth() &&
               date.getFullYear() === yesterday.getFullYear();
    }

    // String utilities
    truncate(text, length = 100, suffix = '...') {
        return text.length > length ? text.substring(0, length) + suffix : text;
    }

    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    camelToKebab(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    kebabToCamel(str) {
        return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    }

    // Array utilities
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    uniqueArray(array) {
        return [...new Set(array)];
    }

    // Object utilities
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        return obj;
    }

    mergeObjects(target, source) {
        const merged = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (this.isObject(merged[key]) && this.isObject(source[key])) {
                    merged[key] = this.mergeObjects(merged[key], source[key]);
                } else {
                    merged[key] = source[key];
                }
            }
        }
        return merged;
    }

    isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    // Browser utilities
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        
        if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
            const match = ua.match(/Chrome\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            const match = ua.match(/Firefox\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
            const match = ua.match(/Version\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        } else if (ua.indexOf('Edge') > -1) {
            browser = 'Edge';
            const match = ua.match(/Edge\/(\d+)/);
            version = match ? match[1] : 'Unknown';
        }
        
        return { browser, version, userAgent: ua };
    }

    // Animation utilities
    animate(element, keyframes, options = {}) {
        if (!element || !element.animate) return null;
        
        const defaultOptions = {
            duration: 300,
            easing: 'ease',
            fill: 'forwards'
        };
        
        return element.animate(keyframes, { ...defaultOptions, ...options });
    }

    fadeIn(element, duration = 300) {
        return this.animate(element, [
            { opacity: 0 },
            { opacity: 1 }
        ], { duration });
    }

    fadeOut(element, duration = 300) {
        return this.animate(element, [
            { opacity: 1 },
            { opacity: 0 }
        ], { duration });
    }

    slideIn(element, duration = 300) {
        return this.animate(element, [
            { transform: 'translateY(20px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 }
        ], { duration });
    }

    slideOut(element, duration = 300) {
        return this.animate(element, [
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(20px)', opacity: 0 }
        ], { duration });
    }

    // Performance utilities
    measurePerformance(label, func) {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    // Error handling
    safeCall(func, ...args) {
        try {
            return func(...args);
        } catch (error) {
            console.error('Error in safeCall:', error);
            return null;
        }
    }

    async safeAsyncCall(asyncFunc, ...args) {
        try {
            return await asyncFunc(...args);
        } catch (error) {
            console.error('Error in safeAsyncCall:', error);
            return null;
        }
    }

    // Cookie utilities
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    setCookie(name, value, days = 365) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value}; ${expires}; path=/`;
    }

    deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }

    // URL utilities
    getQueryParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        
        return params;
    }

    updateQueryParams(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        window.history.pushState({}, '', url);
    }

    // File utilities
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    // Event utilities
    addEventListeners(element, events, handler) {
        events.split(' ').forEach(event => {
            element.addEventListener(event, handler);
        });
    }

    removeEventListeners(element, events, handler) {
        events.split(' ').forEach(event => {
            element.removeEventListener(event, handler);
        });
    }

    // DOM ready
    ready(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    // Copy to clipboard
    copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(() => resolve(true))
                    .catch(() => {
                        // Fallback for older browsers
                        this.copyToClipboardFallback(text, resolve, reject);
                    });
            } else {
                this.copyToClipboardFallback(text, resolve, reject);
            }
        });
    }

    copyToClipboardFallback(text, resolve, reject) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            successful ? resolve(true) : reject(new Error('Copy failed'));
        } catch (error) {
            document.body.removeChild(textArea);
            reject(error);
        }
    }
}

// Create global instance
const utils = new Utils();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
}
