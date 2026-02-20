// ============================================
// clasesYT.js - Versión CORREGIDA con acumulación de tiempo
// ============================================

console.log('🎥 clasesYT.js cargado - Versión CORREGIDA');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    VIDEO_ID: 'cb12KmMMDJA',
    DISPLAY_UPDATE_INTERVAL: 1000,
    SAVE_INTERVAL: 30000, // Guardar cada 30 segundos
    MAX_MENSAJES: 50
};

// ============================================
// CLASE TimeTracker - VERSIÓN CORREGIDA
// ============================================
class TimeTracker {
    constructor() {
        // TIEMPO TOTAL ACUMULADO (esto persiste siempre)
        this.totalActiveTime = 0;
        
        // Tiempo de la sesión actual (se reinicia al volver)
        this.sessionStartTime = null;
        
        // Estado actual
        this.isActive = true; // Comienza activo
        
        this.displayElement = document.getElementById('tiempoActivo');
        this.messageElement = document.getElementById('statusMessage');
        
        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        this.claseId = urlParams.get('claseId') || 'clase_stroke_iam';
        this.claseNombre = urlParams.get('clase') || 'Stroke / IAM';
        
        // Cargar tiempo guardado en localStorage (por si acaso)
        this.cargarTiempoGuardado();
        
        this.init();
    }

    /**
     * Carga el tiempo guardado en localStorage (respaldo)
     */
    cargarTiempoGuardado() {
        try {
            const user = getCurrentUserSafe();
            if (!user) return;
            
            const key = `tiempo_total_${user._id}_${this.claseId}`;
            const guardado = localStorage.getItem(key);
            
            if (guardado) {
                const data = JSON.parse(guardado);
                this.totalActiveTime = data.totalActiveTime || 0;
                console.log(`💾 Tiempo recuperado de localStorage: ${this.totalActiveTime}s`);
            }
        } catch (error) {
            console.error('Error cargando tiempo guardado:', error);
        }
    }

    /**
     * Guarda el tiempo en localStorage (respaldo)
     */
    guardarTiempoLocal() {
        try {
            const user = getCurrentUserSafe();
            if (!user) return;
            
            const key = `tiempo_total_${user._id}_${this.claseId}`;
            localStorage.setItem(key, JSON.stringify({
                totalActiveTime: this.totalActiveTime,
                lastUpdate: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error guardando tiempo local:', error);
        }
    }

    init() {
        console.log('⏱️ Inicializando TimeTracker CORREGIDO...');
        console.log(`📚 Clase: ${this.claseNombre} (${this.claseId})`);
        console.log(`⏱️ Tiempo acumulado inicial: ${this.totalActiveTime}s`);
        
        // Iniciar la sesión actual
        this.sessionStartTime = Date.now();
        
        // Evento para cambio de visibilidad de la pestaña
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

        // Actualizar display cada segundo
        setInterval(() => this.updateDisplay(), CONFIG.DISPLAY_UPDATE_INTERVAL);
        
        // Guardar automáticamente cada 30 segundos
        setInterval(() => {
            if (this.isActive) {
                this.saveCurrentTime(false);
            }
        }, CONFIG.SAVE_INTERVAL);
        
        console.log('✅ TimeTracker inicializado');
    }

    /**
     * Maneja cambio de visibilidad de la pestaña
     * @param {boolean} isVisible - true si la pestaña es visible
     */
    handleTabChange(isVisible) {
        if (isVisible) {
            // VOLVIÓ A LA PESTAÑA
            console.log('👁️ Pestaña visible - REANUDANDO');
            
            // Actualizar el tiempo total con lo que se acumuló en la sesión anterior
            if (this.sessionStartTime) {
                const tiempoSesion = Date.now() - this.sessionStartTime;
                // NO sumamos aquí porque ya se sumó al salir
            }
            
            // Iniciar nueva sesión
            this.sessionStartTime = Date.now();
            this.isActive = true;
            
            console.log(`⏱️ Tiempo total actual: ${this.totalActiveTime}s`);
            
        } else {
            // SALE DE LA PESTAÑA
            console.log('👁️ Pestaña oculta - GUARDANDO como INACTIVO');
            
            // Calcular tiempo de esta sesión
            if (this.sessionStartTime) {
                const tiempoSesion = Date.now() - this.sessionStartTime;
                this.totalActiveTime += tiempoSesion;
                console.log(`⏱️ Sesión actual: ${Math.floor(tiempoSesion / 1000)}s - Total acumulado: ${Math.floor(this.totalActiveTime / 1000)}s`);
            }
            
            // Guardar como INACTIVO
            this.saveCurrentTime(true); // true = es inactivo
            this.isActive = false;
        }
    }

    /**
     * Maneja el cierre de la página
     */
    handlePageClose() {
        console.log('🚪 Cerrando página - Guardando final');
        
        // Calcular tiempo de la última sesión
        if (this.sessionStartTime && this.isActive) {
            const tiempoSesion = Date.now() - this.sessionStartTime;
            this.totalActiveTime += tiempoSesion;
        }
        
        // Guardar como INACTIVO final
        this.saveCurrentTime(true);
        
        // Limpiar localStorage
        try {
            const user = getCurrentUserSafe();
            if (user) {
                const key = `tiempo_total_${user._id}_${this.claseId}`;
                localStorage.removeItem(key);
            }
        } catch (error) {}
    }

    /**
     * Guarda el tiempo actual en el servidor
     * @param {boolean} esInactivo - true si es por inactividad
     */
    async saveCurrentTime(esInactivo = false) {
        const seconds = Math.floor(this.totalActiveTime / 1000);
        
        console.log(`⏱️ Guardando: ${seconds}s - ${esInactivo ? 'INACTIVO' : 'ACTIVO'}`);
        
        // Guardar en servidor
        await this.saveToServer(seconds, esInactivo);
        
        // Respaldo en localStorage
        this.guardarTiempoLocal();
    }

    updateDisplay() {
        if (!this.displayElement) return;
        
        let currentTotal = this.totalActiveTime;
        
        // Si está activo, sumar el tiempo de la sesión actual
        if (this.isActive && this.sessionStartTime) {
            currentTotal += (Date.now() - this.sessionStartTime);
        }
        
        const seconds = Math.floor(currentTotal / 1000);
        this.displayElement.textContent = seconds;
    }

    getCurrentTime() {
        let currentTotal = this.totalActiveTime;
        
        if (this.isActive && this.sessionStartTime) {
            currentTotal += (Date.now() - this.sessionStartTime);
        }
        
        return Math.floor(currentTotal / 1000);
    }

    /**
     * Guarda el tiempo en el servidor
     * @param {number} seconds - Tiempo total en segundos
     * @param {boolean} esInactivo - true si es un registro de inactividad
     */
    async saveToServer(seconds, esInactivo = false) {
        if (!isLoggedInSafe()) return;
        
        const user = getCurrentUserSafe();
        
        // activo = true SOLO cuando está en la pestaña Y no es inactivo
        const activo = this.isActive && !esInactivo;
        
        console.log(`📤 Enviando a MongoDB: ${seconds}s - ${activo ? 'ACTIVO' : 'INACTIVO'}`);
        
        try {
            const result = await makeRequestSafe('/tiempo-clase/guardar', {
                claseId: this.claseId,
                claseNombre: this.claseNombre,
                tiempoSegundos: seconds,
                esFinal: esInactivo,
                activo: activo
            });
            
            if (result.success) {
                console.log(`✅ Guardado OK (${activo ? 'ACTIVO' : 'INACTIVO'})`);
                
                if (esInactivo) {
                    this.showMessage('⏸️ Sesión pausada', 'info');
                }
            }
        } catch (error) {
            console.error('❌ Error guardando:', error);
        }
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
        this.sessionStartTime = Date.now();
        this.updateDisplay();
        this.guardarTiempoLocal();
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
    console.log('🚀 Inicializando página con TimeTracker CORREGIDO...');
    
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
        console.log(`⏱️ Tiempo inicial: ${window.timeTracker.getCurrentTime()}s`);
        
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

// Funciones de debug MEJORADAS
window.debug = {
    tiempo: () => {
        const t = window.timeTracker;
        if (!t) return 'No inicializado';
        return {
            total: t.totalActiveTime,
            sesion: t.sessionStartTime ? Date.now() - t.sessionStartTime : 0,
            actual: t.getCurrentTime(),
            activo: t.isActive
        };
    },
    reset: () => window.timeTracker?.resetCounter(),
    estado: () => window.timeTracker?.isActive ? 'ACTIVO' : 'INACTIVO',
    chat: () => window.chatReal,
    user: () => getCurrentUserSafe()
};

console.log('🎯 Funciones de debug disponibles:');
console.log('   debug.tiempo() - Muestra detalles del tiempo');
console.log('   debug.reset() - Reinicia contador');
console.log('   debug.estado() - Muestra ACTIVO/INACTIVO');