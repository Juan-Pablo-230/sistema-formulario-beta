// ============================================
// clasesYT.js - Versión con inactividad SOLO por cambio/cierre de pestaña
// ============================================

console.log('🎥 clasesYT.js cargado - Inactividad solo por cambio/cierre de pestaña');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    VIDEO_ID: 'cb12KmMMDJA',
    DISPLAY_UPDATE_INTERVAL: 1000,
    SAVE_INTERVAL: 30000, // Guardar cada 30 segundos mientras está activo
    MAX_MENSAJES: 50
};

// ============================================
// CLASE TimeTracker - NUEVA VERSIÓN
// ============================================
class TimeTracker {
    constructor() {
        this.startTime = Date.now();
        this.totalActiveTime = 0;
        this.isTracking = false;
        this.lastSaveTime = Date.now();
        
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
        
        // Evento para cuando la página deja de ser visible (cambio de pestaña)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleTabChange(false); // Salió de la pestaña -> INACTIVO
            } else {
                this.handleTabChange(true); // Volvió a la pestaña -> ACTIVO
            }
        });

        // Evento para cuando se cierra la página
        window.addEventListener('beforeunload', () => {
            this.handlePageClose();
        });

        // Iniciar tracking
        this.resumeTracking();
        
        // Actualizar display cada segundo
        setInterval(() => this.updateDisplay(), CONFIG.DISPLAY_UPDATE_INTERVAL);
        
        // Guardar automáticamente cada 30 segundos mientras está activo
        setInterval(() => {
            if (this.isTracking) {
                this.saveCurrentTime(false);
            }
        }, CONFIG.SAVE_INTERVAL);
        
        console.log('✅ TimeTracker inicializado');
    }

    /**
     * Maneja cambio de visibilidad de la pestaña
     * @param {boolean} isVisible - true si la pestaña es visible, false si está oculta
     */
    handleTabChange(isVisible) {
        if (isVisible) {
            console.log('👁️ Pestaña visible - REANUDANDO tracking (ACTIVO)');
            this.resumeTracking();
        } else {
            console.log('👁️ Pestaña oculta - DETENIENDO tracking (INACTIVO)');
            this.stopTracking(true); // true = es inactivo por cambio de pestaña
        }
    }

    /**
     * Maneja el cierre de la página
     */
    handlePageClose() {
        console.log('🚪 Cerrando página - Guardando como INACTIVO');
        this.saveCurrentTime(true); // true = es final (inactivo)
    }

    /**
     * Reanuda el tracking (ACTIVO)
     */
    resumeTracking() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.startTime = Date.now();
        console.log('▶️ Tracking ACTIVO reanudado');
    }

    /**
     * Detiene el tracking y guarda como INACTIVO
     * @param {boolean} esInactivo - true si es por inactividad (cambio/cierre de pestaña)
     */
    stopTracking(esInactivo = false) {
        if (!this.isTracking) return;
        
        this.isTracking = false;
        this.saveCurrentTime(esInactivo);
        console.log(`⏸️ Tracking detenido - ${esInactivo ? 'INACTIVO' : 'pausa temporal'}`);
    }

    /**
     * Guarda el tiempo actual
     * @param {boolean} esInactivo - true si es un registro de inactividad
     */
    saveCurrentTime(esInactivo = false) {
        const now = Date.now();
        const tiempoTranscurrido = now - this.startTime;
        
        // Solo acumulamos tiempo si estábamos en estado activo
        if (this.isTracking) {
            this.totalActiveTime += tiempoTranscurrido;
        }
        
        this.startTime = now;
        this.updateDisplay();
        
        // Guardar en servidor
        this.saveToServer(esInactivo);
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

    /**
     * Guarda el tiempo en el servidor
     * @param {boolean} esInactivo - true si es un registro de inactividad
     */
    async saveToServer(esInactivo = false) {
        // Verificar si el usuario está logueado
        if (!isLoggedInSafe()) return;
        
        const user = getCurrentUserSafe();
        const seconds = this.getCurrentTime();
        
        // Determinar el tipo de registro:
        // - activo = true: el usuario está viendo la clase activamente
        // - activo = false: el usuario cambió de pestaña o cerró el navegador
        const activo = !esInactivo;
        
        console.log(`⏱️ Guardando: ${seconds}s - ${activo ? 'ACTIVO' : 'INACTIVO'}`);
        
        try {
            const result = await makeRequestSafe('/tiempo-clase/guardar', {
                claseId: this.claseId,
                claseNombre: this.claseNombre,
                tiempoSegundos: seconds,
                esFinal: esInactivo,
                activo: activo // ¡NUEVO! Enviamos explícitamente el estado
            });
            
            if (result.success) {
                console.log(`✅ Tiempo guardado en MongoDB (${activo ? 'ACTIVO' : 'INACTIVO'})`);
                
                // Si es inactivo, mostramos un mensaje
                if (esInactivo) {
                    this.showMessage('⏸️ Sesión pausada - Has cambiado de pestaña', 'info');
                }
            }
        } catch (error) {
            console.error('❌ Error guardando tiempo:', error);
            this.saveToLocalStorage(seconds, activo);
        }
    }

    saveToLocalStorage(seconds, activo) {
        const user = getCurrentUserSafe();
        if (!user) return;
        
        const key = `tiempo_backup_${user._id}_${this.claseId}`;
        const backup = {
            usuarioId: user._id,
            claseId: this.claseId,
            claseNombre: this.claseNombre,
            tiempo: seconds,
            activo: activo,
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
// CLASE ChatReal (sin cambios)
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
        
        const domain = window.location.hostname;
        console.log('🌐 Dominio detectado:', domain);
        
        const chatUrl = `https://www.youtube.com/live_chat?v=${CONFIG.VIDEO_ID}&embed_domain=${domain}`;
        
        if (this.chatIframe) {
            this.chatIframe.setAttribute('allow', 'autoplay; encrypted-media; clipboard-write');
            this.chatIframe.src = chatUrl;
            this.chatIframe.addEventListener('load', () => this.handleLoad());
            this.chatIframe.addEventListener('error', () => this.handleError());
        }
        
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
        try {
            if (this.chatIframe && this.chatIframe.contentDocument) {
                console.log('✅ Chat accesible');
            }
        } catch (e) {
            console.log('✅ Chat cargado (con restricciones CORS normales)');
        }
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
    console.log('🚀 Inicializando página con nueva lógica de inactividad...');
    
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
    estado: () => window.timeTracker?.isTracking ? 'ACTIVO' : 'INACTIVO',
    chat: () => window.chatReal,
    user: () => getCurrentUserSafe()
};

console.log('🎯 Funciones de debug disponibles:');
console.log('   debug.tiempo() - Muestra tiempo actual');
console.log('   debug.reset() - Reinicia contador');
console.log('   debug.estado() - Muestra ACTIVO/INACTIVO');
console.log('   debug.user() - Muestra info del usuario');