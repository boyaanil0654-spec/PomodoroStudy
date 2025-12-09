/* ============================================
   SOUND MANAGER
   ============================================ */

class SoundManager {
    constructor() {
        this.utils = utils;
        this.storage = storage;
        
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.5;
        this.muted = false;
        
        this.soundFiles = {
            focusStart: './assets/sounds/focus-start.mp3',
            breakStart: './assets/sounds/break-start.mp3',
            sessionComplete: './assets/sounds/session-complete.mp3',
            longBreakStart: './assets/sounds/long-break-start.mp3',
            notification: './assets/sounds/notification.mp3',
            complete: './assets/sounds/complete.mp3',
            warning: './assets/sounds/warning.mp3',
            alert: './assets/sounds/alert.mp3',
            pause: './assets/sounds/pause.mp3',
            reset: './assets/sounds/reset.mp3'
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.preloadSounds();
        this.setupEventListeners();
    }

    loadSettings() {
        const settings = this.storage.getSettings();
        this.enabled = settings?.notifications?.sounds ?? true;
        this.volume = (settings?.notifications?.volume ?? 50) / 100;
        this.muted = !this.enabled;
    }

    preloadSounds() {
        // Preload essential sounds
        const essentialSounds = ['focusStart', 'breakStart', 'sessionComplete', 'notification'];
        
        essentialSounds.forEach(soundName => {
            this.loadSound(soundName);
        });
    }

    loadSound(name) {
        if (this.sounds.has(name)) return this.sounds.get(name);
        
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = this.volume;
        audio.muted = this.muted;
        
        // Set source
        const soundPath = this.soundFiles[name];
        if (soundPath) {
            audio.src = soundPath;
        } else {
            // Fallback to built-in sounds
            audio.src = this.createFallbackSound(name);
        }
        
        this.sounds.set(name, audio);
        
        // Load the sound
        audio.load();
        
        return audio;
    }

    createFallbackSound(type) {
        // Create simple fallback sounds using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            let frequency = 440; // Default A4
            
            switch (type) {
                case 'focusStart':
                    frequency = 523.25; // C5
                    break;
                case 'breakStart':
                    frequency = 392.00; // G4
                    break;
                case 'sessionComplete':
                    frequency = 659.25; // E5
                    break;
                case 'notification':
                    frequency = 329.63; // E4
                    break;
            }
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            
            // Convert to data URL (simplified)
            return 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ';
        } catch (error) {
            console.log('Could not create fallback sound:', error);
            return '';
        }
    }

    play(name, customVolume = null) {
        if (!this.enabled) return;
        
        const audio = this.loadSound(name);
        if (!audio) return;
        
        // Stop if already playing
        audio.pause();
        audio.currentTime = 0;
        
        // Set volume
        audio.volume = customVolume !== null ? 
            this.utils.clamp(customVolume, 0, 1) : 
            this.volume;
        
        // Unmute if needed
        audio.muted = this.muted;
        
        // Play with error handling
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Sound play failed:', error);
                // Auto-play might be blocked, we'll try again on user interaction
                this.setupAutoPlayUnlock();
            });
        }
        
        return audio;
    }

    setupAutoPlayUnlock() {
        // Some browsers require user interaction before playing sounds
        const unlockAudio = () => {
            // Play a silent sound to unlock audio
            const silentAudio = new Audio();
            silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ';
            silentAudio.volume = 0.01;
            
            silentAudio.play().then(() => {
                // Audio unlocked
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
            }).catch(() => {
                // Still locked, keep listeners
            });
        };
        
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
    }

    stop(name) {
        const audio = this.sounds.get(name);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    stopAll() {
        this.sounds.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    setVolume(volume) {
        this.volume = this.utils.clamp(volume, 0, 1);
        
        // Update all loaded sounds
        this.sounds.forEach(audio => {
            audio.volume = this.volume;
        });
        
        // Save setting
        const settings = this.storage.getSettings();
        settings.notifications.volume = Math.round(this.volume * 100);
        this.storage.saveSettings(settings);
    }

    toggleMute() {
        this.muted = !this.muted;
        this.enabled = !this.muted;
        
        // Update all loaded sounds
        this.sounds.forEach(audio => {
            audio.muted = this.muted;
        });
        
        // Save setting
        const settings = this.storage.getSettings();
        settings.notifications.sounds = !this.muted;
        this.storage.saveSettings(settings);
        
        return !this.muted;
    }

    enable() {
        this.enabled = true;
        this.muted = false;
        
        // Update all loaded sounds
        this.sounds.forEach(audio => {
            audio.muted = false;
        });
    }

    disable() {
        this.enabled = false;
        this.muted = true;
        
        // Update all loaded sounds
        this.sounds.forEach(audio => {
            audio.muted = true;
        });
    }

    preloadAll() {
        Object.keys(this.soundFiles).forEach(soundName => {
            this.loadSound(soundName);
        });
    }

    getSound(name) {
        return this.sounds.get(name);
    }

    getAllSounds() {
        return Array.from(this.sounds.entries());
    }

    isPlaying(name) {
        const audio = this.sounds.get(name);
        return audio ? !audio.paused && audio.currentTime > 0 && audio.currentTime < audio.duration : false;
    }

    getStats() {
        let loaded = 0;
        let totalSize = 0;
        
        this.sounds.forEach(audio => {
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or more
                loaded++;
            }
        });
        
        return {
            total: this.sounds.size,
            loaded,
            enabled: this.enabled,
            volume: this.volume,
            muted: this.muted
        };
    }

    setupEventListeners() {
        // Settings changes
        window.addEventListener('settingsChanged', () => {
            this.loadSettings();
        });
        
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Lower volume when tab is not active
                this.sounds.forEach(audio => {
                    audio.volume = Math.min(audio.volume, 0.3);
                });
            } else {
                // Restore volume when tab is active
                this.sounds.forEach(audio => {
                    audio.volume = this.volume;
                });
            }
        });
    }

    // Special sound effects
    playTick() {
        if (!this.enabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (error) {
            // Web Audio API not supported
            console.log('Web Audio API not available for tick sound');
        }
    }

    playCompletionFanfare() {
        if (!this.enabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const now = audioContext.currentTime;
            
            // Play a little fanfare
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            const duration = 0.15;
            
            notes.forEach((frequency, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + duration);
                }, index * 100);
            });
        } catch (error) {
            // Fall back to regular complete sound
            this.play('complete');
        }
    }
}

// Create global instance
let sounds = null;

// Initialize when DOM is ready
utils.ready(() => {
    sounds = new SoundManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}
