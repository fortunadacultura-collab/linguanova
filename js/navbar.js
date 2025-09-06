// Navbar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load navbar and footer
    loadNavbar();
    loadFooter();
    
    // Setup mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
            
            // Fechar os menus de idiomas se estiverem abertos
            closeLanguageSelectors();
            
            // Fechar menu do usuário se estiver aberto
            closeUserMenu();
        });
        
        // Close menu when clicking on links
        document.querySelectorAll('.nav-links a, .dropdown-item').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.nav-links') && !event.target.closest('.mobile-menu-toggle') && navLinks.classList.contains('active')) {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Toggle dropdown menus on mobile
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 900) {
                e.preventDefault();
                const dropdown = this.parentElement;
                dropdown.classList.toggle('active');
            }
        });
    });
    
    // Fechar os menus ao clicar fora
    document.addEventListener('click', function(event) {
        // Fechar menus de idioma
        closeLanguageSelectorsOnClickOutside(event);
        
        // Fechar dropdowns ao clicar fora
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            if (!event.target.closest('.dropdown') && dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
            }
        });
        
        // Fechar menu do usuário ao clicar fora
        closeUserMenuOnClickOutside(event);
    });
    
    // Prevenir que o clique nos dropdowns propague para o documento
    const dropdownMenus = document.querySelectorAll('.dropdown-menu');
    dropdownMenus.forEach(menu => {
        menu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
});

// CORREÇÃO: Nova lógica para os seletores de idioma
function setupLanguageSelectors() {
    // Seletor de idioma de aprendizado
    const learningSelector = document.querySelector('#learning-language').closest('.language-selector');
    const learningSelected = document.getElementById('learning-language');
    const learningOptions = document.getElementById('learning-language-options');
    
    if (learningSelected && learningOptions) {
        learningSelected.addEventListener('click', function(e) {
            e.stopPropagation();
            learningSelector.classList.toggle('active');
            
            // Fechar outros seletores
            closeOtherSelectors(learningSelector);
            closeUserMenu();
        });
        
        setupLanguageOptions(learningOptions, 'learning');
    }
    
    // Seletor de idioma nativo
    const userSelector = document.querySelector('#user-language').closest('.language-selector');
    const userSelected = document.getElementById('user-language');
    const userOptions = document.getElementById('user-language-options');
    
    if (userSelected && userOptions) {
        userSelected.addEventListener('click', function(e) {
            e.stopPropagation();
            userSelector.classList.toggle('active');
            
            // Fechar outros seletores
            closeOtherSelectors(userSelector);
            closeUserMenu();
        });
        
        setupLanguageOptions(userOptions, 'native');
    }
}

function setupLanguageOptions(optionsContainer, type) {
    optionsContainer.querySelectorAll('li').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const value = this.getAttribute('data-value');
            const flag = this.getAttribute('data-flag');
            
            if (type === 'learning') {
                // Atualizar visualmente
                const selectedElement = document.getElementById('learning-language');
                const flagImg = selectedElement.querySelector('img');
                if (flagImg) {
                    flagImg.src = `assets/images/flags/${flag}.svg`;
                    flagImg.alt = value;
                }
                
                // Marcar como selecionado
                optionsContainer.querySelectorAll('li').forEach(li => {
                    li.classList.remove('selected');
                });
                this.classList.add('selected');
                
                // Fechar menu e redirecionar
                this.closest('.language-selector').classList.remove('active');
                window.location.href = `study-${value}.html`;
            } else if (type === 'native') {
                // NOTIFICAR a mudança de idioma de tradução
                notifyNativeLanguageChange(value);
                
                // Fechar menu
                this.closest('.language-selector').classList.remove('active');
            }
        });
    });
}

function closeOtherSelectors(currentSelector) {
    document.querySelectorAll('.language-selector').forEach(selector => {
        if (selector !== currentSelector && selector.classList.contains('active')) {
            selector.classList.remove('active');
        }
    });
}

function closeLanguageSelectorsOnClickOutside(event) {
    if (!event.target.closest('.language-selector')) {
        closeLanguageSelectors();
    }
}

function closeLanguageSelectors() {
    document.querySelectorAll('.language-selector').forEach(selector => {
        selector.classList.remove('active');
    });
}

function closeUserMenuOnClickOutside(event) {
    const userDropdownMenu = document.querySelector('.user-dropdown-menu');
    if (!event.target.closest('.user-menu') && 
        userDropdownMenu && 
        userDropdownMenu.style.visibility === 'visible') {
        closeUserMenu();
    }
}

// Load navbar from external file
function loadNavbar() {
    fetch('navbar.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('navbar-container').innerHTML = data;
            
            // ⚠️ AGUARDAR O NATIVE-LANGUAGE CARREGAR PRIMEIRO
            setTimeout(() => {
                setupLanguageSelectors();
                initTooltips();
                
                const userMenu = document.querySelector('.user-menu');
                const userDropdownMenu = document.querySelector('.user-dropdown-menu');
                
                if (userMenu && userDropdownMenu) {
                    userMenu.addEventListener('click', function(e) {
                        e.stopPropagation();
                        closeLanguageSelectors();
                        
                        const isVisible = userDropdownMenu.style.visibility === 'visible';
                        if (isVisible) {
                            closeUserMenu();
                        } else {
                            openUserMenu();
                        }
                    });
                    
                    userDropdownMenu.addEventListener('click', function(e) {
                        e.stopPropagation();
                    });
                }

                // ⚠️ SÓ SINCRONIZAR DEPOIS QUE TUDO ESTIVER CARREGADO
                setTimeout(() => syncWithDetectedLanguage(), 500);
                
            }, 100);
        })
        .catch(error => {
            console.error('Error loading navbar:', error);
        });
}

// Load footer from external file
function loadFooter() {
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-container').innerHTML = data;
        })
        .catch(error => {
            console.error('Error loading footer:', error);
        });
}

// Funções para o menu do usuário
function openUserMenu() {
    const userDropdownMenu = document.querySelector('.user-dropdown-menu');
    if (userDropdownMenu) {
        userDropdownMenu.style.opacity = '1';
        userDropdownMenu.style.visibility = 'visible';
        userDropdownMenu.style.transform = 'translateY(0)';
    }
}

function closeUserMenu() {
    const userDropdownMenu = document.querySelector('.user-dropdown-menu');
    if (userDropdownMenu) {
        userDropdownMenu.style.opacity = '0';
        userDropdownMenu.style.visibility = 'hidden';
        userDropdownMenu.style.transform = 'translateY(10px)';
    }
}

// Função para obter o idioma nativo selecionado
function getSelectedNativeLanguage() {
    const selectedOption = document.querySelector('#user-language-options li.selected');
    return selectedOption ? selectedOption.getAttribute('data-value') : 'pt';
}

// Função para notificar mudança de idioma nativo
function notifyNativeLanguageChange(langCode) {
    document.dispatchEvent(new CustomEvent('nativeLanguageChanged', {
        detail: { language: langCode }
    }));
    
    // Também disparar evento para o app.js
    document.dispatchEvent(new CustomEvent('translationLanguageChanged', {
        detail: { language: langCode }
    }));
}

// Sincronizar com idioma detectado
async function syncWithDetectedLanguage() {
    try {
        // Aguarda a detecção automática completar
        const detectedLanguage = await languageDetector.detectLanguage();
        applyLanguageToUI(detectedLanguage);
        
    } catch (error) {
        console.error("Error syncing with detected language:", error);
        applyLanguageToUI('pt'); // Fallback
    }
}

function applyLanguageToUI(langCode) {
    const userOptions = document.getElementById('user-language-options');
    if (userOptions) {
        const targetOption = userOptions.querySelector(`li[data-value="${langCode}"]`);
        
        if (targetOption) {
            // Remover seleção atual
            userOptions.querySelectorAll('li').forEach(li => {
                li.classList.remove('selected');
            });
            
            // Selecionar idioma detectado
            targetOption.classList.add('selected');
            
            // Atualizar a bandeira exibida
            const selectedLanguage = document.getElementById('user-language');
            const flagImg = selectedLanguage.querySelector('img');
            if (flagImg) {
                const flag = targetOption.getAttribute('data-flag');
                flagImg.src = `assets/images/flags/${flag}.svg`;
                flagImg.alt = langCode.toUpperCase();
            }
            
            console.log("UI sincronizada com idioma detectado:", langCode);
        }
    }
}

// Funções do menu do usuário
function viewProfile() {
    console.log('Abrindo perfil do usuário');
    alert('Abrindo perfil do usuário');
    closeUserMenu();
}

function openSettings() {
    console.log('Abrindo configurações');
    alert('Abrindo configurações');
    closeUserMenu();
}

// Logout function
function logout() {
    console.log('Efetuando logout');
    alert('Logout realizado com sucesso!');
    closeUserMenu();
    // Em uma aplicação real, redirecionar para a página de login:
    // window.location.href = 'login.html';
}

// Inicializar tooltips
function initTooltips() {
    const tooltipElements = document.querySelectorAll('.icon-tooltip');
    
    tooltipElements.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', function() {
            const tooltipText = this.querySelector('.tooltip-text');
            if (tooltipText) {
                tooltipText.style.visibility = 'visible';
                tooltipText.style.opacity = '1';
            }
        });
        
        tooltip.addEventListener('mouseleave', function() {
            const tooltipText = this.querySelector('.tooltip-text');
            if (tooltipText) {
                tooltipText.style.visibility = 'hidden';
                tooltipText.style.opacity = '0';
            }
        });
    });
}