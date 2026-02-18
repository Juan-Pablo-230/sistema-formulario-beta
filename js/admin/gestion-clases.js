// gestion-clases.js
console.log('🎯 Módulo de Gestión de Clases cargado');

class GestionClasesManager {
    constructor() {
        this.data = [];
        this.editandoId = null;
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.setupEventListeners();
    }

    async cargarDatos() {
        try {
            const result = await authSystem.makeRequest('/clases-historicas', null, 'GET');
            this.data = result.data || [];
            console.log(`✅ ${this.data.length} clases cargadas`);
            this.mostrarLista();
            this.actualizarEstadisticas();
        } catch (error) {
            console.error('❌ Error cargando clases:', error);
            this.mostrarError();
        }
    }

    mostrarLista(filtro = '') {
        const container = document.getElementById('clasesList');
        if (!container) return;

        let clasesFiltradas = this.data;
        
        if (filtro) {
            const termino = filtro.toLowerCase();
            clasesFiltradas = this.data.filter(c => 
                c.nombre?.toLowerCase().includes(termino) ||
                c.descripcion?.toLowerCase().includes(termino) ||
                c.instructores?.some(i => i.toLowerCase().includes(termino))
            );
        }

        if (clasesFiltradas.length === 0) {
            container.innerHTML = `
                <div class="empty-message">
                    No hay clases para mostrar
                </div>
            `;
            return;
        }

        clasesFiltradas.sort((a, b) => new Date(b.fechaClase) - new Date(a.fechaClase));

        container.innerHTML = clasesFiltradas.map(clase => `
            <div class="clase-card ${clase.activa ? '' : 'inactiva'}">
                <div class="clase-header">
                    <span class="clase-titulo">${clase.nombre}</span>
                    <span class="clase-estado ${clase.activa ? '' : 'inactiva'}">
                        ${clase.activa ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                </div>
                
                ${clase.descripcion ? `<p class="clase-descripcion">${clase.descripcion}</p>` : ''}
                
                <div class="clase-detalles">
                    <span>📅 ${clase.fechaClase ? new Date(clase.fechaClase).toLocaleString('es-AR') : 'N/A'}</span>
                    ${clase.instructores?.length ? `<span>👥 ${clase.instructores.join(', ')}</span>` : ''}
                </div>
                
                <div class="clase-enlaces">
                    ${clase.enlaces?.youtube ? `<a href="${clase.enlaces.youtube}" target="_blank" class="material-link youtube">▶️ YouTube</a>` : ''}
                    ${clase.enlaces?.powerpoint ? `<a href="${clase.enlaces.powerpoint}" target="_blank" class="material-link powerpoint">📊 Presentación</a>` : ''}
                </div>
                
                <div class="clase-acciones">
                    <button class="btn-small btn-edit" onclick="gestionClasesManager.editarClase('${clase._id}')">✏️ Editar</button>
                    <button class="btn-small btn-danger" onclick="gestionClasesManager.eliminarClase('${clase._id}')">🗑️ Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    async guardarClase(event) {
        event.preventDefault();
        
        const formData = {
            nombre: document.getElementById('claseNombre').value,
            descripcion: document.getElementById('claseDescripcion').value,
            fechaClase: document.getElementById('claseFecha').value + 'T' + document.getElementById('claseHora').value + ':00',
            enlaces: {
                youtube: document.getElementById('claseYoutube').value,
                powerpoint: document.getElementById('clasePowerpoint').value
            },
            activa: document.getElementById('claseActiva').checked,
            instructores: document.getElementById('claseInstructores').value
                .split(',').map(i => i.trim()).filter(i => i)
        };

        // Validaciones
        if (!formData.nombre) {
            this.mostrarMensaje('El nombre de la clase es obligatorio', 'error');
            return;
        }

        if (!formData.fechaClase) {
            this.mostrarMensaje('La fecha de la clase es obligatoria', 'error');
            return;
        }

        try {
            if (this.editandoId) {
                // Actualizar
                await authSystem.makeRequest(`/clases-historicas/${this.editandoId}`, formData, 'PUT');
                this.mostrarMensaje('Clase actualizada correctamente', 'success');
            } else {
                // Crear nueva
                await authSystem.makeRequest('/clases-historicas', formData);
                this.mostrarMensaje('Clase creada correctamente', 'success');
            }
            
            this.limpiarFormulario();
            await this.cargarDatos();
        } catch (error) {
            this.mostrarMensaje('Error: ' + error.message, 'error');
        }
    }

    editarClase(id) {
        const clase = this.data.find(c => c._id === id);
        if (!clase) return;

        this.editandoId = id;
        
        document.getElementById('claseNombre').value = clase.nombre || '';
        document.getElementById('claseDescripcion').value = clase.descripcion || '';
        
        if (clase.fechaClase) {
            const fecha = new Date(clase.fechaClase);
            document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
            document.getElementById('claseHora').value = fecha.toTimeString().slice(0, 5);
        }
        
        document.getElementById('claseYoutube').value = clase.enlaces?.youtube || '';
        document.getElementById('clasePowerpoint').value = clase.enlaces?.powerpoint || '';
        document.getElementById('claseInstructores').value = clase.instructores?.join(', ') || '';
        document.getElementById('claseActiva').checked = clase.activa !== false;
        
        document.getElementById('formTitle').innerHTML = '✏️ Editando: ' + clase.nombre;
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        document.getElementById('submitClaseBtn').textContent = '✏️ Actualizar Clase';
        
        // Scroll al formulario
        document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
    }

    cancelarEdicion() {
        this.editandoId = null;
        this.limpiarFormulario();
        document.getElementById('formTitle').innerHTML = '➕ Agregar Nueva Clase';
        document.getElementById('cancelEditBtn').style.display = 'none';
        document.getElementById('submitClaseBtn').textContent = '💾 Guardar Clase';
    }

    limpiarFormulario() {
        document.getElementById('claseForm').reset();
        document.getElementById('claseHora').value = '10:00';
        document.getElementById('claseActiva').checked = true;
        this.ocultarMensaje();
    }

    async eliminarClase(id) {
        if (!confirm('¿Está seguro de eliminar esta clase?')) return;

        try {
            await authSystem.makeRequest(`/clases-historicas/${id}`, null, 'DELETE');
            this.mostrarMensaje('Clase eliminada correctamente', 'success');
            await this.cargarDatos();
        } catch (error) {
            this.mostrarMensaje('Error al eliminar: ' + error.message, 'error');
        }
    }

    actualizarEstadisticas() {
        const total = this.data.length;
        const activas = this.data.filter(c => c.activa).length;
        
        const ahora = new Date();
        const proximas = this.data.filter(c => {
            if (!c.activa || !c.fechaClase) return false;
            const fechaClase = new Date(c.fechaClase);
            const diffDias = (fechaClase - ahora) / (1000 * 60 * 60 * 24);
            return diffDias > 0 && diffDias <= 7;
        }).length;

        document.getElementById('totalClases').textContent = total;
        document.getElementById('clasesActivas').textContent = activas;
        document.getElementById('clasesProximas').textContent = proximas;
        
        // Obtener solicitudes (esto debería venir de otra API)
        document.getElementById('totalSolicitudes').textContent = '0';
    }

    mostrarMensaje(texto, tipo) {
        const msg = document.getElementById('formMessage');
        msg.textContent = texto;
        msg.className = `message ${tipo}`;
        msg.style.display = 'block';
        
        setTimeout(() => {
            msg.style.display = 'none';
        }, 3000);
    }

    ocultarMensaje() {
        document.getElementById('formMessage').style.display = 'none';
    }

    mostrarError() {
        const container = document.getElementById('clasesList');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    ⚠️ Error al cargar las clases
                </div>
            `;
        }
    }

    setupEventListeners() {
        document.getElementById('claseForm')?.addEventListener('submit', (e) => this.guardarClase(e));
        
        document.getElementById('limpiarFormBtn')?.addEventListener('click', () => {
            this.cancelarEdicion();
        });
        
        document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
            this.cancelarEdicion();
        });
        
        document.getElementById('refrescarClasesBtn')?.addEventListener('click', () => {
            this.cargarDatos();
        });
        
        document.getElementById('buscarClase')?.addEventListener('input', (e) => {
            this.mostrarLista(e.target.value);
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.gestionClasesManager = new GestionClasesManager();
});