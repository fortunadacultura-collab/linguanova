// Geo IP and Language Detection Service
class LanguageDetector {
    constructor() {
        this.detectedLanguage = null;
        this.isTranslationsLoaded = false;
        this.setupTranslationListener();
    }

    // Configurar listener para quando as traduções carregarem
    setupTranslationListener() {
        document.addEventListener('translationsLoaded', () => {
            this.isTranslationsLoaded = true;
            console.log("Translations loaded, ready for language detection");
        });
    }

    // Aguardar até que as traduções estejam carregadas
    async waitForTranslations() {
        if (this.isTranslationsLoaded) return true;
        
        console.log("Waiting for translations to load...");
        
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.isTranslationsLoaded) {
                    clearInterval(checkInterval);
                    console.log("Translations are now loaded");
                    resolve(true);
                }
            }, 100);
            
            // Timeout após 5 segundos - prosseguir mesmo sem traduções
            setTimeout(() => {
                clearInterval(checkInterval);
                console.log("Timeout waiting for translations, proceeding anyway");
                resolve(false);
            }, 5000);
        });
    }

    async detectLanguage(useIP = false) {
        try {
            // 1. Primeiro tenta detectar pelo navegador (mais confiável e rápido)
            const browserLang = this.detectFromBrowser();
            if (browserLang) {
                console.log("Idioma detectado pelo navegador:", browserLang);
                return browserLang;
            }

            // 2. Se não conseguir e a chamada por IP for permitida, tenta pela geolocalização
            if (useIP) {
                const geoLang = await this.detectFromIP();
                if (geoLang) {
                    console.log("Idioma detectado por IP:", geoLang);
                    return geoLang;
                }
            }

            // 3. Fallback para português
            console.log("Usando idioma padrão: português");
            return 'pt';

        } catch (error) {
            console.error("Erro na detecção de idioma:", error);
            return 'pt'; // Fallback
        }
    }

    detectFromBrowser() {
        // Idiomas suportados pelo nosso sistema
        const supportedLanguages = ['pt', 'es', 'en'];
        
        // Tenta detectar do navegador
        const browserLanguage = navigator.language || navigator.userLanguage;
        
        if (browserLanguage) {
            // Extrai o código de 2 letras (ex: 'pt-BR' → 'pt')
            const primaryLang = browserLanguage.split('-')[0].toLowerCase();
            
            // Verifica se é um idioma suportado diretamente
            if (supportedLanguages.includes(primaryLang)) {
                return primaryLang;
            }
            
            // Verifica se há algum idioma similar suportado
            for (const lang of supportedLanguages) {
                if (browserLanguage.includes(lang)) {
                    return lang;
                }
            }

            // Verifica idiomas específicos por região
            const regionToLanguage = {
                'pt': ['pt-BR', 'pt-PT', 'pt-AO', 'pt-MZ'],
                'es': ['es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL'],
                'en': ['en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ']
            };

            for (const [lang, codes] of Object.entries(regionToLanguage)) {
                if (codes.includes(browserLanguage)) {
                    return lang;
                }
            }
        }
        
        return null;
    }

    async detectFromIP() {
        try {
            // Usa API gratuita para detecção por IP com timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('https://ipapi.co/json/', {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('IP API failed');
            
            const data = await response.json();
            const countryCode = data.country_code;
            const languages = data.languages;
            
            console.log("IP detection data:", { countryCode, languages });
            
            // Mapeia código do país para idioma
            const countryToLanguage = {
                'BR': 'pt', // Brasil
                'PT': 'pt', // Portugal
                'AO': 'pt', // Angola
                'MZ': 'pt', // Moçambique
                'ES': 'es', // Espanha
                'MX': 'es', // México
                'AR': 'es', // Argentina
                'CO': 'es', // Colombia
                'CL': 'es', // Chile
                'PE': 'es', // Peru
                'US': 'en', // Estados Unidos
                'GB': 'en', // Reino Unido
                'CA': 'en', // Canadá
                'AU': 'en', // Austrália
                'NZ': 'en', // Nova Zelândia
                'IE': 'en', // Irlanda
                'ZA': 'en', // África do Sul
            };
            
            // Primeiro tenta pelo código do país
            if (countryToLanguage[countryCode]) {
                return countryToLanguage[countryCode];
            }
            
            // Se não encontrar, tenta analisar as languages string
            if (languages) {
                const languageCodes = languages.split(',');
                for (const langCode of languageCodes) {
                    const primaryLang = langCode.split('-')[0].toLowerCase();
                    if (['pt', 'es', 'en'].includes(primaryLang)) {
                        return primaryLang;
                    }
                }
            }
            
            return null;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn("Detecção por IP timeout após 5 segundos");
            } else {
                console.warn("Detecção por IP falhou:", error.message);
            }
            return null;
        }
    }

    // Detecção apenas pelo navegador (mais rápido)
    detectFromBrowserOnly() {
        const lang = this.detectFromBrowser();
        return lang || 'pt'; // Fallback para português
    }

    // Método para teste - força um idioma específico
    setTestLanguage(lang) {
        this.detectedLanguage = lang;
        console.log("Idioma de teste definido para:", lang);
    }

    // Verificar suporte para um idioma específico
    isLanguageSupported(langCode) {
        return ['pt', 'es', 'en'].includes(langCode);
    }

    // Obter idioma preferido do usuário com fallback
    async getPreferredLanguage() {
        try {
            // Tenta detection completa
            return await this.detectLanguage();
        } catch (error) {
            // Fallback para detection apenas do navegador
            console.warn("Falha na detection completa, usando fallback do navegador");
            return this.detectFromBrowserOnly();
        }
    }
}

// Initialize and export
const languageDetector = new LanguageDetector();
window.languageDetector = languageDetector;

// Função auxiliar para debug
window.debugLanguageDetection = async function() {
    console.group('🔍 Debug de Detecção de Idioma');
    console.log('Navigator language:', navigator.language);
    console.log('User language:', navigator.userLanguage);
    console.log('Languages:', navigator.languages);
    
    try {
        const browserLang = languageDetector.detectFromBrowser();
        console.log('Browser detection:', browserLang);
        
        const ipLang = await languageDetector.detectFromIP();
        console.log('IP detection:', ipLang);
        
        const finalLang = await languageDetector.detectLanguage();
        console.log('Final detection:', finalLang);
        
    } catch (error) {
        console.error('Debug error:', error);
    }
    
    console.groupEnd();
};

// Auto-inicialização para testes rápidos
if (typeof window !== 'undefined') {
    // Expor função global para testes
    window.testLanguageDetection = function(lang) {
        languageDetector.setTestLanguage(lang);
        console.log(`Idioma de teste "${lang}" definido. Recarregue a página.`);
    };
}

console.log("🌍 Language Detector inicializado com sucesso");