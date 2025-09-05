// Language manager for target language switching
class LanguageManager {
    constructor() {
        this.currentLanguage = 'en';
        this.availableLanguages = [];
        this.init();
    }

    async init() {
        await this.loadLanguageConfig();
        this.setupEventListeners();
    }

    async loadLanguageConfig() {
        try {
            const response = await fetch('data/language-config.json');
            if (!response.ok) throw new Error('Failed to load language configuration');
            const config = await response.json();
            this.availableLanguages = config.languages;
        } catch (error) {
            console.error('Error loading language config:', error);
            // Fallback to default languages
            this.availableLanguages = [
                { code: 'en', name: 'English', flag: 'us' },
                { code: 'es', name: 'Español', flag: 'es' },
                { code: 'pt', name: 'Português', flag: 'br' },
                { code: 'fr', name: 'Français', flag: 'fr' },
                { code: 'de', name: 'Deutsch', flag: 'de' },
                { code: 'it', name: 'Italiano', flag: 'it' },
                { code: 'ja', name: '日本語', flag: 'jp' },
                { code: 'ko', name: '한국어', flag: 'kr' },
                { code: 'zh', name: '中文', flag: 'cn' },
                { code: 'ru', name: 'Русский', flag: 'ru' },
                { code: 'hi', name: 'हिन्दी', flag: 'in' }
            ];
        }
    }

    setupEventListeners() {
        // Listen for language selection changes
        document.addEventListener('click', (e) => {
            if (e.target.closest('.language-option')) {
                const option = e.target.closest('.language-option');
                const langCode = option.getAttribute('data-value');
                this.changeLanguage(langCode);
            }
        });

        // Listen for custom language change events
        document.addEventListener('languageChange', (e) => {
            this.changeLanguage(e.detail.language);
        });
    }

    async changeLanguage(langCode) {
        if (!this.availableLanguages.some(lang => lang.code === langCode)) {
            console.error(`Language ${langCode} is not available`);
            return;
        }

        this.currentLanguage = langCode;
        
        // Update UI
        this.updateLanguageSelectors(langCode);
        
        // Save preference
        this.saveLanguagePreference(langCode);
        
        // Dispatch event for other components to react
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: langCode }
        }));

        console.log(`Language changed to: ${langCode}`);
    }

    updateLanguageSelectors(langCode) {
        // Update all language selectors on the page
        document.querySelectorAll('.language-selector').forEach(selector => {
            const selectedLang = selector.querySelector('.selected-language');
            const options = selector.querySelector('.language-options');
            
            if (selectedLang) {
                const language = this.availableLanguages.find(lang => lang.code === langCode);
                if (language) {
                    const flagImg = selectedLang.querySelector('img');
                    if (flagImg) {
                        flagImg.src = `assets/images/flags/${language.flag}.svg`;
                        flagImg.alt = language.name;
                    }
                }
            }
            
            if (options) {
                options.querySelectorAll('li').forEach(li => {
                    li.classList.remove('selected');
                    if (li.getAttribute('data-value') === langCode) {
                        li.classList.add('selected');
                    }
                });
            }
        });
    }

    saveLanguagePreference(langCode) {
        // Save to localStorage
        localStorage.setItem('preferredLanguage', langCode);
        
        // In a real app, you would also save to the server
        console.log(`Saved language preference: ${langCode}`);
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getAvailableLanguages() {
        return this.availableLanguages;
    }
}

// Initialize language manager
const languageManager = new LanguageManager();

// Export for use in other modules
window.languageManager = languageManager;