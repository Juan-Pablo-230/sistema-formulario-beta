// ============================================
// clasesYT.js - Versión con CHAT REAL de YouTube y MongoDB
// ============================================

console.log('🎥 clasesYT.js cargado - Modo CHAT REAL con MongoDB');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    VIDEO_ID: 'cb12KmMMDJA',
    INACTIVITY_LIMIT: 5000,
    DISPLAY_UPDATE_INTERVAL: 1000,
    SAVE_INTERVAL: 30000,
    MAX_MENSAJES: 50
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
// CLASE TimeTracker - Con guardado en MongoDB
// ============================================
class TimeTracker {
    constructor() {
        this.startTime = Date.now();
        this.totalActiveTime = 0;
        this.inactivityTimer = null;
        this.isTracking = false;
        
        this.displayElement = document.getElementById('tiempoActivo');
        this.messageElement = document.getElementById('statusMessage');
        
        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        this.claseId = urlParams.get('claseId') || 'clase_stroke_iam';
        this.claseNombre = urlParams.get('clase') || 'Stroke / IAM';
        
        this.init();
    }

    init() {
        console.log('⏱️ Inicializando TimeTracker...');
        console.log(`📚 Clase: ${this.claseNombre} (${this.claseId})`);
        
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
        
        // Guardar en servidor cada 30 segundos o al final
        if (isFinal || this.totalActiveTime % 30000 < 1000) {
            this.saveToServer(isFinal);
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

    async saveToServer(isFinal = false) {
        // Verificar si el usuario está logueado
        if (!isLoggedInSafe()) return;
        
        const user = getCurrentUserSafe();
        const seconds = this.getCurrentTime();
        
        console.log(`⏱️ ${isFinal ? 'FINAL - ' : ''}Guardando tiempo:`, seconds, 'segundos');
        
        try {
            const result = await makeRequestSafe('/tiempo-clase/guardar', {
                claseId: this.claseId,
                claseNombre: this.claseNombre,
                tiempoSegundos: seconds,
                esFinal: isFinal
            });
            
            if (result.success) {
                console.log('✅ Tiempo guardado en MongoDB');
                if (isFinal) {
                    this.showMessage('✅ Tiempo total registrado', 'success');
                }
            }
        } catch (error) {
            console.error('❌ Error guardando tiempo:', error);
            // Backup en localStorage
            this.saveToLocalStorage(seconds);
        }
    }

    saveToLocalStorage(seconds) {
        const user = getCurrentUserSafe();
        if (!user) return;
        
        const key = `tiempo_backup_${user._id}_${this.claseId}`;
        const backup = {
            usuarioId: user._id,
            claseId: this.claseId,
            claseNombre: this.claseNombre,
            tiempo: seconds,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(key, JSON.stringify(backup));
        console.log('💾 Backup guardado en localStorage');
    }

    showMessage(text, type = 'success') {
        if (!this.messageElement) return;
        
        this.messageElement.textContent = text;
        this.messageElement.className = `status-message ${type}`;
        this.messageElement.style.display = 'block';
        
        setTimeout(() => {
            this.messageElement.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                this.messageElement.style.display = 'none';
                this.messageElement.style.animation = '';
            }, 300);
        }, 3000);
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
    console.log('🚀 Inicializando página con CHAT REAL y MongoDB...');
    
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
        
        // Inicializar componentes
        window.timeTracker = new TimeTracker();
        window.chatReal = new ChatReal();
        
        hideLoading();
        
        // Mostrar mensaje de bienvenida
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
window.debug = {
    tiempo: () => window.timeTracker?.getCurrentTime(),
    reset: () => window.timeTracker?.resetCounter(),
    chat: () => window.chatReal,
    user: () => getCurrentUserSafe()
};

console.log('🎯 Funciones de debug disponibles:');
console.log('   debug.tiempo() - Muestra tiempo actual');
console.log('   debug.reset() - Reinicia contador');
console.log('   debug.user() - Muestra info del usuario');