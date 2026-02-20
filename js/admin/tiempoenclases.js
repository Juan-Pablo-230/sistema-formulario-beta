// ============================================
// tiempoenclases.js - Versión para campos acumulativos
// ============================================

console.log('⏱️ tiempoenclases.js - Modo ACUMULATIVO');

class TiempoEnClasesManager {
    constructor() {
        this.data = [];
        this.filtros = {
            clase: 'todas',
            periodo: 'todo',
            usuario: ''
        };
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.setupEventListeners();
        this.cargarEstadisticas();
    }

    async cargarDatos() {
        try {
            console.log('📥 Cargando registros de tiempo desde MongoDB...');
            const result = await authSystem.makeRequest('/tiempo-clase', null, 'GET');
            this.data = result.data || [];
            console.log(`✅ ${this.data.length} registros cargados`);
            this.mostrarTabla();
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.mostrarError();
        }
    }

    async cargarEstadisticas() {
        try {
            const result = await authSystem.makeRequest('/tiempo-clase/estadisticas', null, 'GET');
            if (result.success) {
                document.getElementById('totalRegistros').textContent = result.data.totalRegistros;
                document.getElementById('usuariosDistintos').textContent = result.data.usuariosUnicos;
                document.getElementById('clasesDistintas').textContent = result.data.clasesUnicas;
                
                const totalSegundos = result.data.tiempoActivoTotal + result.data.tiempoInactivoTotal;
                document.getElementById('tiempoTotal').textContent = this.formatearTiempo(totalSegundos);
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    formatearTiempo(segundos) {
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        const segs = segundos % 60;
        
        if (horas > 0) return `${horas}h ${minutos}m`;
        if (minutos > 0) return `${minutos}m ${segs}s`;
        return `${segs}s`;
    }

    mostrarTabla() {
        const tbody = document.getElementById('tiemposBody');
        if (!tbody) return;

        if (this.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-message">No hay registros de tiempo</td></tr>`;
            return;
        }

        tbody.innerHTML = this.data.map((item, index) => {
            const activo = this.formatearTiempo(item.tiempoActivo || 0);
            const inactivo = this.formatearTiempo(item.tiempoInactivo || 0);
            const total = (item.tiempoActivo || 0) + (item.tiempoInactivo || 0);
            
            return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${item.usuarioNombre}</strong>
                    <button class="btn-info btn-small" onclick="tiemposManager.verDetalle('${item.usuarioId}')" title="Ver detalle">📋</button>
                </td>
                <td>${item.legajo}</td>
                <td>${item.claseNombre}</td>
                <td><span class="tiempo-badge activo">🟢 ${activo}</span></td>
                <td><span class="tiempo-badge inactivo">⚪ ${inactivo}</span></td>
                <td><span class="tiempo-badge total">📊 ${this.formatearTiempo(total)}</span></td>
            </tr>
        `}).join('');
    }

    async verDetalle(usuarioId) {
        try {
            const result = await authSystem.makeRequest(`/tiempo-clase/usuario/${usuarioId}`, null, 'GET');
            
            if (!result.success || !result.data) {
                alert('Error al cargar detalle');
                return;
            }
            
            const { usuario, registros } = result.data;
            
            const totalActivo = registros.reduce((sum, r) => sum + (r.tiempoActivo || 0), 0);
            const totalInactivo = registros.reduce((sum, r) => sum + (r.tiempoInactivo || 0), 0);
            
            const contenido = `
                <div class="detalle-usuario">
                    <h3>${usuario.apellidoNombre}</h3>
                    <div class="detalle-info">
                        <p><strong>Legajo:</strong> ${usuario.legajo}</p>
                        <p><strong>Email:</strong> ${usuario.email}</p>
                        <p><strong>Turno:</strong> ${usuario.turno || 'No especificado'}</p>
                    </div>
                    
                    <div class="detalle-resumen">
                        <div class="resumen-card activo">
                            <span class="label">Tiempo Activo</span>
                            <span class="value">${this.formatearTiempo(totalActivo)}</span>
                        </div>
                        <div class="resumen-card inactivo">
                            <span class="label">Tiempo Inactivo</span>
                            <span class="value">${this.formatearTiempo(totalInactivo)}</span>
                        </div>
                        <div class="resumen-card total">
                            <span class="label">Tiempo Total</span>
                            <span class="value">${this.formatearTiempo(totalActivo + totalInactivo)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detalle-clases">
                    <h4>📋 Detalle por clase</h4>
                    ${registros.map(r => `
                        <div class="clase-item">
                            <div class="clase-header">
                                <strong>${r.claseNombre}</strong>
                                <span class="fecha">${new Date(r.ultimaActualizacion).toLocaleDateString('es-AR')}</span>
                            </div>
                            <div class="clase-tiempos">
                                <span class="activo">🟢 Activo: ${this.formatearTiempo(r.tiempoActivo || 0)}</span>
                                <span class="inactivo">⚪ Inactivo: ${this.formatearTiempo(r.tiempoInactivo || 0)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            document.getElementById('detalleModalContent').innerHTML = contenido;
            document.getElementById('detalleModal').style.display = 'flex';
            
        } catch (error) {
            console.error('❌ Error cargando detalle:', error);
            alert('Error al cargar detalle');
        }
    }

    mostrarError() {
        const tbody = document.getElementById('tiemposBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="error-message">⚠️ Error al cargar los datos</td></tr>`;
        }
    }

    setupEventListeners() {
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.cargarDatos();
            this.cargarEstadisticas();
        });
        
        document.querySelectorAll('.close-modal').forEach(btn => {
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