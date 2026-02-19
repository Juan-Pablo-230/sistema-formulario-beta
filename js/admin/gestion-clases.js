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
        this.agregarEnlaceInicial(); // Agregar un enlace vacío al inicio
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
            this.mostrarLista(e.target.value, document.getElementById('filtroEstado').value);
        });
        
        document.getElementById('filtroEstado')?.addEventListener('change', (e) => {
            this.mostrarLista(document.getElementById('buscarClase').value, e.target.value);
        });
        
        document.getElementById('agregarEnlaceBtn')?.addEventListener('click', () => {
            this.agregarEnlace();
        });
        
        document.getElementById('claseEstado')?.addEventListener('change', (e) => {
            this.actualizarInfoVisibilidad(e.target.value);
        });
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

    mostrarLista(filtroTexto = '', filtroEstado = 'todos') {
        const container = document.getElementById('clasesList');
        if (!container) return;

        let clasesFiltradas = this.data;
        
        // Filtrar por texto
        if (filtroTexto) {
            const termino = filtroTexto.toLowerCase();
            clasesFiltradas = clasesFiltradas.filter(c => 
                c.nombre?.toLowerCase().includes(termino) ||
                c.descripcion?.toLowerCase().includes(termino) ||
                (c.instructores && c.instructores.some(i => i.toLowerCase().includes(termino)))
            );
        }
        
        // Filtrar por estado
        if (filtroEstado !== 'todos') {
            clasesFiltradas = clasesFiltradas.filter(c => c.estado === filtroEstado);
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

        container.innerHTML = clasesFiltradas.map(clase => {
            const estado = clase.estado || 'activa';
            const estadoInfo = this.getEstadoInfo(estado);
            
            // Verificar si tiene enlaces (formato antiguo o nuevo)
            const tieneEnlaces = (clase.enlaces && 
                ((clase.enlaces.youtube || clase.enlaces.powerpoint) || 
                 (Array.isArray(clase.enlaces) && clase.enlaces.length > 0)));
            
            return `
            <div class="clase-card ${estado}">
                <div class="clase-header">
                    <span class="clase-titulo">${clase.nombre}</span>
                    <span class="clase-estado ${estado}" title="${estadoInfo.descripcion}">
                        ${estadoInfo.icono} ${estadoInfo.texto}
                    </span>
                </div>
                
                ${clase.descripcion ? `<p class="clase-descripcion">${clase.descripcion}</p>` : ''}
                
                <div class="clase-detalles">
                    <span>📅 ${clase.fechaClase ? new Date(clase.fechaClase).toLocaleString('es-AR') : 'N/A'}</span>
                    ${clase.instructores?.length ? `<span>👥 ${clase.instructores.join(', ')}</span>` : ''}
                </div>
                
                <div class="clase-enlaces">
                    ${this.renderizarEnlaces(clase.enlaces)}
                </div>
                
                <div class="clase-info-adicional">
                    <span class="info-badge ${tieneEnlaces ? 'success' : 'warning'}">
                        ${tieneEnlaces ? '📎 Tiene material' : '⚠️ Sin material'}
                    </span>
                    <span class="info-badge ${estado === 'publicada' && tieneEnlaces ? 'success' : 'secondary'}">
                        ${estado === 'publicada' && tieneEnlaces ? '👁️ Visible para usuarios' : '👁️ Solo admin'}
                    </span>
                </div>
                
                <div class="clase-acciones">
                    <button class="btn-small btn-edit" onclick="gestionClasesManager.editarClase('${clase._id}')">✏️ Editar</button>
                    <button class="btn-small btn-danger" onclick="gestionClasesManager.eliminarClase('${clase._id}')">🗑️ Eliminar</button>
                </div>
            </div>
        `}).join('');
    }

    renderizarEnlaces(enlaces) {
        if (!enlaces) {
            return '<span class="sin-enlaces">No hay material disponible</span>';
        }
        
        // Si es el formato antiguo (objeto con youtube/powerpoint)
        if (enlaces.youtube || enlaces.powerpoint) {
            const enlacesArray = [];
            if (enlaces.youtube) {
                enlacesArray.push(`
                    <a href="${enlaces.youtube}" target="_blank" class="material-link youtube" title="Ver en YouTube">
                        ▶️ YouTube
                    </a>
                `);
            }
            if (enlaces.powerpoint) {
                enlacesArray.push(`
                    <a href="${enlaces.powerpoint}" target="_blank" class="material-link powerpoint" title="Ver presentación">
                        📊 Presentación
                    </a>
                `);
            }
            return enlacesArray.join('');
        }
        
        // Si es el nuevo formato (array de enlaces)
        if (Array.isArray(enlaces) && enlaces.length > 0) {
            return enlaces.map(enlace => {
                const tipoInfo = this.getTipoInfo(enlace.tipo);
                return `
                    <a href="${enlace.url}" target="_blank" class="material-link ${enlace.tipo}" title="${enlace.descripcion || tipoInfo.texto}">
                        ${tipoInfo.icono} ${tipoInfo.texto}
                    </a>
                `;
            }).join('');
        }
        
        return '<span class="sin-enlaces">No hay material disponible</span>';
    }

    getTipoInfo(tipo) {
        const tipos = {
            'youtube': { icono: '▶️', texto: 'YouTube' },
            'vimeo': { icono: '🎥', texto: 'Vimeo' },
            'pdf': { icono: '📄', texto: 'PDF' },
            'powerpoint': { icono: '📊', texto: 'Presentación' },
            'document': { icono: '📝', texto: 'Documento' },
            'drive': { icono: '☁️', texto: 'Google Drive' },
            'otro': { icono: '🔗', texto: 'Enlace' }
        };
        return tipos[tipo] || { icono: '🔗', texto: 'Enlace' };
    }

    getEstadoInfo(estado) {
        const estados = {
            'publicada': { icono: '📢', texto: 'Publicada', descripcion: 'Visible para usuarios si tiene enlaces' },
            'activa': { icono: '✅', texto: 'Activa', descripcion: 'Solo visible en panel admin' },
            'cancelada': { icono: '❌', texto: 'Cancelada', descripcion: 'Solo visible en panel admin' }
        };
        return estados[estado] || estados.activa;
    }

    agregarEnlaceInicial() {
        this.agregarEnlace();
    }

    agregarEnlace() {
        const container = document.getElementById('enlacesContainer');
        
        const enlaceDiv = document.createElement('div');
        enlaceDiv.className = 'enlace-item';
        enlaceDiv.innerHTML = `
            <div class="enlace-row">
                <select class="enlace-tipo form-control">
                    <option value="">Seleccionar tipo</option>
                    <option value="youtube">▶️ Video (YouTube)</option>
                    <option value="vimeo">🎥 Video (Vimeo)</option>
                    <option value="pdf">📄 PDF</option>
                    <option value="powerpoint">📊 Presentación (PPT)</option>
                    <option value="document">📝 Documento</option>
                    <option value="drive">☁️ Google Drive</option>
                    <option value="otro">🔗 Otro</option>
                </select>
                <input type="url" class="enlace-url form-control" placeholder="https://...">
                <input type="text" class="enlace-descripcion form-control" placeholder="Descripción (opcional)">
                <button type="button" class="btn-small btn-danger eliminar-enlace">🗑️</button>
            </div>
        `;
        
        const eliminarBtn = enlaceDiv.querySelector('.eliminar-enlace');
        eliminarBtn.addEventListener('click', () => {
            const container = document.getElementById('enlacesContainer');
            if (container.children.length > 1) {
                enlaceDiv.remove();
            } else {
                const select = enlaceDiv.querySelector('.enlace-tipo');
                const urlInput = enlaceDiv.querySelector('.enlace-url');
                const descInput = enlaceDiv.querySelector('.enlace-descripcion');
                select.value = '';
                urlInput.value = '';
                descInput.value = '';
            }
        });
        
        container.appendChild(enlaceDiv);
    }

    actualizarInfoVisibilidad(estado) {
        const infoDiv = document.getElementById('visibilidadInfo');
        const estadoInfo = document.getElementById('estadoInfo');
        
        if (estado === 'publicada') {
            estadoInfo.innerHTML = '📢 Publicada: Los usuarios pueden solicitar el material si tiene enlaces cargados';
            infoDiv.innerHTML = '<span class="info-visibilidad success">⚠️ Esta clase será visible para usuarios SOLO si tiene al menos un enlace válido</span>';
        } else if (estado === 'activa') {
            estadoInfo.innerHTML = '✅ Activa: Solo visible en panel de administración';
            infoDiv.innerHTML = '<span class="info-visibilidad warning">👁️ Esta clase SOLO será visible en el panel de administración</span>';
        } else if (estado === 'cancelada') {
            estadoInfo.innerHTML = '❌ Cancelada: Solo visible en panel de administración';
            infoDiv.innerHTML = '<span class="info-visibilidad error">🚫 Esta clase está cancelada y SOLO será visible en el panel de administración</span>';
        }
    }

    async guardarClase(event) {
        event.preventDefault();
        
        // Validar campos requeridos
        const nombre = document.getElementById('claseNombre')?.value || '';
        const fecha = document.getElementById('claseFecha')?.value || '';
        
        if (!nombre) {
            this.mostrarMensaje('❌ El nombre de la clase es obligatorio', 'error');
            return;
        }
        
        if (!fecha) {
            this.mostrarMensaje('❌ La fecha de la clase es obligatoria', 'error');
            return;
        }
        
        const hora = document.getElementById('claseHora')?.value || '10:00';
        const fechaCompleta = `${fecha}T${hora}:00`;
        
        // Obtener enlaces del formulario (formato nuevo)
        const enlacesArray = [];
        const enlaceItems = document.querySelectorAll('#enlacesContainer .enlace-item');
        
        enlaceItems.forEach(item => {
            const tipo = item.querySelector('.enlace-tipo')?.value;
            const url = item.querySelector('.enlace-url')?.value;
            const descripcion = item.querySelector('.enlace-descripcion')?.value;
            
            if (tipo && url) {
                enlacesArray.push({
                    tipo: tipo,
                    url: url,
                    descripcion: descripcion || this.getTipoInfo(tipo).texto
                });
            }
        });
        
        // Por ahora, para compatibilidad con el servidor, también creamos el formato antiguo
        // pero solo si hay enlaces del tipo correspondiente
        const enlacesViejos = {
            youtube: '',
            powerpoint: ''
        };
        
        enlacesArray.forEach(enlace => {
            if (enlace.tipo === 'youtube') {
                enlacesViejos.youtube = enlace.url;
            } else if (enlace.tipo === 'powerpoint') {
                enlacesViejos.powerpoint = enlace.url;
            }
        });
        
        // Obtener instructores
        const instructores = document.getElementById('claseInstructores')?.value
            ? document.getElementById('claseInstructores').value.split(',').map(i => i.trim()).filter(i => i)
            : [];
        
        // Preparar datos en el formato que espera el servidor
        const claseData = {
            nombre: nombre,
            descripcion: document.getElementById('claseDescripcion')?.value || '',
            fechaClase: fechaCompleta,
            // El servidor espera enlaces en formato objeto con youtube y powerpoint
            enlaces: enlacesViejos,
            // También guardamos el array para uso futuro (el servidor lo ignorará si no lo soporta)
            enlacesArray: enlacesArray,
            activa: true, // Por compatibilidad
            estado: document.getElementById('claseEstado')?.value || 'activa',
            instructores: instructores
        };
        
        console.log('📤 Enviando datos al servidor:', claseData);
        
        try {
            if (this.editandoId) {
                await authSystem.makeRequest(`/clases-historicas/${this.editandoId}`, claseData, 'PUT');
                this.mostrarMensaje('✅ Clase actualizada correctamente', 'success');
            } else {
                await authSystem.makeRequest('/clases-historicas', claseData);
                this.mostrarMensaje('✅ Clase creada correctamente', 'success');
            }
            
            this.cancelarEdicion();
            await this.cargarDatos();
        } catch (error) {
            console.error('❌ Error:', error);
            this.mostrarMensaje('❌ Error: ' + error.message, 'error');
        }
    }

    editarClase(id) {
        const clase = this.data.find(c => c._id === id);
        if (!clase) return;

        this.editandoId = id;
        
        const container = document.getElementById('enlacesContainer');
        container.innerHTML = '';
        
        // Verificar si la clase tiene enlaces en el formato nuevo o viejo
        if (clase.enlacesArray && clase.enlacesArray.length > 0) {
            // Formato nuevo
            clase.enlacesArray.forEach(enlace => {
                this.agregarEnlace();
                const items = document.querySelectorAll('#enlacesContainer .enlace-item');
                const ultimoItem = items[items.length - 1];
                
                ultimoItem.querySelector('.enlace-tipo').value = enlace.tipo || 'otro';
                ultimoItem.querySelector('.enlace-url').value = enlace.url || '';
                ultimoItem.querySelector('.enlace-descripcion').value = enlace.descripcion || '';
            });
        } else if (clase.enlaces) {
            // Formato viejo (objeto con youtube/powerpoint)
            if (clase.enlaces.youtube) {
                this.agregarEnlace();
                const items = document.querySelectorAll('#enlacesContainer .enlace-item');
                const ultimoItem = items[items.length - 1];
                ultimoItem.querySelector('.enlace-tipo').value = 'youtube';
                ultimoItem.querySelector('.enlace-url').value = clase.enlaces.youtube;
                ultimoItem.querySelector('.enlace-descripcion').value = 'Video de YouTube';
            }
            
            if (clase.enlaces.powerpoint) {
                this.agregarEnlace();
                const items = document.querySelectorAll('#enlacesContainer .enlace-item');
                const ultimoItem = items[items.length - 1];
                ultimoItem.querySelector('.enlace-tipo').value = 'powerpoint';
                ultimoItem.querySelector('.enlace-url').value = clase.enlaces.powerpoint;
                ultimoItem.querySelector('.enlace-descripcion').value = 'Presentación';
            }
        }
        
        // Si no hay enlaces, agregar uno vacío
        if (document.querySelectorAll('#enlacesContainer .enlace-item').length === 0) {
            this.agregarEnlace();
        }
        
        document.getElementById('claseNombre').value = clase.nombre || '';
        document.getElementById('claseDescripcion').value = clase.descripcion || '';
        
        if (clase.fechaClase) {
            const fecha = new Date(clase.fechaClase);
            document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
            document.getElementById('claseHora').value = fecha.toTimeString().slice(0, 5);
        }
        
        document.getElementById('claseInstructores').value = clase.instructores?.join(', ') || '';
        document.getElementById('claseEstado').value = clase.estado || 'activa';
        
        this.actualizarInfoVisibilidad(clase.estado || 'activa');
        
        document.getElementById('formTitle').innerHTML = '✏️ Editando: ' + clase.nombre;
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        document.getElementById('submitClaseBtn').textContent = '✏️ Actualizar Clase';
        
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
        document.getElementById('claseEstado').value = 'publicada';
        
        const container = document.getElementById('enlacesContainer');
        container.innerHTML = '';
        this.agregarEnlace();
        
        this.actualizarInfoVisibilidad('publicada');
        this.ocultarMensaje();
    }

    async eliminarClase(id) {
        if (!confirm('¿Está seguro de eliminar esta clase?')) return;

        try {
            await authSystem.makeRequest(`/clases-historicas/${id}`, null, 'DELETE');
            this.mostrarMensaje('✅ Clase eliminada correctamente', 'success');
            await this.cargarDatos();
        } catch (error) {
            this.mostrarMensaje('❌ Error al eliminar: ' + error.message, 'error');
        }
    }

    actualizarEstadisticas() {
        const total = this.data.length;
        const publicadas = this.data.filter(c => c.estado === 'publicada').length;
        const activas = this.data.filter(c => c.estado === 'activa' || !c.estado).length;
        const canceladas = this.data.filter(c => c.estado === 'cancelada').length;

        document.getElementById('totalClases').textContent = total;
        document.getElementById('clasesPublicadas').textContent = publicadas;
        document.getElementById('clasesActivas').textContent = activas;
        document.getElementById('clasesCanceladas').textContent = canceladas;
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.gestionClasesManager = new GestionClasesManager();
});