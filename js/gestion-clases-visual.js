console.log('🎯 gestion-clases-visual.js cargado');

class GestionClasesVisual {
    constructor() {
        console.log('🔄 Inicializando Gestión Visual de Clases...');
        
        // Verificar que estamos en la sección correcta
        const visualSection = document.getElementById('gestionClasesVisualSection');
        if (!visualSection || visualSection.style.display === 'none') {
            console.log('⏳ Sección de Gestión Visual no visible, cancelando inicialización');
            return;
        }
        
        // Esperar un momento para que el DOM esté listo
        setTimeout(() => {
            this.init();
        }, 200);
    }

    init() {
        console.log('🚀 Iniciando Gestión Visual de Clases');
        
        // Verificar que los elementos existen antes de configurar eventos
        if (this.verificarElementos()) {
            this.configurarEventos();
            this.cargarClases();
            this.actualizarEstadisticas();
        } else {
            console.error('❌ No se encontraron todos los elementos necesarios');
            // Mostrar mensaje de error en el contenedor
            this.mostrarErrorEnContainer();
        }
    }

    verificarElementos() {
        const elementos = [
            'formClaseHistorica',
            'claseNombre',
            'claseDescripcion',
            'claseFecha',
            'claseHora',
            'claseYoutube',
            'clasePowerpoint',
            'claseInstructores',
            'claseActiva',
            'btnLimpiarForm',
            'btnRefrescarClases',
            'clasesListContainer',
            'formMensaje',
            'statsTotalClases',
            'statsClasesActivas',
            'statsClasesProximas',
            'statsTotalSolicitudesHistorico'
        ];
        
        const elementosFaltantes = [];
        elementos.forEach(id => {
            if (!document.getElementById(id)) {
                elementosFaltantes.push(id);
            }
        });
        
        if (elementosFaltantes.length > 0) {
            console.log('⏳ Elementos faltantes:', elementosFaltantes);
            return false;
        }
        
        console.log('✅ Todos los elementos del DOM están disponibles');
        return true;
    }

    configurarEventos() {
        console.log('🔧 Configurando eventos de Gestión Visual');
        
        // Formulario de carga - con verificación
        const form = document.getElementById('formClaseHistorica');
        if (form) {
            // Remover event listeners anteriores para evitar duplicados
            form.removeEventListener('submit', this.handleSubmit);
            this.handleSubmit = (e) => {
                e.preventDefault();
                this.guardarClase();
            };
            form.addEventListener('submit', this.handleSubmit);
            console.log('✅ Evento submit configurado');
        } else {
            console.warn('⚠️ Formulario no encontrado');
        }
        
        // Botón limpiar
        const btnLimpiar = document.getElementById('btnLimpiarForm');
        if (btnLimpiar) {
            btnLimpiar.removeEventListener('click', this.handleLimpiar);
            this.handleLimpiar = () => this.limpiarFormulario();
            btnLimpiar.addEventListener('click', this.handleLimpiar);
            console.log('✅ Evento limpiar configurado');
        }
        
        // Botón refrescar
        const btnRefrescar = document.getElementById('btnRefrescarClases');
        if (btnRefrescar) {
            btnRefrescar.removeEventListener('click', this.handleRefrescar);
            this.handleRefrescar = () => this.cargarClases();
            btnRefrescar.addEventListener('click', this.handleRefrescar);
            console.log('✅ Evento refrescar configurado');
        }
        
        console.log('✅ Eventos configurados');
    }

    async guardarClase() {
    console.log('💾 Guardando clase...');
    
    // Obtener valores del formulario
    const claseData = {
        nombre: document.getElementById('claseNombre')?.value || '',
        descripcion: document.getElementById('claseDescripcion')?.value || '',
        fechaClase: document.getElementById('claseFecha')?.value || '',
        enlaces: {
            youtube: document.getElementById('claseYoutube')?.value || '',
            powerpoint: document.getElementById('clasePowerpoint')?.value || ''
        },
        activa: document.getElementById('claseActiva')?.checked || true,
        instructores: document.getElementById('claseInstructores')?.value 
            ? document.getElementById('claseInstructores').value.split(',').map(i => i.trim()) 
            : []
    };
    
    // Validaciones básicas
    if (!claseData.nombre) {
        this.mostrarMensaje('❌ El nombre de la clase es obligatorio', 'error');
        return;
    }
    
    if (!claseData.fechaClase) {
        this.mostrarMensaje('❌ La fecha de la clase es obligatoria', 'error');
        return;
    }
    
    try {
        if (typeof authSystem !== 'undefined' && authSystem.makeRequest) {
            const result = await authSystem.makeRequest('/clases-historicas', claseData);
            
            if (result.success) {
                this.mostrarMensaje('✅ Clase guardada correctamente', 'success');
                this.limpiarFormulario();
                await this.cargarClases();
            } else {
                throw new Error(result.message || 'Error al guardar');
            }
        } else {
            throw new Error('Sistema de autenticación no disponible');
        }
        
    } catch (error) {
        console.error('❌ Error guardando clase:', error);
        this.mostrarMensaje('❌ Error al guardar la clase: ' + error.message, 'error');
    }
}

    limpiarFormulario() {
        console.log('🧹 Limpiando formulario');
        const form = document.getElementById('formClaseHistorica');
        if (form) {
            form.reset();
            // Establecer valores por defecto
            const horaInput = document.getElementById('claseHora');
            if (horaInput) horaInput.value = '10:00';
            
            const activaCheck = document.getElementById('claseActiva');
            if (activaCheck) activaCheck.checked = true;
        }
    }

    async cargarClases() {
    console.log('📥 Cargando clases...');
    
    const container = document.getElementById('clasesListContainer');
    if (!container) return;
    
    container.innerHTML = this.getLoadingHTML();
    
    try {
        let clases = [];
        
        // Usar authSystem.makeRequest (igual que en admin.js)
        if (typeof authSystem !== 'undefined' && authSystem.makeRequest) {
            const result = await authSystem.makeRequest('/clases-historicas', null, 'GET');
            clases = result.data || [];
            console.log('✅ Clases cargadas:', clases.length);
        } else {
            console.error('❌ authSystem no disponible');
            throw new Error('Sistema de autenticación no disponible');
        }
        
        if (clases.length === 0) {
            container.innerHTML = this.getEmptyHTML();
            this.actualizarEstadisticas([]);
        } else {
            this.mostrarClasesEnContainer(container, clases);
            this.actualizarEstadisticas(clases);
        }
        
    } catch (error) {
        console.error('❌ Error cargando clases:', error);
        container.innerHTML = this.getErrorHTML('Error al cargar las clases');
    }
}

    mostrarClasesEnContainer(container, clases) {
        if (!clases || clases.length === 0) {
            container.innerHTML = this.getEmptyHTML();
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        
        clases.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        clases.forEach(clase => {
            const fechaCompleta = clase.hora ? 
                `${clase.fecha} ${clase.hora}` : 
                clase.fecha;
            
            const fechaFormateada = new Date(fechaCompleta).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            html += `
                <div class="clase-card" style="
                    background: var(--bg-container);
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid ${clase.activa ? '#34a853' : '#ea4335'};
                    margin-bottom: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <strong style="color: var(--text-primary); font-size: 1.1em;">${clase.nombre}</strong>
                            ${clase.descripcion ? `<div style="color: var(--text-secondary); font-size: 0.9em; margin-top: 4px;">${clase.descripcion}</div>` : ''}
                            <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 0.9em; color: var(--text-muted);">
                                <span>📅 ${fechaFormateada}</span>
                                ${clase.instructores ? `<span>👥 ${clase.instructores}</span>` : ''}
                            </div>
                            <div style="margin-top: 8px; display: flex; gap: 10px;">
                                ${clase.youtube ? `<a href="${clase.youtube}" target="_blank" class="email-link" style="font-size: 0.9em;">▶️ YouTube</a>` : ''}
                                ${clase.powerpoint ? `<a href="${clase.powerpoint}" target="_blank" class="email-link" style="font-size: 0.9em;">📊 PowerPoint</a>` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <span style="
                                background: ${clase.activa ? '#34a85320' : '#ea433520'};
                                color: ${clase.activa ? '#34a853' : '#ea4335'};
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 0.8em;
                                font-weight: bold;
                                margin-right: 10px;
                            ">${clase.activa ? 'ACTIVA' : 'INACTIVA'}</span>
                            <button class="btn-small btn-edit" onclick="window.gestionClasesVisual?.editarClase('${clase._id}')" title="Editar clase">✏️</button>
                            <button class="btn-small btn-danger" onclick="window.gestionClasesVisual?.eliminarClase('${clase._id}')" title="Eliminar clase">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    editarClase(claseId) {
        console.log('✏️ Editando clase:', claseId);
        this.mostrarMensaje('Función de edición en desarrollo', 'info');
        // Aquí iría la lógica para cargar los datos de la clase en el formulario
    }

    async eliminarClase(claseId) {
    if (!confirm('¿Está seguro de que desea eliminar esta clase?')) {
        return;
    }
    
    console.log('🗑️ Eliminando clase:', claseId);
    
    try {
        // Mostrar indicador de carga
        this.mostrarMensaje('Eliminando clase...', 'info');
        
        if (typeof authSystem !== 'undefined' && authSystem.makeRequest) {
            // Llamar a la API para eliminar la clase
            const result = await authSystem.makeRequest(
                `/clases-historicas/${claseId}`, 
                null, 
                'DELETE'
            );
            
            if (result.success) {
                this.mostrarMensaje('✅ Clase eliminada correctamente', 'success');
                // Recargar la lista de clases
                await this.cargarClases();
            } else {
                throw new Error(result.message || 'Error al eliminar');
            }
        } else {
            throw new Error('Sistema de autenticación no disponible');
        }
        
    } catch (error) {
        console.error('❌ Error eliminando clase:', error);
        this.mostrarMensaje('❌ Error al eliminar la clase: ' + error.message, 'error');
        // Recargar para mostrar el estado actual
        await this.cargarClases();
    }
}

    actualizarEstadisticas(clases = null) {
        if (!clases || clases.length === 0) {
    // Puedes mostrar valores en cero o un mensaje
    document.getElementById('statsTotalClases').textContent = '0';
    document.getElementById('statsClasesActivas').textContent = '0';
    document.getElementById('statsClasesProximas').textContent = '0';
    document.getElementById('statsTotalSolicitudesHistorico').textContent = '0';
    return;
}
        
        const total = clases.length;
        const activas = clases.filter(c => c.activa).length;
        const proximas = clases.filter(c => {
            const fechaClase = new Date(c.fecha + 'T' + (c.hora || '10:00'));
            return fechaClase > new Date() && c.activa;
        }).length;
        
        const totalEl = document.getElementById('statsTotalClases');
        const activasEl = document.getElementById('statsClasesActivas');
        const proximasEl = document.getElementById('statsClasesProximas');
        const solicitudesEl = document.getElementById('statsTotalSolicitudesHistorico');
        
        if (totalEl) totalEl.textContent = total;
        if (activasEl) activasEl.textContent = activas;
        if (proximasEl) proximasEl.textContent = proximas;
        if (solicitudesEl) solicitudesEl.textContent = '0'; // Por ahora 0
    }

    setEstadisticasEjemplo() {
        const totalEl = document.getElementById('statsTotalClases');
        const activasEl = document.getElementById('statsClasesActivas');
        const proximasEl = document.getElementById('statsClasesProximas');
        const solicitudesEl = document.getElementById('statsTotalSolicitudesHistorico');
        
        if (totalEl) totalEl.textContent = '3';
        if (activasEl) activasEl.textContent = '2';
        if (proximasEl) proximasEl.textContent = '1';
        if (solicitudesEl) solicitudesEl.textContent = '0';
    }

    mostrarMensaje(mensaje, tipo) {
        const mensajeDiv = document.getElementById('formMensaje');
        if (!mensajeDiv) {
            console.log('📢', mensaje, tipo);
            return;
        }
        
        mensajeDiv.style.display = 'block';
        mensajeDiv.textContent = mensaje;
        mensajeDiv.style.cssText = `
            padding: 12px;
            border-radius: 6px;
            margin-top: 15px;
            text-align: center;
            font-weight: bold;
            ${tipo === 'error' ? 
                'background: #ffebee; color: #c62828; border: 1px solid #ffcdd2;' : 
                tipo === 'success' ?
                'background: #e8f5e8; color: #2e7d32; border: 1px solid #c8e6c9;' :
                'background: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb;'
            }
        `;
        
        setTimeout(() => {
            mensajeDiv.style.display = 'none';
        }, 3000);
    }

    mostrarErrorEnContainer() {
        const container = document.getElementById('clasesListContainer');
        if (container) {
            container.innerHTML = this.getErrorHTML('No se pudieron cargar los elementos de la interfaz');
        }
    }

    getLoadingHTML() {
        return `
            <div style="text-align: center; padding: 30px;">
                <div class="spinner" style="
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 15px;
                    border: 4px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
                <p style="color: var(--text-muted);">Cargando clases...</p>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    getEmptyHTML() {
        return `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="font-size: 3em; margin-bottom: 15px;">📭</div>
                <h3 style="margin-bottom: 10px;">No hay clases cargadas</h3>
                <p>Utilice el formulario para agregar una nueva clase</p>
            </div>
        `;
    }

    getErrorHTML(mensaje) {
        return `
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                <div style="font-size: 3em; margin-bottom: 15px;">⚠️</div>
                <h3 style="margin-bottom: 10px;">Error</h3>
                <p>${mensaje}</p>
                <button onclick="window.gestionClasesVisual?.cargarClases()" 
                        style="margin-top: 15px; padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Exponer la clase globalmente
window.GestionClasesVisual = GestionClasesVisual;

// NO inicializar automáticamente - solo exponer la clase
console.log('✅ Clase GestionClasesVisual cargada y lista para usar');