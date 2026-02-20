// ============================================
// clasesYT.js - VERSIÓN CORREGIDA (con mejor manejo de tiempos)
// ============================================

console.log('🎥 clasesYT.js - Versión CORREGIDA');

const CONFIG = {
    VIDEO_ID: 'cb12KmMMDJA',
    DISPLAY_UPDATE_INTERVAL: 1000,
    SAVE_INTERVAL: 30000,
    UMBRAL_MINIMO: 1
};

class TimeTracker {
    constructor() {
        // Acumuladores de la sesión actual (lo que se va a sumar)
        this.tiempoActivoSesion = 0;
        this.tiempoInactivoSesion = 0;
        
        // Totales acumulados (para display)
        this.tiempoActivoTotal = 0;
        this.tiempoInactivoTotal = 0;
        
        // Control de sesión
        this.sessionStartTime = Date.now();
        this.sessionActiva = true;
        this.sessionFuera = false;
        
        // Último guardado para evitar duplicados
        this.ultimoGuardado = 0;
        
        // Elementos DOM
        this.displayElement = document.getElementById('tiempoActivo');
        this.messageElement = document.getElementById('statusMessage');
        
        // Datos de la clase
        const urlParams = new URLSearchParams(window.location.search);
        this.claseId = urlParams.get('claseId') || 'clase_stroke_iam';
        this.claseNombre = urlParams.get('clase') || 'Stroke / IAM';
        
        this.init();
    }

    async init() {
        console.log('⏱️ Inicializando TimeTracker...');
        console.log(`📚 Clase: ${this.claseNombre} (${this.claseId})`);
        
        // Cargar datos guardados
        await this.cargarDatosGuardados();
        
        // Eventos
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleSalidaPestana();
            } else {
                this.handleRegresoPestana();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.handleCierrePagina();
        });

        // Iniciar sesión
        this.sessionStartTime = Date.now();
        this.sessionActiva = true;
        
        // Actualizar display
        setInterval(() => this.updateDisplay(), CONFIG.DISPLAY_UPDATE_INTERVAL);
        
        console.log('✅ TimeTracker listo');
        console.log(`📊 Totales iniciales - Activo: ${this.tiempoActivoTotal}s, Inactivo: ${this.tiempoInactivoTotal}s`);
    }

    async cargarDatosGuardados() {
        try {
            if (!isLoggedInSafe()) return;
            
            const result = await makeRequestSafe('/tiempo-clase', null, 'GET');
            
            if (result.success && result.data) {
                // Buscar el registro de esta clase
                const registro = result.data.find(r => r.claseId === this.claseId);
                if (registro) {
                    this.tiempoActivoTotal = registro.tiempoActivo || 0;
                    this.tiempoInactivoTotal = registro.tiempoInactivo || 0;
                    console.log(`💾 Datos cargados - Activo: ${this.tiempoActivoTotal}s, Inactivo: ${this.tiempoInactivoTotal}s`);
                }
            }
        } catch (error) {
            console.log('ℹ️ No hay datos previos');
        }
    }

    handleSalidaPestana() {
        if (!this.sessionActiva) return;
        
        console.log('👁️ Saliendo de la pestaña - Calculando tiempo activo...');
        
        // Calcular tiempo activo de esta sesión
        const tiempoSesion = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        
        if (tiempoSesion >= CONFIG.UMBRAL_MINIMO) {
            this.tiempoActivoSesion = tiempoSesion;
            this.tiempoActivoTotal += tiempoSesion;
            console.log(`⏱️ Tiempo activo de esta sesión: +${tiempoSesion}s (Total: ${this.tiempoActivoTotal}s)`);
            
            // Guardar inmediatamente
            this.guardarEnMongoDB(false);
        }
        
        this.sessionActiva = false;
        this.sessionStartTime = Date.now(); // Guardar para medir tiempo fuera
    }

    handleRegresoPestana() {
        console.log('👁️ Volviendo a la pestaña');
        
        // Calcular tiempo inactivo (tiempo que estuvo fuera)
        if (!this.sessionActiva && this.sessionStartTime) {
            const tiempoFuera = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            
            if (tiempoFuera >= CONFIG.UMBRAL_MINIMO) {
                this.tiempoInactivoSesion = tiempoFuera;
                this.tiempoInactivoTotal += tiempoFuera;
                console.log(`⏱️ Tiempo inactivo fuera: +${tiempoFuera}s (Total: ${this.tiempoInactivoTotal}s)`);
                
                // Guardar el tiempo inactivo
                this.guardarEnMongoDB(false);
            }
        }
        
        // Reiniciar sesión activa
        this.sessionStartTime = Date.now();
        this.sessionActiva = true;
    }

    handleCierrePagina() {
        console.log('🚪 Cerrando página - Guardando tiempos finales...');
        
        if (this.sessionActiva && this.sessionStartTime) {
            const tiempoSesion = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            if (tiempoSesion >= CONFIG.UMBRAL_MINIMO) {
                this.tiempoActivoTotal += tiempoSesion;
                this.tiempoActivoSesion += tiempoSesion;
                console.log(`⏱️ Último tiempo activo: +${tiempoSesion}s`);
            }
        }
        
        // Guardado final
        this.guardarEnMongoDB(true);
    }

    async guardarEnMongoDB(esFinal = false) {
        // Evitar guardados duplicados muy seguidos
        const ahora = Date.now();
        if (ahora - this.ultimoGuardado < 2000 && this.tiempoActivoSesion === 0 && this.tiempoInactivoSesion === 0) {
            return;
        }
        
        this.ultimoGuardado = ahora;
        
        if (!isLoggedInSafe()) return;
        
        // Si no hay nada que guardar, salir
        if (this.tiempoActivoSesion === 0 && this.tiempoInactivoSesion === 0 && !esFinal) {
            return;
        }
        
        console.log(`📤 Guardando en MongoDB:`);
        console.log(`   + Activo: ${this.tiempoActivoSesion}s`);
        console.log(`   + Inactivo: ${this.tiempoInactivoSesion}s`);
        console.log(`   Totales: Activo=${this.tiempoActivoTotal}s, Inactivo=${this.tiempoInactivoTotal}s`);
        
        try {
            const result = await makeRequestSafe('/tiempo-clase/actualizar', {
                claseId: this.claseId,
                claseNombre: this.claseNombre,
                tiempoActivo: this.tiempoActivoSesion,
                tiempoInactivo: this.tiempoInactivoSesion,
                esFinal: esFinal
            });
            
            if (result.success) {
                console.log('✅ Guardado OK');
                
                // Resetear solo los valores de sesión, NO los totales
                this.tiempoActivoSesion = 0;
                this.tiempoInactivoSesion = 0;
            }
        } catch (error) {
            console.error('❌ Error guardando:', error);
        }
    }

    updateDisplay() {
        if (!this.displayElement) return;
        
        let totalActual = this.tiempoActivoTotal;
        
        if (this.sessionActiva && this.sessionStartTime) {
            totalActual += Math.floor((Date.now() - this.sessionStartTime) / 1000);
        }
        
        this.displayElement.textContent = totalActual;
    }

    getCurrentTime() {
        let total = this.tiempoActivoTotal;
        if (this.sessionActiva && this.sessionStartTime) {
            total += Math.floor((Date.now() - this.sessionStartTime) / 1000);
        }
        return total;
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
        const domain = window.location.hostname;
        const chatUrl = `https://www.youtube.com/live_chat?v=${CONFIG.VIDEO_ID}&embed_domain=${domain}`;
        
        if (this.chatIframe) {
            this.chatIframe.src = chatUrl;
            this.chatIframe.addEventListener('error', () => this.handleError());
        }
        setTimeout(() => this.checkStatus(), 5000);
    }

    handleError() {
        this.retryCount++;
        if (this.retryCount <= this.maxRetries) {
            setTimeout(() => {
                if (this.chatIframe) {
                    this.chatIframe.src = this.chatIframe.src;
                }
            }, 2000);
        }
    }

    checkStatus() {
        try {
            if (this.chatIframe && this.chatIframe.contentDocument) {
                console.log('✅ Chat accesible');
            }
        } catch (e) {
            console.log('✅ Chat cargado');
        }
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function showLoading(message = 'Cargando...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `<div style="text-align: center; color: white;"><div class="loading-spinner"></div><p>${message}</p></div>`;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.remove();
}

function updateUserInfo() {
    if (!isLoggedInSafe()) return;
    const user = getCurrentUserSafe();
    document.getElementById('nombreUsuario').textContent = user?.apellidoNombre || 'Usuario';
    document.getElementById('legajoUsuario').textContent = user?.legajo || '-';
    document.getElementById('turnoUsuario').textContent = user?.turno || '-';
}

async function inicializarPagina() {
    showLoading('Verificando acceso...');
    
    try {
        await waitForAuthSystem();
        
        if (!isLoggedInSafe()) {
            hideLoading();
            try {
                await authSystem.showLoginModal();
            } catch (error) {
                window.location.href = '/index.html';
                return;
            }
            showLoading('Cargando clase...');
        }
        
        updateUserInfo();
        
        window.timeTracker = new TimeTracker();
        window.chatReal = new ChatReal();
        
        hideLoading();
        console.log('✅ Todo listo');
        
    } catch (error) {
        console.error('❌ Error:', error);
        hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', inicializarPagina);

window.debug = {
    tiempo: () => window.timeTracker?.getCurrentTime() || 0,
    totales: () => ({
        activo: window.timeTracker?.tiempoActivoTotal || 0,
        inactivo: window.timeTracker?.tiempoInactivoTotal || 0
    })
};