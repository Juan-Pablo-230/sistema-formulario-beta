// ============================================
// tiempoenclases.js - Gestión de registros de tiempo
// ============================================

console.log('⏱️ tiempoenclases.js cargado');

class TiempoEnClasesManager {
    constructor() {
        this.data = [];
        this.usuarios = [];
        this.clases = [];
        this.filtros = {
            clase: 'todas',
            periodo: 'todo',
            usuario: ''
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando gestor de tiempos...');
        
        await this.cargarDatos();
        await this.cargarUsuarios();
        this.setupEventListeners();
        this.cargarEstadisticas();
    }

    async cargarDatos() {
        try {
            console.log('📥 Cargando registros de tiempo desde MongoDB...');
            
            const result = await authSystem.makeRequest('/tiempo-clase', null, 'GET');
            
            if (result.success && result.data) {
                this.data = result.data;
                console.log(`✅ ${this.data.length} registros de tiempo cargados`);
            } else {
                this.data = [];
                console.log('📭 No hay registros de tiempo');
            }
            
            this.actualizarUI();
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.mostrarError();
        }
    }

    async cargarUsuarios() {
        try {
            const result = await authSystem.makeRequest('/admin/usuarios', null, 'GET');
            this.usuarios = result.data || [];
            console.log(`✅ ${this.usuarios.length} usuarios cargados`);
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
        }
    }

    async cargarEstadisticas() {
        try {
            const result = await authSystem.makeRequest('/tiempo-clase/estadisticas', null, 'GET');
            
            if (result.success && result.data) {
                console.log('📊 Estadísticas:', result.data);
                // Aquí puedes usar los datos para gráficos si quieres
            }
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    }

    filtrarDatos() {
        let datos = [...this.data];

        // Filtrar por clase
        if (this.filtros.clase !== 'todas') {
            datos = datos.filter(d => d.claseNombre === this.filtros.clase);
        }

        // Filtrar por período
        const ahora = new Date();
        if (this.filtros.periodo === 'hoy') {
            const hoy = ahora.toDateString();
            datos = datos.filter(d => new Date(d.fechaRegistro).toDateString() === hoy);
        } else if (this.filtros.periodo === 'semana') {
            const semanaAtras = new Date(ahora.setDate(ahora.getDate() - 7));
            datos = datos.filter(d => new Date(d.fechaRegistro) >= semanaAtras);
        } else if (this.filtros.periodo === 'mes') {
            const mesAtras = new Date(ahora.setMonth(ahora.getMonth() - 1));
            datos = datos.filter(d => new Date(d.fechaRegistro) >= mesAtras);
        }

        // Filtrar por búsqueda de usuario
        if (this.filtros.usuario) {
            const termino = this.filtros.usuario.toLowerCase();
            datos = datos.filter(d => 
                d.usuarioNombre.toLowerCase().includes(termino) ||
                d.legajo.toLowerCase().includes(termino)
            );
        }

        return datos;
    }

    actualizarUI() {
        this.actualizarEstadisticas();
        this.mostrarTabla();
        this.actualizarFiltrosClase();
    }

    actualizarEstadisticas() {
        const datosFiltrados = this.filtrarDatos();
        
        // Total registros
        document.getElementById('totalRegistros').textContent = datosFiltrados.length;
        
        // Usuarios distintos
        const usuariosUnicos = new Set(datosFiltrados.map(d => d.legajo)).size;
        document.getElementById('usuariosDistintos').textContent = usuariosUnicos;
        
        // Clases distintas
        const clasesUnicas = new Set(datosFiltrados.map(d => d.claseNombre)).size;
        document.getElementById('clasesDistintas').textContent = clasesUnicas;
        
        // Tiempo total (en horas)
        const tiempoTotalSegundos = datosFiltrados.reduce((sum, d) => sum + d.tiempoSegundos, 0);
        const tiempoTotalHoras = (tiempoTotalSegundos / 3600).toFixed(1);
        document.getElementById('tiempoTotal').textContent = tiempoTotalHoras;
    }

    mostrarTabla() {
        const tbody = document.getElementById('tiemposBody');
        if (!tbody) return;

        const datosFiltrados = this.filtrarDatos();

        if (datosFiltrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-message">
                        No hay registros de tiempo para mostrar
                    </td>
                </tr>
            `;
            return;
        }

        // Ordenar por fecha más reciente
        datosFiltrados.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        tbody.innerHTML = datosFiltrados.map((item, index) => {
            const tiempoFormateado = this.formatearTiempo(item.tiempoSegundos);
            const fecha = new Date(item.fechaRegistro).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            const estadoClass = item.activo ? 'activo' : 'inactivo';
            const estadoTexto = item.activo ? '🟢 Activo' : '⚪ Inactivo';
            
            // Determinar si el tiempo es alto (más de 2 horas)
            const tiempoBadgeClass = item.tiempoSegundos > 7200 ? 'alto' : estadoClass;
            
            return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${item.usuarioNombre}</strong>
                    <button class="btn-info btn-small" onclick="tiemposManager.verDetalle('${item.usuarioId}')" title="Ver detalle">📋</button>
                </td>
                <td>${item.legajo}</td>
                <td><span class="turno-badge">${item.turno || 'No especificado'}</span></td>
                <td>${item.claseNombre}</td>
                <td><span class="tiempo-badge ${tiempoBadgeClass}">${tiempoFormateado}</span></td>
                <td>${fecha}</td>
                <td><span class="tiempo-badge ${estadoClass}">${estadoTexto}</span></td>
            </tr>
        `}).join('');
    }

    formatearTiempo(segundos) {
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        const segs = segundos % 60;
        
        if (horas > 0) {
            return `${horas}h ${minutos}m`;
        } else if (minutos > 0) {
            return `${minutos}m ${segs}s`;
        } else {
            return `${segs}s`;
        }
    }

    async verDetalle(usuarioId) {
        try {
            const result = await authSystem.makeRequest(`/tiempo-clase/usuario/${usuarioId}`, null, 'GET');
            
            if (!result.success || !result.data) {
                alert('Error al cargar detalle del usuario');
                return;
            }
            
            const { usuario, registros } = result.data;
            
            if (!usuario || registros.length === 0) return;
            
            const totalSegundos = registros.reduce((sum, r) => sum + r.tiempoSegundos, 0);
            
            const contenido = `
                <div class="detalle-usuario">
                    <h3>${usuario.apellidoNombre}</h3>
                    <div class="detalle-info">
                        <div class="detalle-item">
                            <span class="label">Legajo</span>
                            <span class="value">${usuario.legajo}</span>
                        </div>
                        <div class="detalle-item">
                            <span class="label">Turno</span>
                            <span class="value">${usuario.turno || 'No especificado'}</span>
                        </div>
                        <div class="detalle-item">
                            <span class="label">Email</span>
                            <span class="value">${usuario.email}</span>
                        </div>
                        <div class="detalle-item">
                            <span class="label">Total sesiones</span>
                            <span class="value">${registros.length}</span>
                        </div>
                        <div class="detalle-item">
                            <span class="label">Tiempo total</span>
                            <span class="value">${this.formatearTiempo(totalSegundos)}</span>
                        </div>
                    </div>
                </div>
                <div class="detalle-tiempos">
                    <h4>📋 Historial de sesiones</h4>
                    ${registros.map(r => `
                        <div class="tiempo-item">
                            <div>
                                <div class="clase">${r.claseNombre}</div>
                                <div class="fecha">${new Date(r.fechaRegistro).toLocaleDateString('es-AR')} ${new Date(r.fechaRegistro).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                            </div>
                            <div class="duracion">${this.formatearTiempo(r.tiempoSegundos)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            document.getElementById('detalleModalContent').innerHTML = contenido;
            document.getElementById('detalleModal').style.display = 'flex';
            
        } catch (error) {
            console.error('❌ Error cargando detalle:', error);
            alert('Error al cargar detalle del usuario');
        }
    }

    cargarFiltrosClase() {
        const clases = [...new Set(this.data.map(d => d.claseNombre))];
        const select = document.getElementById('filtroClase');
        
        if (!select) return;
        
        select.innerHTML = '<option value="todas">Todas las clases</option>';
        clases.sort().forEach(clase => {
            const option = document.createElement('option');
            option.value = clase;
            option.textContent = clase;
            select.appendChild(option);
        });
    }

    actualizarFiltrosClase() {
        const select = document.getElementById('filtroClase');
        if (!select) return;
        
        const valorActual = select.value;
        this.cargarFiltrosClase();
        
        // Restaurar selección si es posible
        if (Array.from(select.options).some(opt => opt.value === valorActual)) {
            select.value = valorActual;
        }
    }

    exportarCSV() {
        const datos = this.filtrarDatos();
        
        if (datos.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        const headers = ['Usuario', 'Legajo', 'Turno', 'Clase', 'Tiempo (segundos)', 'Tiempo formateado', 'Fecha', 'Estado'];
        const csv = [
            headers.join(','),
            ...datos.map(item => [
                `"${item.usuarioNombre}"`,
                `"${item.legajo}"`,
                `"${item.turno || ''}"`,
                `"${item.claseNombre}"`,
                item.tiempoSegundos,
                `"${this.formatearTiempo(item.tiempoSegundos)}"`,
                `"${new Date(item.fechaRegistro).toLocaleString('es-AR')}"`,
                item.activo ? 'Activo' : 'Inactivo'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `tiempos_clase_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
        URL.revokeObjectURL(url);
    }

    mostrarError() {
        const tbody = document.getElementById('tiemposBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="error-message">
                        ⚠️ Error al cargar los datos. Verifica la conexión con MongoDB.
                    </td>
                </tr>
            `;
        }
    }

    setupEventListeners() {
        // Filtro de clase
        document.getElementById('filtroClase')?.addEventListener('change', (e) => {
            this.filtros.clase = e.target.value;
            this.actualizarUI();
        });

        // Filtro de período
        document.getElementById('filtroPeriodo')?.addEventListener('change', (e) => {
            this.filtros.periodo = e.target.value;
            this.actualizarUI();
        });

        // Filtro de búsqueda
        document.getElementById('filtroUsuario')?.addEventListener('input', (e) => {
            this.filtros.usuario = e.target.value;
            this.actualizarUI();
        });

        // Botón actualizar
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.cargarDatos();
            this.cargarEstadisticas();
        });

        // Botón exportar
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportarCSV();
        });

        // Cerrar modal
        document.querySelectorAll('.close-modal, .close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('detalleModal').style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('detalleModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.tiemposManager = new TiempoEnClasesManager();
});