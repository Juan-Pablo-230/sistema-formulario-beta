// ============================================
// clasesYT.js - Lógica para la página de clases en vivo
// ============================================

console.log('🎥 clasesYT.js cargado - Versión 1.0');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    // IMPORTANTE: Reemplaza con tu ID de video
    VIDEO_ID: 'ID_DEL_VIDEO', // Ej: 'abc123xyz'
    
    // IMPORTANTE: Reemplaza con tu dominio
    DOMAIN: window.location.hostname, // Automático: toma el dominio actual
    
    // Tiempo de inactividad en milisegundos (5 segundos)
    INACTIVITY_LIMIT: 5000,
    
    // Intervalo de actualización del display (1 segundo)
    DISPLAY_UPDATE_INTERVAL: 1000,
    
    // Intervalo para guardar en servidor (30 segundos)
    SAVE_INTERVAL: 30000
};

// ============================================
// CLASE PRINCIPAL: TimeTracker
// ============================================
class TimeTracker {
    constructor() {
        // Variables de tiempo
        this.startTime = Date.now();
        this.totalActiveTime = 0;
        this.inactivityTimer = null;
        this.isTracking = false;
        
        // Elementos del DOM
        this.displayElement = document.getElementById('tiempoActivo');
        this.messageElement = document.getElementById('statusMessage');
        this.videoIframe = document.getElementById('videoIframe');
        this.chatIframe = document.getElementById('chatIframe');
        
        // ID de la clase (para guardar en BD)
        this.claseId = this.getClaseIdFromURL();
        
        // Callbacks
        this.onTimeUpdate = null;
        this.onInactivityStart = null;
        this.onInactivityEnd = null;
        
        this.init();
    }

    /**
     * Inicializa el tracker
     */
    init() {
        console.log('⏱️ Inicializando TimeTracker...');
        
        // Configurar iframes con los parámetros correctos
        this.configurarIframes();
        
        // Eventos que consideramos "actividad"
        const activityEvents = [
            'mousemove', 'keydown', 'scroll', 
            'click', 'touchstart', 'touchmove'
        ];
        
        activityEvents.forEach(eventType => {
            document.addEventListener(eventType, () => this.handleUserActivity());
        });

        // Cuando la página deja de ser visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleVisibilityChange(false);
            } else {
                this.handleVisibilityChange(true);
            }
        });

        // Cuando se cierra la página
        window.addEventListener('beforeunload', () => {
            this.handleBeforeUnload();
        });

        // Iniciar tracking
        this.resumeTracking();
        
        // Actualizar display cada segundo
        setInterval(() => this.updateDisplay(), CONFIG.DISPLAY_UPDATE_INTERVAL);
        
        // Guardar en servidor cada 30 segundos (si hay cambios)
        setInterval(() => this.autoSave(), CONFIG.SAVE_INTERVAL);
        
        console.log('✅ TimeTracker inicializado');
    }

    /**
     * Configura los iframes con los IDs correctos
     */
    configurarIframes() {
        // Video iframe
        if (this.videoIframe) {
            const videoSrc = `https://www.youtube.com/embed/${CONFIG.VIDEO_ID}?autoplay=1&rel=0`;
            if (this.videoIframe.src !== videoSrc) {
                this.videoIframe.src = videoSrc;
                console.log('🎬 Video configurado:', videoSrc);
            }
        }
        
        // Chat iframe
        if (this.chatIframe) {
            const chatSrc = `https://www.youtube.com/live_chat?v=${CONFIG.VIDEO_ID}&embed_domain=${CONFIG.DOMAIN}`;
            if (this.chatIframe.src !== chatSrc) {
                this.chatIframe.src = chatSrc;
                console.log('💬 Chat configurado:', chatSrc);
            }
        }
    }

    /**
     * Obtiene el ID de la clase desde la URL (opcional)
     */
    getClaseIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('claseId') || 'clase_default';
    }

    /**
     * Maneja la actividad del usuario
     */
    handleUserActivity() {
        if (!this.isTracking) return;
        
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        this.inactivityTimer = setTimeout(() => {
            this.handleInactivity();
        }, CONFIG.INACTIVITY_LIMIT);
    }

    /**
     * Maneja cuando el usuario está inactivo
     */
    handleInactivity() {
        console.log('⏸️ Usuario inactivo, guardando tiempo...');
        this.saveCurrentTime();
        
        if (this.onInactivityStart) {
            this.onInactivityStart(this.getCurrentTime());
        }
    }

    /**
     * Maneja cambio de visibilidad de la página
     */
    handleVisibilityChange(isVisible) {
        if (isVisible) {
            console.log('👁️ Página visible, reanudando tracking...');
            this.resumeTracking();
            if (this.onInactivityEnd) {
                this.onInactivityEnd(this.getCurrentTime());
            }
        } else {
            console.log('👁️ Página oculta, pausando tracking...');
            this.stopTracking();
            if (this.onInactivityStart) {
                this.onInactivityStart(this.getCurrentTime());
            }
        }
    }

    /**
     * Maneja antes de cerrar la página
     */
    handleBeforeUnload() {
        console.log('🚪 Cerrando página, guardando tiempo final...');
        this.saveCurrentTime(true);
    }

    /**
     * Pausa el tracking
     */
    stopTracking() {
        if (!this.isTracking) return;
        
        this.isTracking = false;
        this.saveCurrentTime();
        
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }

    /**
     * Reanuda el tracking
     */
    resumeTracking() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.startTime = Date.now();
        this.handleUserActivity(); // Reinicia el timer de inactividad
    }

    /**
     * Guarda el tiempo acumulado actual
     */
    saveCurrentTime(isFinal = false) {
        const now = Date.now();
        this.totalActiveTime += (now - this.startTime);
        this.startTime = now;
        
        this.updateDisplay();
        
        if (isFinal) {
            this.saveToServer(true);
        } else {
            // Guardar solo si hay un cambio significativo
            if (this.totalActiveTime % 10000 < 1000) { // Cada ~10 segundos
                this.saveToServer();
            }
        }
    }

    /**
     * Actualiza el display del tiempo
     */
    updateDisplay() {
        if (!this.displayElement) return;
        
        const currentTotal = this.totalActiveTime + 
            (this.isTracking ? (Date.now() - this.startTime) : 0);
        const seconds = Math.floor(currentTotal / 1000);
        
        this.displayElement.textContent = seconds;
        
        // Cambiar color según el tiempo (opcional)
        if (seconds > 3600) { // Más de 1 hora
            this.displayElement.style.color = '#ff6b6b';
        } else if (seconds > 1800) { // Más de 30 minutos
            this.displayElement.style.color = '#f9ab00';
        } else {
            this.displayElement.style.color = '';
        }
    }

    /**
     * Obtiene el tiempo actual en segundos
     */
    getCurrentTime() {
        const total = this.totalActiveTime + 
            (this.isTracking ? (Date.now() - this.startTime) : 0);
        return Math.floor(total / 1000);
    }

    /**
     * Auto-guardado periódico
     */
    autoSave() {
        if (this.getCurrentTime() > 0) {
            console.log('💾 Auto-guardando tiempo:', this.getCurrentTime(), 'segundos');
            this.saveToServer();
        }
    }

    /**
     * Guarda el tiempo en el servidor
     */
    async saveToServer(isFinal = false) {
        // Verificar si el usuario está logueado
        if (!isLoggedInSafe()) return;
        
        const user = getCurrentUserSafe();
        const seconds = this.getCurrentTime();
        
        console.log(`⏱️ ${isFinal ? 'Final - ' : ''}Tiempo activo:`, seconds, 'segundos');
        
        // Aquí puedes implementar el guardado en tu backend
        // Ejemplo usando makeRequestSafe:
        /*
        try {
            const result = await makeRequestSafe('/clases/registrar-tiempo', {
                usuarioId: user._id,
                claseId: this.claseId,
                tiempoActivoSegundos: seconds,
                timestamp: new Date().toISOString(),
                esFinal: isFinal
            });
            
            if (result.success) {
                this.showMessage('⏱️ Tiempo registrado', 'success');
            }
        } catch (error) {
            console.error('❌ Error guardando tiempo:', error);
            if (isFinal) {
                // Guardar en localStorage como backup
                this.saveToLocalStorage(seconds);
            }
        }
        */
    }

    /**
     * Backup en localStorage (por si falla el servidor)
     */
    saveToLocalStorage(seconds) {
        const user = getCurrentUserSafe();
        if (!user) return;
        
        const key = `tiempo_backup_${user._id}_${this.claseId}`;
        const backup = {
            usuarioId: user._id,
            claseId: this.claseId,
            tiempo: seconds,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(key, JSON.stringify(backup));
        console.log('💾 Backup guardado en localStorage');
    }

    /**
     * Muestra un mensaje flotante
     */
    showMessage(text, type = 'success') {
        if (!this.messageElement) return;
        
        this.messageElement.textContent = text;
        this.messageElement.className = `status-message ${type}`;
        this.messageElement.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            this.messageElement.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                this.messageElement.style.display = 'none';
                this.messageElement.style.animation = '';
            }, 300);
        }, 3000);
    }

    /**
     * Resetea el contador (solo para pruebas)
     */
    resetCounter() {
        this.totalActiveTime = 0;
        this.startTime = Date.now();
        this.updateDisplay();
        console.log('🔄 Contador reiniciado');
        this.showMessage('⏱️ Contador reiniciado', 'info');
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Muestra un overlay de carga
 */
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

/**
 * Oculta el overlay de carga
 */
function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => overlay.remove(), 300);
    }
}

/**
 * Actualiza la información del usuario en la UI
 */
function updateUserInfo() {
    if (!isLoggedInSafe()) return;
    
    const user = getCurrentUserSafe();
    if (!user) return;
    
    const nombreEl = document.getElementById('nombreUsuario');
    const legajoEl = document.getElementById('legajoUsuario');
    const turnoEl = document.getElementById('turnoUsuario');
    
    if (nombreEl) {
        nombreEl.textContent = user.apellidoNombre || 'Usuario';
        
        // Agregar badge de rol
        if (user.role === 'admin') {
            nombreEl.innerHTML += ' <span class="role-badge admin" style="font-size:0.8em;">👑 Admin</span>';
        } else if (user.role === 'advanced') {
            nombreEl.innerHTML += ' <span class="role-badge advanced" style="font-size:0.8em;">⭐ Avanzado</span>';
        }
    }
    
    if (legajoEl) legajoEl.textContent = user.legajo || '-';
    if (turnoEl) turnoEl.textContent = user.turno || '-';
}

/**
 * Verifica si el usuario puede acceder a esta página
 */
function checkAccess() {
    // Por ahora, cualquier usuario logueado puede acceder
    // Si quieres restringir, puedes agregar lógica aquí
    return true;
}

/**
 * Configura los parámetros de la URL
 */
function setupURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Si hay un parámetro 'v' en la URL, usarlo como VIDEO_ID
    const videoParam = urlParams.get('v');
    if (videoParam && CONFIG.VIDEO_ID === 'ID_DEL_VIDEO') {
        CONFIG.VIDEO_ID = videoParam;
        console.log('📹 Video ID desde URL:', videoParam);
    }
    
    // Si hay un parámetro 'clase', guardarlo
    const claseParam = urlParams.get('clase');
    if (claseParam) {
        document.getElementById('tituloClase').textContent = 
            decodeURIComponent(claseParam);
    }
}

// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

/**
 * Inicializa la página
 */
async function inicializarPagina() {
    console.log('🚀 Inicializando página de clase en vivo...');
    
    showLoading('Verificando acceso...');
    
    try {
        // Configurar parámetros de URL
        setupURLParams();
        
        // Esperar a que authSystem esté disponible
        await waitForAuthSystem();
        
        // Verificar autenticación
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
        
        // Verificar acceso
        if (!checkAccess()) {
            throw new Error('No tienes permiso para acceder a esta página');
        }
        
        // Actualizar información del usuario
        updateUserInfo();
        
        // Inicializar el tracker de tiempo
        window.timeTracker = new TimeTracker();
        
        // Configurar callbacks del tracker (opcional)
        window.timeTracker.onTimeUpdate = (seconds) => {
            console.log('⏱️ Tiempo actualizado:', seconds);
        };
        
        // Ocultar loading
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

// ============================================
// EVENT LISTENERS
// ============================================

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPagina);

// Manejar errores de iframe (opcional)
window.addEventListener('error', (e) => {
    if (e.target.tagName === 'IFRAME') {
        console.warn('⚠️ Error en iframe:', e.target.src);
        
        const msg = document.getElementById('statusMessage');
        if (msg) {
            msg.textContent = '⚠️ Error cargando el chat. Recarga la página.';
            msg.className = 'status-message warning';
            msg.style.display = 'block';
            
            setTimeout(() => {
                msg.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => {
                    msg.style.display = 'none';
                    msg.style.animation = '';
                }, 300);
            }, 5000);
        }
    }
}, true);

// ============================================
// FUNCIONES DE DEBUG (accesibles desde consola)
// ============================================

/**
 * Funciones de depuración
 */
window.debugClase = {
    /**
     * Muestra el tiempo actual
     */
    tiempo: function() {
        if (window.timeTracker) {
            console.log('⏱️ Tiempo actual:', window.timeTracker.getCurrentTime(), 'segundos');
            console.log('📊 Detalles:', {
                total: window.timeTracker.totalActiveTime,
                isTracking: window.timeTracker.isTracking,
                startTime: new Date(window.timeTracker.startTime).toLocaleTimeString()
            });
        } else {
            console.log('❌ TimeTracker no inicializado');
        }
    },
    
    /**
     * Reinicia el contador (solo para pruebas)
     */
    reset: function() {
        if (window.timeTracker) {
            window.timeTracker.resetCounter();
        }
    },
    
    /**
     * Muestra la configuración actual
     */
    config: function() {
        console.log('⚙️ Configuración:', CONFIG);
        console.log('🌐 Dominio:', window.location.hostname);
        console.log('📹 Video ID:', CONFIG.VIDEO_ID);
    },
    
    /**
     * Simula inactividad (para pruebas)
     */
    simulateInactivity: function() {
        if (window.timeTracker) {
            window.timeTracker.handleInactivity();
        }
    }
};

console.log('🎯 Funciones de debug disponibles:');
console.log('   debugClase.tiempo() - Muestra tiempo actual');
console.log('   debugClase.reset() - Reinicia contador');
console.log('   debugClase.config() - Muestra configuración');
console.log('   debugClase.simulateInactivity() - Simula inactividad');