// ============================================
// clasesYT.js - Versión con manejo de errores del chat
// ============================================

console.log('🎥 clasesYT.js cargado - Transmisión: Stroke/IAM');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    VIDEO_ID: 'cb12KmMMDJA',
    DOMAIN: window.location.hostname,
    INACTIVITY_LIMIT: 5000,
    DISPLAY_UPDATE_INTERVAL: 1000,
    SAVE_INTERVAL: 30000
};

// ============================================
// CLASE ChatManager - Maneja específicamente el chat
// ============================================
class ChatManager {
    constructor() {
        this.chatIframe = document.getElementById('chatIframe');
        this.chatContainer = document.getElementById('chatContainer');
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.init();
    }

    init() {
        if (!this.chatIframe) return;
        
        // Detectar si estamos en localhost
        this.isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
        
        console.log('🌐 Dominio detectado:', window.location.hostname);
        console.log('🏠 Es localhost:', this.isLocalhost);
        
        // Configurar el iframe según el entorno
        this.setupChatIframe();
        
        // Escuchar errores del iframe
        this.chatIframe.addEventListener('error', () => this.handleChatError());
        
        // Intentar recargar si falla
        setTimeout(() => this.checkChatLoaded(), 5000);
    }

    setupChatIframe() {
        if (this.isLocalhost) {
            // Para localhost: usar una versión alternativa
            console.log('🔄 Localhost detectado - Usando modo alternativo');
            this.setupLocalhostChat();
        } else {
            // Para producción: configurar normalmente
            const chatSrc = `https://www.youtube.com/live_chat?v=${CONFIG.VIDEO_ID}&embed_domain=${CONFIG.DOMAIN}`;
            this.chatIframe.src = chatSrc;
        }
    }

    setupLocalhostChat() {
        // Opción A: Intentar con el dominio actual (puede fallar)
        const chatSrc = `https://www.youtube.com/live_chat?v=${CONFIG.VIDEO_ID}&embed_domain=${CONFIG.DOMAIN}`;
        
        // Opción B: Usar sandbox para más permisos
        this.chatIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
        
        // Intentar cargar
        this.chatIframe.src = chatSrc;
        
        // Mostrar mensaje informativo
        this.showLocalhostMessage();
    }

    showLocalhostMessage() {
        const msg = document.getElementById('statusMessage');
        if (msg) {
            msg.innerHTML = `
                ⚠️ Modo desarrollo: El chat de YouTube puede no cargar en localhost.<br>
                Para probar el chat, usa ngrok o despliega en Railway.
            `;
            msg.className = 'status-message info';
            msg.style.display = 'block';
            msg.style.whiteSpace = 'pre-line';
            msg.style.padding = '15px 20px';
            msg.style.lineHeight = '1.5';
        }
    }

    handleChatError() {
        this.retryCount++;
        console.warn(`⚠️ Error en chat (intento ${this.retryCount}/${this.maxRetries})`);
        
        if (this.retryCount <= this.maxRetries) {
            // Reintentar con un pequeño retraso
            setTimeout(() => {
                this.chatIframe.src = this.chatIframe.src;
            }, 2000 * this.retryCount);
        } else {
            this.showChatErrorMessage();
        }
    }

    showChatErrorMessage() {
        const container = this.chatContainer;
        if (!container) return;
        
        // Reemplazar el iframe con un mensaje amigable
        container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 400px;
                padding: 30px;
                text-align: center;
                background: var(--bg-card);
                border-radius: 10px;
            ">
                <div style="font-size: 4em; margin-bottom: 20px;">💬</div>
                <h3 style="color: var(--text-primary); margin-bottom: 15px;">
                    Chat no disponible en modo desarrollo
                </h3>
                <p style="color: var(--text-secondary); margin-bottom: 25px; max-width: 400px;">
                    YouTube bloquea el chat cuando se accede desde localhost por seguridad.
                </p>
                <div style="
                    background: var(--bg-container);
                    padding: 20px;
                    border-radius: 10px;
                    border-left: 4px solid var(--accent-color);
                    text-align: left;
                    max-width: 400px;
                ">
                    <p style="color: var(--text-primary); font-weight: bold; margin-bottom: 10px;">
                        🔧 Para probar el chat:
                    </p>
                    <ol style="color: var(--text-secondary); margin-left: 20px; line-height: 1.8;">
                        <li>Usa <strong>ngrok</strong> para crear un dominio público</li>
                        <li>O despliega en <strong>Railway</strong> (tu entorno actual)</li>
                        <li>El chat funciona perfectamente en producción</li>
                    </ol>
                </div>
                <a href="https://ngrok.com/" target="_blank" 
                   style="
                        margin-top: 30px;
                        padding: 12px 25px;
                        background: var(--accent-color);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                   "
                   onmouseover="this.style.transform='translateY(-2px)'"
                   onmouseout="this.style.transform='translateY(0)'">
                    🔗 Conocer más sobre ngrok
                </a>
            </div>
        `;
    }

    checkChatLoaded() {
        // Verificar si el chat cargó correctamente
        try {
            const iframeDoc = this.chatIframe.contentDocument || this.chatIframe.contentWindow?.document;
            if (!iframeDoc) {
                // No se pudo acceder al documento (error de CORS)
                this.handleChatError();
            }
        } catch (e) {
            // Error de CORS esperado, pero significa que el iframe cargó
            console.log('✅ Chat cargado (con restricciones CORS normales)');
        }
    }
}

// ============================================
// CLASE TimeTracker (adaptada)
// ============================================
class TimeTracker {
    constructor() {
        this.startTime = Date.now();
        this.totalActiveTime = 0;
        this.inactivityTimer = null;
        this.isTracking = false;
        
        this.displayElement = document.getElementById('tiempoActivo');
        this.messageElement = document.getElementById('statusMessage');
        
        this.claseId = this.getClaseIdFromURL() || 'stroke_iam_2026';
        
        this.init();
    }

    init() {
        console.log('⏱️ Inicializando TimeTracker...');
        
        const activityEvents = [
            'mousemove', 'keydown', 'scroll', 
            'click', 'touchstart', 'touchmove'
        ];
        
        activityEvents.forEach(eventType => {
            document.addEventListener(eventType, () => this.handleUserActivity());
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleVisibilityChange(false);
            } else {
                this.handleVisibilityChange(true);
            }
        });

        window.addEventListener('beforeunload', () => {
            this.handleBeforeUnload();
        });

        this.resumeTracking();
        
        setInterval(() => this.updateDisplay(), CONFIG.DISPLAY_UPDATE_INTERVAL);
        setInterval(() => this.autoSave(), CONFIG.SAVE_INTERVAL);
        
        console.log('✅ TimeTracker inicializado');
    }

    handleUserActivity() {
        if (!this.isTracking) return;
        
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        this.inactivityTimer = setTimeout(() => {
            this.handleInactivity();
        }, CONFIG.INACTIVITY_LIMIT);
    }

    handleInactivity() {
        console.log('⏸️ Usuario inactivo, guardando tiempo...');
        this.saveCurrentTime();
    }

    handleVisibilityChange(isVisible) {
        if (isVisible) {
            console.log('👁️ Página visible, reanudando tracking...');
            this.resumeTracking();
        } else {
            console.log('👁️ Página oculta, pausando tracking...');
            this.stopTracking();
        }
    }

    handleBeforeUnload() {
        console.log('🚪 Cerrando página, guardando tiempo final...');
        this.saveCurrentTime(true);
    }

    stopTracking() {
        if (!this.isTracking) return;
        
        this.isTracking = false;
        this.saveCurrentTime();
        
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }

    resumeTracking() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.startTime = Date.now();
        this.handleUserActivity();
    }

    saveCurrentTime(isFinal = false) {
        const now = Date.now();
        this.totalActiveTime += (now - this.startTime);
        this.startTime = now;
        
        this.updateDisplay();
        
        if (isFinal) {
            this.saveToServer(true);
        } else {
            if (this.totalActiveTime % 10000 < 1000) {
                this.saveToServer();
            }
        }
    }

    updateDisplay() {
        if (!this.displayElement) return;
        
        const currentTotal = this.totalActiveTime + 
            (this.isTracking ? (Date.now() - this.startTime) : 0);
        const seconds = Math.floor(currentTotal / 1000);
        
        this.displayElement.textContent = seconds;
    }

    getCurrentTime() {
        const total = this.totalActiveTime + 
            (this.isTracking ? (Date.now() - this.startTime) : 0);
        return Math.floor(total / 1000);
    }

    autoSave() {
        if (this.getCurrentTime() > 0) {
            console.log('💾 Auto-guardando tiempo:', this.getCurrentTime(), 'segundos');
            this.saveToServer();
        }
    }

    async saveToServer(isFinal = false) {
        if (!isLoggedInSafe()) return;
        
        const user = getCurrentUserSafe();
        const seconds = this.getCurrentTime();
        
        console.log(`⏱️ ${isFinal ? 'FINAL - ' : ''}Tiempo activo:`, seconds, 'segundos');
        
        // Aquí implementarás el guardado en MongoDB
    }

    resetCounter() {
        this.totalActiveTime = 0;
        this.startTime = Date.now();
        this.updateDisplay();
        console.log('🔄 Contador reiniciado');
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function showLoading(message = 'Cargando...') {
    const existingOverlay = document.querySelector('.loading-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div style="text-align: center; color: white;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 20px; font-size: 1.1em;">${message}</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => overlay.remove(), 300);
    }
}

function updateUserInfo() {
    if (!isLoggedInSafe()) return;
    
    const user = getCurrentUserSafe();
    if (!user) return;
    
    const nombreEl = document.getElementById('nombreUsuario');
    const legajoEl = document.getElementById('legajoUsuario');
    const turnoEl = document.getElementById('turnoUsuario');
    
    if (nombreEl) {
        nombreEl.textContent = user.apellidoNombre || 'Usuario';
        
        if (user.role === 'admin') {
            nombreEl.innerHTML += ' <span style="background:rgba(102,126,234,0.3); padding:2px 8px; border-radius:12px; font-size:0.8em; margin-left:8px;">👑 Admin</span>';
        } else if (user.role === 'advanced') {
            nombreEl.innerHTML += ' <span style="background:rgba(240,147,251,0.3); padding:2px 8px; border-radius:12px; font-size:0.8em; margin-left:8px;">⭐ Avanzado</span>';
        }
    }
    
    if (legajoEl) legajoEl.textContent = user.legajo || '-';
    if (turnoEl) turnoEl.textContent = user.turno || '-';
}

function setupURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const claseParam = urlParams.get('clase');
    if (claseParam) {
        const tituloEl = document.getElementById('tituloClase');
        if (tituloEl) {
            tituloEl.textContent = decodeURIComponent(claseParam);
        }
    }
}

// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

async function inicializarPagina() {
    console.log('🚀 Inicializando página de clase en vivo...');
    
    showLoading('Verificando acceso...');
    
    try {
        setupURLParams();
        
        await waitForAuthSystem();
        
        if (!isLoggedInSafe()) {
            console.log('🔐 Usuario no logueado, mostrando modal...');
            hideLoading();
            
            try {
                await authSystem.showLoginModal();
            } catch (error) {
                console.log('❌ Usuario canceló el login');
                window.location.href = '/index.html';
                return;
            }
            
            showLoading('Cargando clase...');
        }
        
        updateUserInfo();
        
        // Inicializar el tracker de tiempo
        window.timeTracker = new TimeTracker();
        
        // Inicializar el gestor de chat
        window.chatManager = new ChatManager();
        
        hideLoading();
        
        const msg = document.getElementById('statusMessage');
        if (msg) {
            msg.textContent = '✅ Clase iniciada correctamente';
            msg.className = 'status-message success';
            msg.style.display = 'block';
            
            setTimeout(() => {
                msg.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => {
                    msg.style.display = 'none';
                    msg.style.animation = '';
                }, 300);
            }, 3000);
        }
        
        console.log('✅ Página de clase inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        
        hideLoading();
        
        const msg = document.getElementById('statusMessage');
        if (msg) {
            msg.textContent = '❌ Error al cargar la página: ' + error.message;
            msg.className = 'status-message error';
            msg.style.display = 'block';
            
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 3000);
        }
    }
}

// Iniciar
document.addEventListener('DOMContentLoaded', inicializarPagina);

// Funciones de debug
window.debugClase = {
    tiempo: () => window.timeTracker?.getCurrentTime() ?? 'No inicializado',
    reset: () => window.timeTracker?.resetCounter(),
    chat: () => console.log('💬 ChatManager:', window.chatManager),
    localhost: () => console.log('🏠 Es localhost:', window.location.hostname === 'localhost')
};