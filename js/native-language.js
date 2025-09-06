// native-language.js - CORREÇÃO DO LOOP INFINITO
class NativeLanguageManager {
    constructor() {
        this.currentNativeLanguage = 'pt';
        this.translations = {};
        this.isChangingLanguage = false; // ⚠️ FLAG PARA PREVENIR LOOP
        this.init();
    }

    async init() {
        await this.loadTranslations();
        await this.loadUserPreference();
        
        this.setupEventListeners();
    }

    async loadTranslations() {
        try {
            const response = await fetch('data/translations.json');
            if (!response.ok) throw new Error('Failed to load translations');
            this.translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            this.translations = {};
        }
    }

    setupEventListeners() {
        // ⚠️ CORREÇÃO: Usar once ou verificar se já está processando
        document.addEventListener('nativeLanguageChanged', (e) => {
            if (!this.isChangingLanguage && e.detail.language !== this.currentNativeLanguage) {
                this.changeNativeLanguage(e.detail.language);
            }
        });
    }

    async loadUserPreference() {
        // 1. Primeiro verifica se já tem preferência salva
        const savedLanguage = localStorage.getItem('nativeLanguage');
        if (savedLanguage && this.translations[savedLanguage]) {
            this.currentNativeLanguage = savedLanguage;
            this.updateUITexts(this.currentNativeLanguage);
            this.updateLanguageSelector(this.currentNativeLanguage);
            this.notifyLanguageChange(savedLanguage, false); // ⚠️ false = não redisparar evento
            return;
        }

        // 2. Se não tiver preferência, detecta automaticamente
        try {
            const detectedLanguage = await languageDetector.detectLanguage();
            this.applyLanguage(detectedLanguage, true); // ⚠️ true = é detecção automática
            
        } catch (error) {
            console.error("Erro na detecção automática:", error);
            // 3. Fallback para português
            this.applyLanguage('pt', true);
        }
    }

    // ⚠️ NOVA FUNÇÃO: Aplicar idioma sem causar loop
    applyLanguage(langCode, isAutoDetection = false) {
        if (this.isChangingLanguage || langCode === this.currentNativeLanguage) {
            return;
        }

        this.isChangingLanguage = true;
        
        this.currentNativeLanguage = langCode;
        this.updateUITexts(langCode);
        this.updateLanguageSelector(langCode);
        
        if (isAutoDetection) {
            // Salva a detecção automática para futuro
            localStorage.setItem('nativeLanguage', langCode);
        }
        
        this.notifyLanguageChange(langCode, false); // ⚠️ Não redisparar evento
        
        this.isChangingLanguage = false;
    }

    notifyLanguageChange(langCode, shouldDispatch = true) {
        if (shouldDispatch) {
            document.dispatchEvent(new CustomEvent('translationLanguageChanged', {
                detail: { language: langCode }
            }));
        }
    }

    changeNativeLanguage(langCode) {
        if (this.isChangingLanguage || !this.translations[langCode]) {
            return;
        }

        this.isChangingLanguage = true;
        
        this.currentNativeLanguage = langCode;
        this.updateUITexts(langCode);
        this.updateLanguageSelector(langCode);
        this.saveNativeLanguagePreference(langCode);

        console.log(`Native language changed to: ${langCode}`);
        
        this.notifyLanguageChange(langCode, true);
        
        this.isChangingLanguage = false;
    }

    updateLanguageSelector(langCode) {
        const userSelectedLanguage = document.getElementById('user-language');
        const userLanguageOptions = document.getElementById('user-language-options');
        
        if (userSelectedLanguage && userLanguageOptions) {
            const option = userLanguageOptions.querySelector(`li[data-value="${langCode}"]`);
            if (option) {
                const flag = option.getAttribute('data-flag');
                
                const flagImg = userSelectedLanguage.querySelector('img');
                if (flagImg) {
                    flagImg.src = `assets/images/flags/${flag}.svg`;
                    flagImg.alt = langCode.toUpperCase();
                }
                
                userLanguageOptions.querySelectorAll('li').forEach(li => {
                    li.classList.remove('selected');
                });
                option.classList.add('selected');
            }
        }
    }

    updateUITexts(langCode) {
        const translations = this.translations[langCode] || {};
        
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });

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
        localStorage.setItem('nativeLanguage', langCode);
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
window.nativeLanguageManager = nativeLanguageManager;
window.getTranslation = (key) => nativeLanguageManager.getTranslation(key);