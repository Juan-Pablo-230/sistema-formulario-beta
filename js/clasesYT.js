// ============================================
// clasesYT.js - VERSIÓN ACUMULATIVA (un solo registro por usuario/clase)
// ============================================

console.log('🎥 clasesYT.js - Modo ACUMULATIVO');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    VIDEO_ID: 'cb12KmMMDJA',
    DISPLAY_UPDATE_INTERVAL: 1000,
    SAVE_INTERVAL: 30000, // Guardar cada 30 segundos
    UMBRAL_MINIMO: 1 // Mínimo 1 segundo para guardar
};

// ============================================
// CLASE TimeTracker - VERSIÓN ACUMULATIVA
// ============================================
class TimeTracker {
    constructor() {
        // Acumuladores de la sesión actual
        this.tiempoActivoSesion = 0;
        this.tiempoInactivoSesion = 0;
        
        // Totales acumulados (se sincronizan con MongoDB)
        this.tiempoActivoTotal = 0;
        this.tiempoInactivoTotal = 0;
        
        // Control de sesión
        this.sessionStartTime = Date.now();
        this.isActive = true;
        this.sessionId = this.generarSessionId();
        
        // Control de guardado
        this.lastSaveTime = 0;
        this.pendienteGuardar = false;
        
        // Elementos DOM
        this.displayElement = document.getElementById('tiempoActivo');
        this.messageElement = document.getElementById('statusMessage');
        
        // Datos de la clase
        const urlParams = new URLSearchParams(window.location.search);
        this.claseId = urlParams.get('claseId') || 'clase_stroke_iam';
        this.claseNombre = urlParams.get('clase') || 'Stroke / IAM';
        
        this.init();
    }

    generarSessionId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async init() {
        console.log('⏱️ Inicializando TimeTracker ACUMULATIVO...');
        console.log(`📚 Clase: ${this.claseNombre}`);
        
        // Intentar cargar datos guardados
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

        // Iniciar sesión activa
        this.sessionStartTime = Date.now();
        this.isActive = true;
        
        // Actualizar display cada segundo
        setInterval(() => this.updateDisplay(), CONFIG.DISPLAY_UPDATE_INTERVAL);
        
        // Guardado automático cada 30 segundos
        setInterval(() => this.guardadoAutomatico(), CONFIG.SAVE_INTERVAL);
        
        console.log('✅ TimeTracker listo');
        console.log(`📊 Estado inicial - Activo: ${this.tiempoActivoTotal}s, Inactivo: ${this.tiempoInactivoTotal}s`);
    }

    async cargarDatosGuardados() {
        try {
            if (!isLoggedInSafe()) return;
            
            const user = getCurrentUserSafe();
            const result = await makeRequestSafe(`/tiempo-clase?clase=${this.claseId}`, null, 'GET');
            
            if (result.success && result.data && result.data.length > 0) {
                // Buscar el registro de esta clase
                const registro = result.data.find(r => r.claseId === this.claseId);
                if (registro) {
                    this.tiempoActivoTotal = registro.tiempoActivo || 0;
                    this.tiempoInactivoTotal = registro.tiempoInactivo || 0;
                    console.log(`💾 Datos cargados desde MongoDB:`);
                    console.log(`   Activo: ${this.tiempoActivoTotal}s, Inactivo: ${this.tiempoInactivoTotal}s`);
                }
            }
        } catch (error) {
            console.log('ℹ️ No hay datos previos en MongoDB');
        }
    }

    handleSalidaPestana() {
        if (!this.isActive) return;
        
        console.log('👁️ Saliendo de la pestaña - Calculando tiempo activo...');
        
        // Calcular tiempo activo de esta sesión
        const tiempoSesion = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        
        if (tiempoSesion >= CONFIG.UMBRAL_MINIMO) {
            this.tiempoActivoSesion = tiempoSesion;
            this.tiempoActivoTotal += tiempoSesion;
            console.log(`⏱️ Tiempo activo de esta sesión: ${tiempoSesion}s`);
            console.log(`📊 Total activo acumulado: ${this.tiempoActivoTotal}s`);
            
            // Marcar para guardar
            this.pendienteGuardar = true;
        }
        
        this.isActive = false;
        this.sessionStartTime = null;
        
        // Guardar inmediatamente
        this.guardarEnMongoDB(false);
    }

    handleRegresoPestana() {
        console.log('👁️ Volviendo a la pestaña');
        
        // Calcular tiempo inactivo (tiempo que estuvo fuera)
        if (!this.isActive && this.sessionStartTime) {
            const tiempoFuera = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            
            if (tiempoFuera >= CONFIG.UMBRAL_MINIMO) {
                this.tiempoInactivoSesion = tiempoFuera;
                this.tiempoInactivoTotal += tiempoFuera;
                console.log(`⏱️ Tiempo inactivo fuera: ${tiempoFuera}s`);
                console.log(`📊 Total inactivo acumulado: ${this.tiempoInactivoTotal}s`);
                
                // Marcar para guardar
                this.pendienteGuardar = true;
            }
        }
        
        // Reiniciar sesión activa
        this.sessionStartTime = Date.now();
        this.isActive = true;
        
        // Guardar el tiempo inactivo
        if (this.pendienteGuardar) {
            this.guardarEnMongoDB(false);
        }
    }

    handleCierrePagina() {
        console.log('🚪 Cerrando página - Guardando tiempos finales...');
        
        if (this.isActive && this.sessionStartTime) {
            const tiempoSesion = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            if (tiempoSesion >= CONFIG.UMBRAL_MINIMO) {
                this.tiempoActivoTotal += tiempoSesion;
                this.tiempoActivoSesion += tiempoSesion;
                console.log(`⏱️ Último tiempo activo: ${tiempoSesion}s`);
            }
        }
        
        // Guardado final
        this.guardarEnMongoDB(true);
    }

    guardadoAutomatico() {
        if (this.pendienteGuardar) {
            console.log('⏲️ Guardado automático...');
            this.guardarEnMongoDB(false);
        }
    }

    async guardarEnMongoDB(esFinal = false) {
        if (!isLoggedInSafe()) return;
        
        // Si no hay nada pendiente, no guardar
        if (this.tiempoActivoSesion === 0 && this.tiempoInactivoSesion === 0 && !esFinal) {
            return;
        }
        
        const user = getCurrentUserSafe();
        
        console.log(`📤 Enviando a MongoDB:`);
        console.log(`   + Activo: ${this.tiempoActivoSesion}s`);
        console.log(`   + Inactivo: ${this.tiempoInactivoSesion}s`);
        console.log(`   Total Activo: ${this.tiempoActivoTotal}s`);
        console.log(`   Total Inactivo: ${this.tiempoInactivoTotal}s`);
        
        try {
            const result = await makeRequestSafe('/tiempo-clase/actualizar', {
                claseId: this.claseId,
                claseNombre: this.claseNombre,
                tiempoActivo: this.tiempoActivoSesion,
                tiempoInactivo: this.tiempoInactivoSesion,
                esFinal: esFinal
            });
            
            if (result.success) {
                console.log('✅ Tiempos actualizados en MongoDB');
                
                // Resetear contadores de sesión después de guardar
                this.tiempoActivoSesion = 0;
                this.tiempoInactivoSesion = 0;
                this.pendienteGuardar = false;
                this.lastSaveTime = Date.now();
            }
        } catch (error) {
            console.error('❌ Error guardando:', error);
            // Los tiempos pendientes se mantienen para el próximo intento
        }
    }

    updateDisplay() {
        if (!this.displayElement) return;
        
        let totalActual = this.tiempoActivoTotal;
        
        if (this.isActive && this.sessionStartTime) {
            totalActual += Math.floor((Date.now() - this.sessionStartTime) / 1000);
        }
        
        this.displayElement.textContent = totalActual;
    }

    getCurrentTime() {
        let total = this.tiempoActivoTotal;
        if (this.isActive && this.sessionStartTime) {
            total += Math.floor((Date.now() - this.sessionStartTime) / 1000);
        }
        return total;
    }

    resetCounter() {
        this.tiempoActivoTotal = 0;
        this.tiempoInactivoTotal = 0;
        this.tiempoActivoSesion = 0;
        this.tiempoInactivoSesion = 0;
        this.sessionStartTime = Date.now();
        this.pendienteGuardar = true;
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

// ============================================
// INICIALIZACIÓN
// ============================================

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

// Debug
window.debug = {
    tiempo: () => window.timeTracker?.getCurrentTime() || 0,
    activo: () => window.timeTracker?.tiempoActivoTotal || 0,
    inactivo: () => window.timeTracker?.tiempoInactivoTotal || 0,
    reset: () => window.timeTracker?.resetCounter()
};