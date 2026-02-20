// ============================================
// clasesYT.js - Versión con CHAT REAL de YouTube
// ============================================

console.log('🎥 clasesYT.js cargado - Modo CHAT REAL');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    VIDEO_ID: 'cb12KmMMDJA',
    INACTIVITY_LIMIT: 5000,
    DISPLAY_UPDATE_INTERVAL: 1000,
    SAVE_INTERVAL: 30000
};

// ============================================
// CLASE ChatReal - Maneja el iframe de YouTube
// ============================================
class ChatReal {
    constructor() {
        this.chatIframe = document.getElementById('chatIframe');
        this.chatContainer = document.getElementById('chatContainer');
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.init();
    }

    init() {
        console.log('💬 Inicializando Chat REAL de YouTube...');
        
        // Obtener el dominio actual (funciona en localhost y producción)
        const domain = window.location.hostname;
        
        // IMPORTANTE: Para pruebas locales, usar localhost
        // Para producción, usar el dominio real
        console.log('🌐 Dominio detectado:', domain);
        
        // Construir URL del chat con el dominio correcto
        const chatUrl = `https://www.youtube.com/live_chat?v=${CONFIG.VIDEO_ID}&embed_domain=${domain}`;
        
        console.log('🔗 URL del chat:', chatUrl);
        
        // Configurar el iframe
        if (this.chatIframe) {
            // Agregar atributos necesarios
            this.chatIframe.setAttribute('allow', 'autoplay; encrypted-media; clipboard-write');
            
            // Establecer la URL
            this.chatIframe.src = chatUrl;
            
            // Escuchar eventos
            this.chatIframe.addEventListener('load', () => this.handleLoad());
            this.chatIframe.addEventListener('error', () => this.handleError());
        }
        
        // Verificar después de 5 segundos
        setTimeout(() => this.checkStatus(), 5000);
    }

    handleLoad() {
        console.log('✅ Chat cargado correctamente');
        this.retryCount = 0;
    }

    handleError() {
        this.retryCount++;
        console.warn(`⚠️ Error en chat (intento ${this.retryCount}/${this.maxRetries})`);
        
        if (this.retryCount <= this.maxRetries) {
            // Reintentar después de 2 segundos
            setTimeout(() => {
                if (this.chatIframe) {
                    this.chatIframe.src = this.chatIframe.src;
                }
            }, 2000);
        } else {
            this.showErrorMessage();
        }
    }

    showErrorMessage() {
        if (!this.chatContainer) return;
        
        this.chatContainer.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 400px;
                padding: 30px;
                text-align: center;
                background: #1a1f25;
            ">
                <div style="font-size: 3em; margin-bottom: 20px;">💬</div>
                <h3 style="color: #e0e0e0; margin-bottom: 15px;">
                    Chat de YouTube
                </h3>
                <p style="color: #888; margin-bottom: 25px; max-width: 400px;">
                    Para participar en el chat, abre YouTube en una nueva pestaña
                </p>
                <a href="https://www.youtube.com/live_chat?v=${CONFIG.VIDEO_ID}" 
                   target="_blank"
                   style="
                        padding: 12px 25px;
                        background: #4285f4;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                   ">
                    <span>💬</span>
                    Abrir Chat en YouTube
                </a>
                <p style="color: #666; margin-top: 20px; font-size: 0.85em;">
                    Necesitas iniciar sesión en YouTube para participar
                </p>
            </div>
        `;
    }

    checkStatus() {
        // Verificar si el chat se cargó
        try {
            if (this.chatIframe && this.chatIframe.contentDocument) {
                console.log('✅ Chat accesible');
            }
        } catch (e) {
            // Error de CORS esperado - significa que el iframe cargó correctamente
            console.log('✅ Chat cargado (con restricciones CORS normales)');
        }
    }
}

// ============================================
// CLASE TimeTracker (sin cambios)
// ============================================
class TimeTracker {
    constructor() {
        this.startTime = Date.now();
        this.totalActiveTime = 0;
        this.inactivityTimer = null;
        this.isTracking = false;
        
        this.displayElement = document.getElementById('tiempoActivo');
        this.messageElement = document.getElementById('statusMessage');
        
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
                this.stopTracking();
            } else {
                this.resumeTracking();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.saveCurrentTime(true);
        });

        this.resumeTracking();
        setInterval(() => this.updateDisplay(), CONFIG.DISPLAY_UPDATE_INTERVAL);
        
        console.log('✅ TimeTracker inicializado');
    }

    handleUserActivity() {
        if (!this.isTracking) return;
        
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        this.inactivityTimer = setTimeout(() => {
            this.saveCurrentTime();
        }, CONFIG.INACTIVITY_LIMIT);
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
}

// ============================================
// INICIALIZACIÓN
// ============================================

async function inicializarPagina() {
    console.log('🚀 Inicializando página con CHAT REAL...');
    
    try {
        await waitForAuthSystem();
        
        if (!isLoggedInSafe()) {
            try {
                await authSystem.showLoginModal();
            } catch (error) {
                window.location.href = '/index.html';
                return;
            }
        }
        
        // Actualizar información del usuario
        const user = getCurrentUserSafe();
        if (user) {
            document.getElementById('nombreUsuario').textContent = user.apellidoNombre || 'Usuario';
            document.getElementById('legajoUsuario').textContent = user.legajo || '-';
            document.getElementById('turnoUsuario').textContent = user.turno || '-';
        }
        
        // Inicializar componentes
        window.timeTracker = new TimeTracker();
        window.chatReal = new ChatReal();
        
        console.log('✅ Página inicializada');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Iniciar
document.addEventListener('DOMContentLoaded', inicializarPagina);

// Debug
window.debug = {
    tiempo: () => window.timeTracker?.getCurrentTime(),
    chat: () => window.chatReal
};