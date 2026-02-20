// ============================================
// clasesYT.js - Chat simulado + TimeTracker
// ============================================

console.log('🎥 clasesYT.js cargado - Modo Chat Simulado');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    VIDEO_ID: 'cb12KmMMDJA',
    INACTIVITY_LIMIT: 5000,
    DISPLAY_UPDATE_INTERVAL: 1000,
    MAX_MENSAJES: 50
};

// ============================================
// CLASE ChatSimulado
// ============================================
class ChatSimulado {
    constructor() {
        this.mensajesContainer = document.getElementById('chatMensajes');
        this.input = document.getElementById('chatInput');
        this.btnEnviar = document.getElementById('btnEnviarChat');
        this.mensajes = [];
        this.usuario = null;
        this.inactivityTimer = null;
        
        this.init();
    }

    init() {
        console.log('💬 Inicializando Chat Simulado...');
        
        // Cargar usuario
        this.usuario = getCurrentUserSafe();
        
        // Configurar eventos
        if (this.input) {
            this.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.input.disabled) {
                    this.enviarMensaje();
                }
            });
        }
        
        // Mensajes automáticos de bienvenida
        this.agregarMensajeSistema('🟢 Chat de la clase iniciado');
        this.agregarMensajeSistema('👋 Bienvenidos a la clase de Stroke/IAM');
        this.agregarMensajeSistema('📝 Los instructores: Lic. Daniel de la Rosa, Lic. Liliana Areco');
        
        // Simular actividad cada 30 segundos
        setInterval(() => this.simularActividad(), 30000);
        
        console.log('✅ Chat Simulado listo');
    }

    enviarMensaje() {
        if (!this.input || !this.input.value.trim()) return;
        
        const texto = this.input.value.trim();
        const usuario = this.usuario;
        
        if (!usuario) {
            this.agregarMensajeSistema('❌ Debes iniciar sesión para enviar mensajes');
            return;
        }
        
        // Agregar mensaje del usuario
        this.agregarMensajeUsuario(usuario.apellidoNombre || 'Usuario', texto);
        
        // Limpiar input
        this.input.value = '';
        
        // Simular respuesta después de 1-3 segundos (30% de probabilidad)
        if (Math.random() < 0.3) {
            setTimeout(() => {
                this.simularRespuesta(texto);
            }, 1000 + Math.random() * 2000);
        }
    }

    agregarMensajeUsuario(nombre, texto) {
        const hora = new Date().toLocaleTimeString('es-AR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
        
        const mensaje = {
            tipo: 'usuario',
            nombre: nombre,
            texto: texto,
            hora: hora,
            hour12: false
        };
        
        this.mensajes.push(mensaje);
        this.renderizarMensaje(mensaje);
        this.limitarMensajes();
    }

    agregarMensajeSistema(texto) {
        const hora = new Date().toLocaleTimeString('es-AR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
        
        const mensaje = {
            tipo: 'sistema',
            texto: texto,
            hora: hora,
            hour12: false
        };
        
        this.mensajes.push(mensaje);
        this.renderizarMensaje(mensaje);
        this.limitarMensajes();
    }

    renderizarMensaje(mensaje) {
        if (!this.mensajesContainer) return;
        
        const div = document.createElement('div');
        div.className = `mensaje ${mensaje.tipo}`;
        
        if (mensaje.tipo === 'usuario') {
            div.innerHTML = `
                <span class="mensaje-hora">${mensaje.hora}</span>
                <span class="mensaje-contenido">
                    <strong>${mensaje.nombre}:</strong> ${this.escapeHTML(mensaje.texto)}
                </span>
            `;
        } else {
            div.innerHTML = `
                <span class="mensaje-hora">${mensaje.hora}</span>
                <span class="mensaje-contenido">${this.escapeHTML(mensaje.texto)}</span>
            `;
        }
        
        this.mensajesContainer.appendChild(div);
        
        // Scroll al último mensaje
        setTimeout(() => {
            if (this.mensajesContainer) {
                this.mensajesContainer.scrollTop = this.mensajesContainer.scrollHeight;
            }
        }, 50);
    }

    simularRespuesta(mensajeUsuario) {
        const respuestas = [
            "👍 Gracias por tu mensaje",
            "✅ Entendido",
            "📝 Buena pregunta, lo veremos en breve",
            "👌 Ok",
            "🤔 Interesante punto",
            "💡 Importante lo que mencionas",
            "📚 Lo veremos en la siguiente unidad",
            "✅ Anotado",
            "👍 Excelente participación",
            "🔍 Revisando tu consulta"
        ];
        
        const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
        this.agregarMensajeSistema(`🤖 ${respuesta}`);
    }

    simularActividad() {
        // Simular mensajes automáticos cada tanto
        const mensajesAutomaticos = [
            "📊 Clase de Stroke/IAM en curso",
            "🔔 Recuerden que pueden hacer preguntas",
            "📝 Material disponible al finalizar",
            "⏱️ Clase transmitida en vivo",
            "👥 Participantes: " + (50 + Math.floor(Math.random() * 50)) + " conectados"
        ];
        
        if (Math.random() < 0.2) { // 20% de probabilidad cada 30 segundos
            const mensaje = mensajesAutomaticos[Math.floor(Math.random() * mensajesAutomaticos.length)];
            this.agregarMensajeSistema(mensaje);
        }
    }

    limitarMensajes() {
        if (this.mensajes.length > CONFIG.MAX_MENSAJES) {
            const exceso = this.mensajes.length - CONFIG.MAX_MENSAJES;
            this.mensajes.splice(0, exceso);
            
            // Limpiar y re-renderizar
            if (this.mensajesContainer) {
                this.mensajesContainer.innerHTML = '';
                this.mensajes.forEach(m => this.renderizarMensaje(m));
            }
        }
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    habilitarInput(habilitado) {
        if (this.input) {
            this.input.disabled = !habilitado;
        }
        if (this.btnEnviar) {
            this.btnEnviar.disabled = !habilitado;
        }
    }
}

// ============================================
// CLASE TimeTracker
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
    console.log('🚀 Inicializando página...');
    
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
        window.chatSimulado = new ChatSimulado();
        
        // Habilitar chat después de login
        if (user) {
            window.chatSimulado.habilitarInput(true);
            window.chatSimulado.agregarMensajeSistema(`👤 ${user.apellidoNombre} se ha unido al chat`);
        }
        
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
    chat: () => window.chatSimulado
};