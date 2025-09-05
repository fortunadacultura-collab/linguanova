// Native language translations manager
class NativeLanguageManager {
    constructor() {
        this.currentNativeLanguage = 'pt';
        this.translations = {};
        this.init();
    }

    async init() {
        await this.loadTranslations();
        this.loadUserPreference();
        
        // Configurar event listeners depois de um breve delay
        // para garantir que a navbar esteja carregada
        setTimeout(() => {
            this.setupEventListeners();
        }, 500);
    }

    async loadTranslations() {
        try {
            const response = await fetch('data/translations.json');
            if (!response.ok) throw new Error('Failed to load translations');
            this.translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to empty translations
            this.translations = {};
        }
    }

    setupEventListeners() {
        // Escutar evento de mudança de idioma nativo
        document.addEventListener('nativeLanguageChanged', (e) => {
            this.changeNativeLanguage(e.detail.language);
        });
    }

    loadUserPreference() {
        // Try to load from localStorage
        const savedLanguage = localStorage.getItem('nativeLanguage');
        if (savedLanguage && this.translations[savedLanguage]) {
            this.currentNativeLanguage = savedLanguage;
            this.updateUITexts(this.currentNativeLanguage);
            this.updateLanguageSelector(this.currentNativeLanguage);
        }
        
        // Alternatively, load from user profile
        this.loadFromUserProfile();
    }

    async loadFromUserProfile() {
        try {
            const response = await fetch('data/user-profiles.json');
            if (!response.ok) throw new Error('Failed to load user profiles');
            const profiles = await response.json();
            
            // In a real app, you would get the current user's profile
            const userProfile = profiles.users[0]; // Assuming first user for demo
            
            if (userProfile && userProfile.nativeLanguage) {
                this.currentNativeLanguage = userProfile.nativeLanguage;
                this.updateUITexts(this.currentNativeLanguage);
                this.updateLanguageSelector(this.currentNativeLanguage);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    changeNativeLanguage(langCode) {
        if (!this.translations[langCode]) {
            console.error(`Translations for ${langCode} not available`);
            return;
        }

        this.currentNativeLanguage = langCode;
        this.updateUITexts(langCode);
        this.updateLanguageSelector(langCode);
        this.saveNativeLanguagePreference(langCode);

        console.log(`Native language changed to: ${langCode}`);
        
        // Disparar evento para que outros componentes saibam da mudança
        document.dispatchEvent(new CustomEvent('nativeLanguageUpdated', {
            detail: { language: langCode }
        }));
    }

    updateLanguageSelector(langCode) {
        // Atualizar o seletor de idioma visualmente
        const userSelectedLanguage = document.getElementById('user-language');
        const userLanguageOptions = document.getElementById('user-language-options');
        
        if (userSelectedLanguage && userLanguageOptions) {
            // Encontrar a opção correspondente ao idioma
            const option = userLanguageOptions.querySelector(`li[data-value="${langCode}"]`);
            if (option) {
                const flag = option.getAttribute('data-flag');
                
                // Atualizar a flag exibida
                const flagImg = userSelectedLanguage.querySelector('img');
                if (flagImg) {
                    flagImg.src = `assets/images/flags/${flag}.svg`;
                    flagImg.alt = langCode.toUpperCase();
                }
                
                // Atualizar a seleção visual
                userLanguageOptions.querySelectorAll('li').forEach(li => {
                    li.classList.remove('selected');
                });
                option.classList.add('selected');
            }
        }
    }

    updateUITexts(langCode) {
        const translations = this.translations[langCode] || {};
        
        // Update all elements with data-translate attribute
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });

        // Update page title if it has a translation
        const pageTitle = document.querySelector('title');
        if (pageTitle && translations['pageTitle']) {
            const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
            if (translations[`pageTitle_${currentPage}`]) {
                pageTitle.textContent = translations[`pageTitle_${currentPage}`];
            } else if (translations['pageTitle']) {
                pageTitle.textContent = translations['pageTitle'];
            }
        }
    }

    saveNativeLanguagePreference(langCode) {
        // Save to localStorage
        localStorage.setItem('nativeLanguage', langCode);
        
        // In a real app, you would also save to the user's profile on the server
        console.log(`Saved native language preference: ${langCode}`);
    }

    getTranslation(key, langCode = this.currentNativeLanguage) {
        const langTranslations = this.translations[langCode] || {};
        return langTranslations[key] || key;
    }

    getCurrentNativeLanguage() {
        return this.currentNativeLanguage;
    }
}

// Initialize native language manager
const nativeLanguageManager = new NativeLanguageManager();

// Export for use in other modules
window.nativeLanguageManager = nativeLanguageManager;
window.getTranslation = (key) => nativeLanguageManager.getTranslation(key);