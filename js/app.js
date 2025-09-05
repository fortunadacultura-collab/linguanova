// App configuration and data
let appConfig = {
    dialogues: {},
    currentLanguage: 'en',
    currentDialogue: 'morning_routine',
    currentAudio: null,
    isPlaying: false,
    currentPhraseIndex: 0,
    audioElements: [],
    phraseDurations: [],
    totalDuration: 0,
    highlightInterval: null,
    data: null,
    initialThemes: 4,
    visibleThemes: 4,
    themesPerLine: 4,
    currentLine: 1,
    showTranslations: false,
    volume: 1,
    initialized: false
};

// DOM Elements cache
let domElements = {};

// Initialize the application
async function init() {
    if (appConfig.initialized) {
        console.log("App already initialized");
        return;
    }
    
    try {
        console.log("Initializing application...");
        
        initDomElements();
        
        // Load data from external JSON
        const response = await fetch('data/data.json');
        if (!response.ok) throw new Error('Failed to load configuration');
        appConfig.data = await response.json();
        
        appConfig.themesPerLine = calculateThemesPerLine();
        appConfig.initialThemes = appConfig.themesPerLine;
        appConfig.visibleThemes = appConfig.themesPerLine;
        
        await loadDialogue('morning_routine');
        renderThemeCards();
        setupEventListeners();
        
        updateUITexts(appConfig.currentLanguage);
        
        appConfig.initialized = true;
        console.log("Application initialized successfully");
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application');
    }
}

// Initialize DOM elements
function initDomElements() {
    domElements = {
        dialogueContent: document.getElementById('dialogue-content'),
        themeContainer: document.getElementById('theme-container'),
        playBtn: document.getElementById('play-btn'),
        pauseBtn: document.getElementById('pause-btn'),
        stopBtn: document.getElementById('stop-btn'),
        progressBar: document.getElementById('progress-bar'),
        currentTimeDisplay: document.getElementById('current-time'),
        totalTimeDisplay: document.getElementById('total-time'),
        dialogueTitle: document.getElementById('dialogue-title-text'),
        chooseThemeText: document.getElementById('choose-theme-text'),
        startLearningText: document.getElementById('start-learning-text'),
        translateToggleBtn: document.getElementById('translate-toggle-btn'),
        volumeBtn: document.getElementById('volume-btn'),
        volumeSlider: document.getElementById('volume-slider')
    };
}

// Dialogue functions
async function loadDialogue(dialogueId) {
    try {
        console.log("Loading dialogue:", dialogueId);
        
        // Load dialogue from server
        appConfig.dialogues[dialogueId] = await loadDialogueTxt(dialogueId);

        const dialogue = appConfig.dialogues[dialogueId];
        if (!dialogue) {
            throw new Error('Dialogue not found: ' + dialogueId);
        }

        appConfig.currentDialogue = dialogueId;
        domElements.dialogueTitle.textContent = dialogue.title;
        domElements.dialogueContent.innerHTML = '';
        
        dialogue.lines.forEach((line, index) => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message message-${index % 2 === 0 ? 'other' : 'user'}`;
            messageDiv.setAttribute('data-index', index);
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'message-info';
            
            const senderSpan = document.createElement('span');
            senderSpan.className = 'message-sender';
            senderSpan.textContent = line.speaker;
            
            infoDiv.appendChild(senderSpan);
            
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = line.text;
            
            const translationDiv = document.createElement('div');
            translationDiv.className = 'translation-text';
            translationDiv.setAttribute('data-lang', appConfig.currentLanguage);
            translationDiv.textContent = line.translations[appConfig.currentLanguage] || '';
            translationDiv.style.display = 'none';
            
            messageDiv.appendChild(infoDiv);
            messageDiv.appendChild(textDiv);
            messageDiv.appendChild(translationDiv);
            
            messageDiv.addEventListener('click', () => {
                playPhrase(index);
            });
            
            domElements.dialogueContent.appendChild(messageDiv);
        });

        updateTranslationVisibility();
        preloadAudios(dialogueId);
        calculateDurations();
        stopAllAudio();
        renderThemeCards();
        
        console.log("Dialogue loaded successfully:", dialogueId);
    } catch (error) {
        console.error('Error loading dialogue:', error);
        showError('Failed to load dialogue: ' + error.message);
    }
}

async function loadDialogueTxt(dialogueId) {
    const response = await fetch(`languages/en/dialogues/${dialogueId}/${dialogueId}.txt`);
    if (!response.ok) throw new Error('Dialogue not found');
    const content = await response.text();
    return parseDialogueTxt(content);
}

function parseDialogueTxt(content) {
    const lines = content.split('\n');
    const dialogue = {
        title: '',
        lines: []
    };
    
    let currentLine = {};
    const txtFormat = appConfig.data.settings.dialogueTemplates.txtFormat;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith(txtFormat.titlePrefix)) {
            dialogue.title = trimmedLine.replace(txtFormat.titlePrefix, '').trim();
        } 
        else if (trimmedLine.startsWith(txtFormat.speakerPrefix)) {
            if (currentLine.text) {
                dialogue.lines.push(currentLine);
                currentLine = {};
            }
            currentLine.speaker = trimmedLine.replace(txtFormat.speakerPrefix, '').trim();
        }
        else if (trimmedLine.startsWith(txtFormat.textPrefix)) {
            currentLine.text = trimmedLine.replace(txtFormat.textPrefix, '').trim();
            currentLine.translations = {};
        }
        else if (trimmedLine.startsWith(txtFormat.translationPrefixes.pt)) {
            currentLine.translations.pt = trimmedLine.replace(txtFormat.translationPrefixes.pt, '').trim();
        }
        else if (trimmedLine.startsWith(txtFormat.translationPrefixes.es)) {
            currentLine.translations.es = trimmedLine.replace(txtFormat.translationPrefixes.es, '').trim();
        }
        else if (trimmedLine.startsWith(txtFormat.translationPrefixes.en)) {
            currentLine.translations.en = trimmedLine.replace(txtFormat.translationPrefixes.en, '').trim();
        }
    }
    
    if (currentLine.text) {
        dialogue.lines.push(currentLine);
    }
    
    return dialogue;
}

// Audio functions - SEM FALLBACK
function preloadAudios(dialogueId) {
    // Clear existing audio elements
    appConfig.audioElements.forEach(audio => {
        if (audio && typeof audio.pause === 'function') {
            audio.pause();
        }
    });
    
    appConfig.audioElements = [];
    const dialogue = appConfig.dialogues[dialogueId];
    if (!dialogue) return;
    
    // Create audio elements for each line with the correct path structure
    dialogue.lines.forEach((_, index) => {
        const audio = new Audio();
        audio.preload = 'auto';
        
        // Use the exact project structure path
        audio.src = `languages/en/dialogues/${dialogueId}/audios/line_${index}.mp3`;
        audio.volume = appConfig.volume;
        
        audio.addEventListener('error', (e) => {
            console.error(`Error loading audio for line ${index}:`, e);
            console.error(`Audio path: ${audio.src}`);
            showError(`Failed to load audio for line ${index}`);
        });
        
        audio.addEventListener('loadeddata', () => {
            console.log(`Audio loaded successfully for line ${index}`);
            if (!isNaN(audio.duration) && audio.duration > 0) {
                appConfig.phraseDurations[index] = audio.duration;
                updateTotalDuration();
            }
        });
        
        audio.addEventListener('canplaythrough', () => {
            console.log(`Audio can play through for line ${index}`);
        });
        
        appConfig.audioElements.push(audio);
    });
}

function calculateDurations() {
    appConfig.phraseDurations = [];
    appConfig.totalDuration = 0;
    
    const dialogue = appConfig.dialogues[appConfig.currentDialogue];
    if (!dialogue) return;
    
    dialogue.lines.forEach((line, index) => {
        const wordCount = line.text.split(' ').length;
        const duration = Math.max(
            appConfig.data.settings.audioSettings.fallbackDuration.baseSeconds,
            wordCount * appConfig.data.settings.audioSettings.fallbackDuration.secondsPerWord
        );
        appConfig.phraseDurations.push(duration);
        appConfig.totalDuration += duration;
    });
    
    if (domElements.totalTimeDisplay) {
        domElements.totalTimeDisplay.textContent = formatTime(appConfig.totalDuration);
    }
}

function updateTotalDuration() {
    appConfig.totalDuration = appConfig.phraseDurations.reduce((sum, duration) => sum + duration, 0);
    if (domElements.totalTimeDisplay) {
        domElements.totalTimeDisplay.textContent = formatTime(appConfig.totalDuration);
    }
}

// Player control functions
function playDialogue() {
    console.log("Play button clicked");
    
    if (appConfig.isPlaying) {
        pauseDialogue();
        return;
    }
    
    // Resume from pause
    if (appConfig.currentAudio && appConfig.currentAudio.paused) {
        appConfig.isPlaying = true;
        updatePlayerControls();
        startProgressTracking();
        // Ensure the onended handler is set for sequential playback
        appConfig.currentAudio.onended = () => {
            appConfig.currentPhraseIndex++;
            playCurrentPhrase();
        };
        appConfig.currentAudio.play().catch(error => {
            console.error('Audio playback failed:', error);
            showError('Audio playback failed: ' + error.message);
        });
        return;
    }

    // Start from the current phrase index (or 0 if stopped)
    appConfig.isPlaying = true;
    updatePlayerControls();
    startProgressTracking();
    playCurrentPhrase();
}

function playCurrentPhrase() {
    if (!appConfig.isPlaying || appConfig.currentPhraseIndex >= appConfig.audioElements.length) {
        stopAllAudio();
        return;
    }
    
    highlightCurrentPhrase();
    
    const audio = appConfig.audioElements[appConfig.currentPhraseIndex];
    appConfig.currentAudio = audio;
    audio.volume = appConfig.volume;
    
    if (!audio || !audio.src) {
        showError('Audio not available for phrase ' + appConfig.currentPhraseIndex);
        return;
    }
    
    // Do not reset time if resuming from pause
    if (!audio.paused) {
        audio.currentTime = 0;
    }

    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            audio.onended = () => {
                appConfig.currentPhraseIndex++;
                playCurrentPhrase();
            };
        }).catch(error => {
            console.error('Audio playback failed:', error);
            showError('Audio playback failed: ' + error.message);
        });
    }
}

function pauseDialogue() {
    console.log("Pause button clicked");
    
    if (!appConfig.isPlaying) return;
    
    appConfig.isPlaying = false;
    clearInterval(appConfig.highlightInterval);
    
    if (appConfig.currentAudio) {
        appConfig.currentAudio.pause();
    }
    
    updatePlayerControls();
}

function stopDialogue() {
    console.log("Stop button clicked");
    stopAllAudio();
}

function stopAllAudio() {
    appConfig.isPlaying = false;
    appConfig.currentPhraseIndex = 0;
    clearInterval(appConfig.highlightInterval);
    
    appConfig.audioElements.forEach(audio => {
        if (audio && typeof audio.pause === 'function') {
            audio.pause();
            audio.currentTime = 0;
        }
    });
    
    appConfig.currentAudio = null; // Clear current audio reference
    removeAllHighlights();
    updateProgress(0);
    updatePlayerControls();
}

function playPhrase(index) {
    console.log("Playing phrase:", index);
    
    stopAllAudio(); // Stop any ongoing playback
    appConfig.currentPhraseIndex = index; // Set the starting point
    
    if (index >= appConfig.audioElements.length) {
        showError('Phrase index out of range');
        return;
    }
    
    const audio = appConfig.audioElements[index];
    appConfig.currentAudio = audio;
    appConfig.isPlaying = true;
    audio.volume = appConfig.volume;
    
    highlightCurrentPhrase();
    updatePlayerControls();
    
    if (!audio || !audio.src) {
        showError('Audio not available for this phrase');
        return;
    }
    
    audio.currentTime = 0;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            // When a single phrase ends, it just stops.
            audio.onended = () => {
                removeAllHighlights();
                appConfig.isPlaying = false;
                updatePlayerControls();
                // The player is now "paused" at the end of this phrase.
                // Clicking main play will resume sequence from the next phrase.
                appConfig.currentPhraseIndex++; 
            };
        }).catch(error => {
            console.error('Audio playback failed:', error);
            showError('Audio playback failed: ' + error.message);
        });
    }
    
    updateProgress(getCurrentPlaybackTime());
}

// UI functions
function highlightCurrentPhrase() {
    removeAllHighlights();
    
    const messages = document.querySelectorAll('.message');
    if (appConfig.currentPhraseIndex < messages.length) {
        messages[appConfig.currentPhraseIndex].classList.add('highlighted');
        messages[appConfig.currentPhraseIndex].classList.add('playing');
        messages[appConfig.currentPhraseIndex].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }
}

function removeAllHighlights() {
    document.querySelectorAll('.message').forEach(msg => {
        msg.classList.remove('highlighted');
        msg.classList.remove('playing');
    });
}

function startProgressTracking() {
    clearInterval(appConfig.highlightInterval);
    
    appConfig.highlightInterval = setInterval(() => {
        if (!appConfig.isPlaying) return;
        updateProgress(getCurrentPlaybackTime());
    }, 100);
}

function getCurrentPlaybackTime() {
    if (!appConfig.isPlaying || appConfig.currentPhraseIndex >= appConfig.audioElements.length) return 0;
    
    let time = 0;
    for (let i = 0; i < appConfig.currentPhraseIndex; i++) {
        time += appConfig.phraseDurations[i];
    }
    
    if (appConfig.currentAudio && !isNaN(appConfig.currentAudio.currentTime)) {
        time += appConfig.currentAudio.currentTime;
    }
    
    return time;
}

function updateProgress(currentTime) {
    const progressPercent = (currentTime / appConfig.totalDuration) * 100;
    if (domElements.progressBar) {
        domElements.progressBar.style.setProperty('--progress', `${progressPercent}%`);
    }
    updateTimeDisplay(currentTime, appConfig.totalDuration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateTimeDisplay(current, total) {
    if (domElements.currentTimeDisplay) {
        domElements.currentTimeDisplay.textContent = formatTime(current);
    }
    if (domElements.totalTimeDisplay) {
        domElements.totalTimeDisplay.textContent = formatTime(total);
    }
}

function updatePlayerControls() {
    if (!domElements.playBtn || !domElements.pauseBtn || !domElements.stopBtn) return;
    
    if (appConfig.isPlaying) {
        domElements.playBtn.classList.add('disabled');
        domElements.pauseBtn.classList.remove('disabled');
        domElements.stopBtn.classList.remove('disabled');
    } else {
        domElements.playBtn.classList.remove('disabled');
        domElements.pauseBtn.classList.add('disabled');
        domElements.stopBtn.classList.add('disabled');
    }
}

function toggleTranslationMode() {
    console.log("Translate toggle clicked");
    
    appConfig.showTranslations = !appConfig.showTranslations;
    
    if (domElements.translateToggleBtn) {
        if (appConfig.showTranslations) {
            domElements.translateToggleBtn.classList.add('active');
        } else {
            domElements.translateToggleBtn.classList.remove('active');
        }
    }
    
    updateTranslationVisibility();
}

function updateTranslationVisibility() {
    const dialogueContainer = document.querySelector('.dialogue-container');
    const translations = document.querySelectorAll('.translation-text');
    
    if (appConfig.showTranslations) {
        dialogueContainer.classList.add('show-translations');
        translations.forEach(translation => {
            translation.style.display = 'block';
        });
    } else {
        dialogueContainer.classList.remove('show-translations');
        translations.forEach(translation => {
            translation.style.display = 'none';
        });
    }
}

function updateVolume(volume) {
    appConfig.volume = volume;
    
    appConfig.audioElements.forEach(audio => {
        if (audio) {
            audio.volume = appConfig.volume;
        }
    });
    
    if (domElements.volumeBtn) {
        if (appConfig.volume === 0) {
            domElements.volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (appConfig.volume < 0.5) {
            domElements.volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            domElements.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }
}

function toggleMute() {
    console.log("Volume button clicked");
    
    if (appConfig.volume > 0) {
        appConfig.lastVolume = appConfig.volume;
        updateVolume(0);
        if (domElements.volumeSlider) {
            domElements.volumeSlider.value = 0;
        }
    } else {
        updateVolume(appConfig.lastVolume || 0.7);
        if (domElements.volumeSlider) {
            domElements.volumeSlider.value = appConfig.lastVolume || 0.7;
        }
    }
}

function renderThemeCards() {
    if (!domElements.themeContainer) return;
    
    domElements.themeContainer.innerHTML = '';
    
    if (!appConfig.data || !appConfig.data.themes) return;
    
    appConfig.data.themes.slice(0, appConfig.visibleThemes).forEach(theme => {
        const themeCard = document.createElement('div');
        themeCard.className = 'theme-card';
        themeCard.innerHTML = `
            <h3>${theme.title}</h3>
            <ul>
                ${theme.topics.map(topic => `
                    <li onclick="loadDialogue('${topic.id}')" 
                        data-id="${topic.id}"
                        ${appConfig.currentDialogue === topic.id ? 'class="active"' : ''}>
                        ${topic.name}
                    </li>
                `).join('')}
            </ul>
        `;
        domElements.themeContainer.appendChild(themeCard);
    });
    
    updateThemeControls();
}

function updateThemeControls() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    const showLessBtn = document.getElementById('show-less-btn');
    
    if (!loadMoreBtn || !showLessBtn || !appConfig.data || !appConfig.data.translations) return;
    
    const translations = appConfig.data.translations[appConfig.currentLanguage] || appConfig.data.translations['en'] || {};
    
    const loadMoreText = loadMoreBtn.querySelector('span');
    const showLessText = showLessBtn.querySelector('span');
    
    if (loadMoreText) {
        loadMoreText.textContent = translations['loadMore'] || 'Load More Themes';
    }
    if (showLessText) {
        showLessText.textContent = translations['showLess'] || 'Show Less';
    }
    
    if (appConfig.visibleThemes >= appConfig.data.themes.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'flex';
    }
    
    if (appConfig.visibleThemes > appConfig.initialThemes) {
        showLessBtn.style.display = 'flex';
    } else {
        showLessBtn.style.display = 'none';
    }
}

function showError(message) {
    const existingError = document.querySelector('.global-error');
    if (existingError) existingError.remove();
    
    const errorElement = document.createElement('div');
    errorElement.className = 'global-error';
    errorElement.textContent = message;
    errorElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef233c;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
    `;
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 5000);
}

function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    if (domElements.playBtn) {
        domElements.playBtn.addEventListener('click', playDialogue);
    }
    
    if (domElements.pauseBtn) {
        domElements.pauseBtn.addEventListener('click', pauseDialogue);
    }
    
    if (domElements.stopBtn) {
        domElements.stopBtn.addEventListener('click', stopDialogue);
    }
    
    if (domElements.translateToggleBtn) {
        domElements.translateToggleBtn.addEventListener('click', toggleTranslationMode);
    }
    
    if (domElements.volumeBtn) {
        domElements.volumeBtn.addEventListener('click', toggleMute);
    }
    
    if (domElements.volumeSlider) {
        domElements.volumeSlider.addEventListener('input', (e) => {
            updateVolume(parseFloat(e.target.value));
        });
    }
    
    if (domElements.progressBar) {
        domElements.progressBar.addEventListener('click', (e) => {
            const rect = domElements.progressBar.getBoundingClientRect();
            const seekPercent = (e.clientX - rect.left) / rect.width;
            const seekTime = seekPercent * appConfig.totalDuration;
            
            let accumulatedTime = 0;
            let newPhraseIndex = 0;
            
            for (let i = 0; i < appConfig.phraseDurations.length; i++) {
                if (accumulatedTime + appConfig.phraseDurations[i] > seekTime) {
                    newPhraseIndex = i;
                    break;
                }
                accumulatedTime += appConfig.phraseDurations[i];
            }
            
            appConfig.currentPhraseIndex = newPhraseIndex;
            updateProgress(seekTime);
            
            if (appConfig.isPlaying) {
                pauseDialogue();
                playDialogue();
            } else {
                highlightCurrentPhrase();
            }
        });
    }

    const loadMoreBtn = document.getElementById('load-more-btn');
    const showLessBtn = document.getElementById('show-less-btn');
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreThemes);
    }
    if (showLessBtn) {
        showLessBtn.addEventListener('click', showLessThemes);
    }
}

function loadMoreThemes() {
    if (!appConfig.data || !appConfig.data.themes) return;
    
    appConfig.themesPerLine = calculateThemesPerLine();
    appConfig.currentLine++;
    
    const newVisibleThemes = appConfig.themesPerLine * appConfig.currentLine;
    appConfig.visibleThemes = Math.min(newVisibleThemes, appConfig.data.themes.length);
    
    renderThemeCards();
}

function showLessThemes() {
    appConfig.currentLine = 1;
    appConfig.visibleThemes = appConfig.themesPerLine;
    renderThemeCards();
    
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        sectionTitle.scrollIntoView({ behavior: 'smooth' });
    }
}

function calculateThemesPerLine() {
    const grid = document.querySelector('.theme-grid');
    if (!grid) return 4;
    
    const gridWidth = grid.offsetWidth;
    const cardWidth = 280;
    const gap = 32;
    
    return Math.max(1, Math.floor(gridWidth / (cardWidth + gap)));
}

function updateUITexts(langCode) {
    if (!appConfig.data || !appConfig.data.translations) return;
    
    appConfig.currentLanguage = langCode;
    const translations = appConfig.data.translations[langCode] || appConfig.data.translations['en'] || {};
    
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });
    
    updateDialogueTranslations(langCode);
}

function updateDialogueTranslations(langCode) {
    const dialogue = appConfig.dialogues[appConfig.currentDialogue];
    if (!dialogue) return;
    
    document.querySelectorAll('.message').forEach((messageElement, index) => {
        if (dialogue.lines[index] && dialogue.lines[index].translations[langCode]) {
            const translationDiv = messageElement.querySelector('.translation-text');
            if (translationDiv) {
                translationDiv.textContent = dialogue.lines[index].translations[langCode];
                translationDiv.setAttribute('data-lang', langCode);
            }
        }
    });
}

// Make functions available globally
window.loadDialogue = loadDialogue;
window.playPhrase = playPhrase;
window.toggleTranslationMode = toggleTranslationMode;
window.toggleMute = toggleMute;
window.loadMoreThemes = loadMoreThemes;
window.showLessThemes = showLessThemes;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(init, 100);
});