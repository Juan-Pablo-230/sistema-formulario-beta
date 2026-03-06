console.log('formularios.js - Versión simplificada con overlay');

let authSystemReady = false;
let claseInfo = null;

// Esperar a que authSystem esté disponible
function waitForAuthSystem() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 50;
        let attempts = 0;
        const check = () => {
            if (typeof authSystem !== 'undefined' && authSystem) {
                authSystemReady = true;
                resolve(authSystem);
            } else if (attempts++ < maxAttempts) {
                setTimeout(check, 100);
            } else {
                reject(new Error('authSystem no disponible'));
            }
        };
        check();
    });
}

// Funciones auxiliares seguras
function getCurrentUserSafe() {
    return authSystemReady && authSystem.getCurrentUser ? authSystem.getCurrentUser() : null;
}

function isLoggedInSafe() {
    return authSystemReady && authSystem.isLoggedIn ? authSystem.isLoggedIn() : false;
}

async function makeRequestSafe(endpoint, data = null, method = 'POST') {
    if (!authSystemReady || !authSystem.makeRequest) {
        throw new Error('authSystem no listo');
    }
    const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    return await authSystem.makeRequest(fullEndpoint, data, method);
}

function obtenerClaseId() {
    return window.CLASE_ID;
}

// Cargar información de la clase desde el backend
async function cargarClase() {
    const claseId = obtenerClaseId();
    if (!claseId) throw new Error('ID de clase no disponible');

    // Intentar como clase pública
    try {
        const res = await makeRequestSafe(`/clases-publicas/${claseId}`, null, 'GET');
        if (res.success && res.data) return res.data;
    } catch (e) {
        console.log('No es clase pública', e);
    }

    // Intentar como clase histórica
    try {
        const res = await makeRequestSafe(`/clases-historicas/${claseId}`, null, 'GET');
        if (res.success && res.data) return res.data;
    } catch (e) {
        console.log('No es clase histórica', e);
    }

    throw new Error('No se pudo cargar la información de la clase');
}

// Mostrar la información en la superposición
function mostrarInfoClase(clase) {
    document.getElementById('claseNombre').textContent = clase.nombre || 'Clase sin nombre';

    // Formatear fechas de apertura y cierre (si vienen del servidor)
    let aperturaTexto = 'No especificada';
    let cierreTexto = 'No especificado';

    if (clase.fechaApertura) {
        aperturaTexto = new Date(clase.fechaApertura).toLocaleString('es-AR');
    } else if (clase.fechaClase) {
        aperturaTexto = new Date(clase.fechaClase).toLocaleString('es-AR');
    }

    if (clase.fechaCierre) {
        cierreTexto = new Date(clase.fechaCierre).toLocaleString('es-AR');
    } else if (clase.fechaClase) {
        // Si no hay cierre, usar un valor por defecto (ej. 20:00 del día de la clase)
        const fecha = new Date(clase.fechaClase);
        fecha.setHours(20, 0, 0, 0);
        cierreTexto = fecha.toLocaleString('es-AR');
    }

    document.getElementById('fechaApertura').textContent = aperturaTexto;
    document.getElementById('fechaCierre').textContent = cierreTexto;

    // Mostrar el contenedor
    document.getElementById('claseInfo').style.display = 'block';

    // Configurar botón
    const btn = document.getElementById('btnUnirse');
    btn.textContent = `Unirse a la clase ${clase.nombre || ''}`;
    btn.onclick = () => unirseAClase(clase);
}

// Intentar inscribir y redirigir
async function unirseAClase(clase) {
    const btn = document.getElementById('btnUnirse');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    const user = getCurrentUserSafe();
    if (!user) {
        mostrarMensaje('Debes iniciar sesión', 'error');
        btn.disabled = false;
        btn.textContent = `Unirse a la clase ${clase.nombre || ''}`;
        return;
    }

    try {
        const inscripcionData = {
            usuarioId: user._id,
            clase: clase.nombre,
            turno: user.turno, // Usamos el turno del usuario logueado
            fecha: new Date().toISOString()
        };
        if (clase._id) inscripcionData.claseId = clase._id;

        const result = await makeRequestSafe('/inscripciones', inscripcionData, 'POST');

        // Si el servidor responde con éxito o ya estaba inscrito, redirigimos
        if (result.success) {
            console.log('Inscripción exitosa');
        } else {
            // Si el mensaje es "Ya estás inscrito", igual continuamos
            if (result.message && result.message.includes('Ya estás inscrito')) {
                console.log('Ya estaba inscrito, redirigiendo');
            } else {
                throw new Error(result.message || 'Error al inscribirse');
            }
        }

        // Redirigir al enlace de la clase
        const enlace = clase.enlaceFormulario || clase.enlaces?.youtube || '';
        if (enlace) {
            window.location.href = enlace;
        } else {
            alert('No hay enlace de clase disponible, pero la inscripción fue registrada.');
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.error('Error al inscribirse:', error);
        mostrarMensaje(error.message || 'Error al procesar la inscripción', 'error');
        btn.disabled = false;
        btn.textContent = `Unirse a la clase ${clase.nombre || ''}`;
    }
}

// Mostrar mensajes temporales
function mostrarMensaje(texto, tipo) {
    const msgDiv = document.getElementById('mensaje');
    msgDiv.textContent = texto;
    msgDiv.className = `mensaje ${tipo}`;
    msgDiv.style.display = 'block';
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 5000);
}

// Inicialización
async function inicializar() {
    try {
        await waitForAuthSystem();
        if (!isLoggedInSafe()) {
            await authSystem.showLoginModal();
        }
        const clase = await cargarClase();
        claseInfo = clase;
        mostrarInfoClase(clase);
    } catch (error) {
        console.error('Error en inicialización:', error);
        mostrarMensaje('Error al cargar la clase: ' + error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', inicializar);