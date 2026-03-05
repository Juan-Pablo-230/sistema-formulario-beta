console.log('formularios.js cargado - Versión con logging mejorado');

// Variable global para verificar si authSystem está disponible
let authSystemReady = false;
let claseInfo = null; // Guardar información de la clase actual

// Función para esperar a que authSystem esté disponible
function waitForAuthSystem() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 50;
        let attempts = 0;
        
        const checkAuth = () => {
            attempts++;
            if (typeof authSystem !== 'undefined' && authSystem !== null) {
                console.log('✅ authSystem cargado después de', attempts, 'intentos');
                authSystemReady = true;
                resolve(authSystem);
            } else if (attempts >= maxAttempts) {
                reject(new Error('authSystem no se cargó'));
            } else {
                setTimeout(checkAuth, 100);
            }
        };
        
        checkAuth();
    });
}

// Función segura para obtener el usuario actual
function getCurrentUserSafe() {
    if (authSystemReady && authSystem && typeof authSystem.getCurrentUser === 'function') {
        return authSystem.getCurrentUser();
    }
    return null;
}

// Función segura para verificar si está logueado
function isLoggedInSafe() {
    if (authSystemReady && authSystem && typeof authSystem.isLoggedIn === 'function') {
        return authSystem.isLoggedIn();
    }
    return false;
}

// Función segura para verificar si es admin
function isAdminSafe() {
    if (authSystemReady && authSystem && typeof authSystem.isAdmin === 'function') {
        return authSystem.isAdmin();
    }
    return false;
}

// Función segura para hacer requests
async function makeRequestSafe(endpoint, data = null, method = 'POST') {
    if (authSystemReady && authSystem && typeof authSystem.makeRequest === 'function') {
        return await authSystem.makeRequest(endpoint, data, method);
    }
    throw new Error('authSystem no disponible');
}

// Obtener el ID de clase (de window.CLASE_ID o de la URL)
function obtenerClaseId() {
    if (window.CLASE_ID) {
        return window.CLASE_ID;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('claseId');
}

// Función para obtener la clase actual (nombre)
function obtenerClaseActual() {
    if (claseInfo && claseInfo.nombre) {
        return claseInfo.nombre;
    }
    
    const selectClase = document.getElementById('clase');
    if (selectClase && selectClase.value) {
        return selectClase.value;
    }
    return null;
}

// VERIFICAR SI LA CLASE ESTÁ ABIERTA (antes de las 20:00 del día de la clase)
function claseEstaAbierta() {
    console.log('🔍 Verificando si la clase está abierta...');
    
    if (!claseInfo) {
        console.log('⚠️ No hay información de clase disponible');
        return true; // Por defecto, permitir si no hay info
    }
    
    if (!claseInfo.fechaClase) {
        console.log('⚠️ No hay fecha de clase disponible');
        return true;
    }
    
    const ahora = new Date();
    const fechaClase = new Date(claseInfo.fechaClase);
    
    console.log('📅 Fecha actual:', ahora.toLocaleString());
    console.log('📅 Fecha clase:', fechaClase.toLocaleString());
    
    // Comparar solo la fecha (sin hora)
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const diaClase = new Date(fechaClase.getFullYear(), fechaClase.getMonth(), fechaClase.getDate());
    
    console.log('📅 Día actual:', hoy.toDateString());
    console.log('📅 Día clase:', diaClase.toDateString());
    
    // Si la fecha de la clase ya pasó
    if (diaClase < hoy) {
        console.log('❌ Clase de fecha pasada');
        return false;
    }
    
    // Si es el mismo día, verificar si ya pasaron las 20:00 hrs
    if (diaClase.getTime() === hoy.getTime()) {
        const horaActual = ahora.getHours();
        const minutosActual = ahora.getMinutes();
        const horaActualEnMinutos = horaActual * 60 + minutosActual;
        const horaLimiteEnMinutos = 20 * 60; // 20:00 = 1200 minutos
        
        console.log(`⏰ Hora actual: ${horaActual}:${minutosActual} (${horaActualEnMinutos} minutos)`);
        console.log(`⏰ Límite: 20:00 (${horaLimiteEnMinutos} minutos)`);
        
        // Si ya pasaron las 20:00, la clase está cerrada
        if (horaActualEnMinutos >= horaLimiteEnMinutos) {
            console.log('❌ Clase del día de hoy pero después de las 20:00');
            return false;
        }
    }
    
    console.log('✅ Clase abierta para inscripción');
    return true;
}

// VERIFICAR SI EL FORMULARIO YA FUE COMPLETADO POR EL USUARIO
async function usuarioYaCompletoFormulario() {
    console.log('🔍 Verificando si el usuario ya completó el formulario...');
    
    try {
        const usuarioActual = getCurrentUserSafe();
        const claseNombre = obtenerClaseActual();
        const claseId = obtenerClaseId();
        
        console.log('📊 Datos para verificación:', {
            usuario: usuarioActual,
            claseNombre,
            claseId
        });
        
        if (!usuarioActual || !usuarioActual._id) {
            console.log('❌ No hay usuario logueado o no tiene _id');
            return false;
        }
        
        if (!claseNombre && !claseId) {
            console.log('❌ No se pudo determinar la clase');
            return false;
        }
        
        // Admins pueden ver el formulario siempre
        if (isAdminSafe()) {
            console.log('👑 Usuario admin, omitiendo verificación');
            return false;
        }
        
        // PRIMERO: Intentar verificar por claseId (más preciso)
        if (claseId) {
            try {
                console.log(`🔍 Verificando por claseId: ${claseId}`);
                const result = await makeRequestSafe(`/api/inscripciones/verificar/${usuarioActual._id}/${claseId}`, null, 'GET');
                console.log('📊 Resultado verificación por claseId:', result);
                
                if (result && result.data) {
                    if (result.data.exists === true) {
                        console.log('✅ Inscripción encontrada por claseId');
                        return true;
                    }
                }
            } catch (error) {
                console.log('⚠️ Error verificando por claseId:', error.message);
            }
        }
        
        // SEGUNDO: Intentar verificar por nombre de clase
        if (claseNombre) {
            try {
                console.log(`🔍 Verificando por nombre: ${claseNombre}`);
                const result = await makeRequestSafe(`/api/inscripciones/verificar/${usuarioActual._id}/${encodeURIComponent(claseNombre)}`, null, 'GET');
                console.log('📊 Resultado verificación por nombre:', result);
                
                if (result && result.data) {
                    if (result.data.exists === true) {
                        console.log('✅ Inscripción encontrada por nombre de clase');
                        return true;
                    }
                }
            } catch (error) {
                console.log('⚠️ Error verificando por nombre:', error.message);
            }
        }
        
        // TERCERO: Verificación adicional
        try {
            console.log('🔍 Verificación adicional: obteniendo todas las inscripciones del usuario');
            const inscripciones = await makeRequestSafe(`/api/inscripciones/usuario/${usuarioActual._id}`, null, 'GET');
            
            if (inscripciones && inscripciones.data && Array.isArray(inscripciones.data)) {
                const existe = inscripciones.data.some(insc => {
                    if (claseId && insc.claseId === claseId) return true;
                    if (claseNombre && insc.clase === claseNombre) return true;
                    return false;
                });
                
                if (existe) {
                    console.log('✅ Inscripción encontrada en lista completa');
                    return true;
                }
            }
        } catch (error) {
            console.log('⚠️ Error en verificación adicional:', error.message);
        }
        
        console.log('✅ No hay inscripción previa');
        return false;
        
    } catch (error) {
        console.error('❌ Error verificando formulario:', error);
        return false;
    }
}

// Cargar información de la clase desde la API
async function cargarInformacionClase() {
    const claseId = obtenerClaseId();
    
    console.log('🔍 Cargando información de clase, ID:', claseId);
    
    if (!claseId) {
        console.error('❌ No hay ID de clase');
        document.getElementById('claseTitulo').textContent = 'Error: Clase no especificada';
        return false;
    }
    
    try {
        console.log('📡 Cargando información de clase:', claseId);
        document.getElementById('claseTitulo').textContent = 'Cargando información de la clase...';
        
        // PRIMERO: Intentar cargar como clase pública
        console.log('🔍 Intentando cargar como clase pública...');
        let clase = null;
        let tipoClase = null;
        
        try {
            const response = await makeRequestSafe(`/api/clases-publicas/${claseId}`, null, 'GET');
            console.log('📦 Respuesta de clase pública:', response);
            
            if (response && response.success && response.data) {
                clase = response.data;
                tipoClase = 'publica';
                console.log('✅ Clase pública cargada:', clase.nombre);
            }
        } catch (error) {
            console.log('⚠️ No es una clase pública:', error.message);
        }
        
        // SEGUNDO: Si no es pública, intentar como clase de gestión (histórica)
        if (!clase) {
            try {
                console.log('🔍 Intentando cargar como clase de gestión...');
                const response = await makeRequestSafe(`/api/clases-historicas/${claseId}`, null, 'GET');
                console.log('📦 Respuesta de clase de gestión:', response);
                
                if (response && response.success && response.data) {
                    clase = response.data;
                    tipoClase = 'historica';
                    console.log('✅ Clase de gestión cargada:', clase.nombre);
                }
            } catch (error) {
                console.log('⚠️ Tampoco es una clase de gestión:', error.message);
            }
        }
        
        // TERCERO: Si ninguna funcionó, mostrar error
        if (!clase) {
            console.error('❌ No se pudo cargar la clase');
            throw new Error('No se pudo cargar la información de la clase');
        }
        
        claseInfo = clase;
        claseInfo.tipo = tipoClase;
        
        console.log('📊 Clase cargada exitosamente:', claseInfo);
        
        // Actualizar título
        document.getElementById('claseTitulo').textContent = claseInfo.nombre || 'Clase sin nombre';
        
        // Actualizar indicador de clase
        const claseIndicador = document.getElementById('claseIndicador');
        const claseNombre = document.getElementById('claseNombre');
        const claseDetalles = document.getElementById('claseDetalles');
        const deadline = document.getElementById('deadline');
        
        if (claseIndicador && claseNombre) {
            claseNombre.textContent = claseInfo.nombre || 'Clase sin nombre';
            claseIndicador.style.display = 'block';
            
            // Mostrar detalles adicionales
            if (claseDetalles) {
                let detallesHTML = '';
                
                // Instructores (manejar diferentes formatos)
                if (claseInfo.instructores) {
                    let instructoresTexto = '';
                    if (Array.isArray(claseInfo.instructores)) {
                        instructoresTexto = claseInfo.instructores.join(', ');
                    } else if (typeof claseInfo.instructores === 'string') {
                        instructoresTexto = claseInfo.instructores;
                    }
                    if (instructoresTexto) {
                        detallesHTML += `<p><strong>Instructores:</strong> ${instructoresTexto}</p>`;
                    }
                }
                
                // Lugar (para clases públicas)
                if (claseInfo.lugar) {
                    detallesHTML += `<p><strong>Lugar:</strong> ${claseInfo.lugar}</p>`;
                }
                
                // Descripción
                if (claseInfo.descripcion) {
                    detallesHTML += `<p><strong>Descripción:</strong> ${claseInfo.descripcion}</p>`;
                }
                
                claseDetalles.innerHTML = detallesHTML;
            }
            
            // Actualizar deadline
            if (deadline && claseInfo.fechaClase) {
                try {
                    const fechaClase = new Date(claseInfo.fechaClase);
                    if (!isNaN(fechaClase.getTime())) {
                        const fechaFormateada = fechaClase.toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        const fechaLimite = new Date(fechaClase);
                        fechaLimite.setHours(20, 0, 0, 0);
                        
                        const hoy = new Date();
                        if (fechaLimite > hoy) {
                            const diasRestantes = Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));
                            deadline.innerHTML = `⏰ <strong>Fecha de la clase:</strong> ${fechaFormateada} - <strong>Inscripción hasta:</strong> ${fechaLimite.toLocaleDateString('es-AR')} 20:00 hrs (${diasRestantes} días restantes)`;
                        } else {
                            deadline.innerHTML = `⏰ <strong>Fecha de la clase:</strong> ${fechaFormateada} - <strong>Inscripción:</strong> Hoy hasta las 20:00 hrs`;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Error formateando fecha:', e);
                }
            }
        }
        
        // Actualizar select de clase
        const selectClase = document.getElementById('clase');
        const claseOption = document.getElementById('claseOption');
        
        if (selectClase && claseOption) {
            claseOption.value = claseInfo.nombre;
            claseOption.textContent = claseInfo.nombre;
            selectClase.value = claseInfo.nombre;
        }
        
        // Guardar enlace de redirección
        const enlaceRedireccion = document.getElementById('enlaceRedireccion');
        if (enlaceRedireccion) {
            if (claseInfo.enlaceFormulario) {
                enlaceRedireccion.value = claseInfo.enlaceFormulario;
            } else if (claseInfo.enlaces && claseInfo.enlaces.youtube) {
                enlaceRedireccion.value = claseInfo.enlaces.youtube;
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error cargando clase:', error);
        document.getElementById('claseTitulo').textContent = 'Error al cargar la clase';
        
        // Mostrar mensaje de error pero NO detener la ejecución
        // Para que las demás validaciones puedan ejecutarse
        return true; // Cambiado de false a true para continuar
    }
}

// Inicializar aplicación
async function inicializarAplicacion() {
    console.log('🚀 Inicializando aplicación...');
    
    try {
        await waitForAuthSystem();
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarErrorVerificacion('Error al cargar el sistema de autenticación');
        return;
    }
    
    // Verificar login
    if (!isLoggedInSafe()) {
        try {
            await authSystem.showLoginModal();
        } catch (error) {
            console.log('❌ Login cancelado');
            window.location.href = '../index.html';
            return;
        }
    }
    
    console.log('👤 Usuario logueado:', getCurrentUserSafe());
    
    // Cargar información de la clase
    const claseCargada = await cargarInformacionClase();
    console.log('📊 Resultado carga de clase:', claseCargada);
    
    // VERIFICACIÓN INICIAL 1: ¿La clase está abierta?
    console.log('🔍 Ejecutando verificación de apertura...');
    const abierta = claseEstaAbierta();
    console.log('📊 Resultado verificación apertura:', abierta);
    
    if (!abierta) {
        console.log('🔒 Clase cerrada, mostrando mensaje');
        mostrarClaseCerrada();
        return;
    }
    
    // VERIFICACIÓN INICIAL 2: ¿Ya está inscrito?
    console.log('🔍 Ejecutando verificación de inscripción...');
    try {
        const yaCompleto = await usuarioYaCompletoFormulario();
        console.log('📊 Resultado verificación inscripción:', yaCompleto);
        
        if (yaCompleto) {
            console.log('✅ Usuario ya inscrito, mostrando mensaje');
            mostrarFormularioYaCompletado();
            return;
        }
    } catch (error) {
        console.error('❌ Error en verificación:', error);
    }
    
    // Configurar formulario
    console.log('⚙️ Configurando formulario...');
    if (isAdminSafe()) {
        crearOpcionesAdmin();
    }
    
    autocompletarDesdeUsuario();
    
    const form = document.getElementById('inscripcionForm');
    if (form) {
        form.addEventListener('submit', validarFormulario);
        console.log('✅ Event listener del formulario configurado');
    }
    
    // Botón de logout
    const backBtnContainer = document.querySelector('.back-btn-container');
    if (backBtnContainer && isLoggedInSafe()) {
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Cerrar Sesión';
        logoutBtn.className = 'back-btn logout-btn';
        logoutBtn.onclick = logoutSafe;
        backBtnContainer.appendChild(logoutBtn);
    }
    
    console.log('✅ Aplicación inicializada');
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando...');
    inicializarAplicacion();
});

// Debug
window.debugEstado = function() {
    console.log('=== DEBUG ESTADO ===');
    console.log('claseId:', obtenerClaseId());
    console.log('claseInfo:', claseInfo);
    console.log('authSystemReady:', authSystemReady);
    console.log('Usuario logueado:', isLoggedInSafe());
    console.log('Clase abierta:', claseEstaAbierta());
    console.log('===================');
};