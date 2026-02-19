// usuarios.js
console.log('👥 Módulo de Usuarios cargado');

class UsuariosManager {
    constructor() {
        this.data = [];
        this.inscripcionesData = []; // Para almacenar todas las inscripciones
        this.init();
    }

    async init() {
        await this.cargarDatos();
        await this.cargarInscripciones(); // Cargar inscripciones para el historial
        this.setupEventListeners();
    }

    async cargarDatos() {
        try {
            const result = await authSystem.makeRequest('/admin/usuarios', null, 'GET');
            this.data = result.data || [];
            console.log(`✅ ${this.data.length} usuarios cargados`);
            this.actualizarUI();
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            this.mostrarError();
        }
    }

    // Nuevo método para cargar todas las inscripciones
    async cargarInscripciones() {
        try {
            const result = await authSystem.makeRequest('/inscripciones', null, 'GET');
            this.inscripcionesData = result.data || [];
            console.log(`✅ ${this.inscripcionesData.length} inscripciones cargadas para historial`);
        } catch (error) {
            console.error('❌ Error cargando inscripciones:', error);
            this.inscripcionesData = [];
        }
    }

    actualizarUI() {
        this.mostrarTabla();
        this.actualizarEstadisticas();
    }

    mostrarTabla(filtro = '') {
        const tbody = document.getElementById('usuariosBody');
        if (!tbody) return;

        let usuariosFiltrados = this.data;
        
        if (filtro) {
            const termino = filtro.toLowerCase();
            usuariosFiltrados = this.data.filter(u => 
                (u.apellidoNombre?.toLowerCase().includes(termino)) ||
                (u.legajo?.toString().includes(termino)) ||
                (u.email?.toLowerCase().includes(termino))
            );
        }

        if (usuariosFiltrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        No hay usuarios para mostrar
                    </td>
                </tr>
            `;
            return;
        }

        const esAdmin = authSystem.isAdmin();

        tbody.innerHTML = usuariosFiltrados.map((usuario, index) => {
            // Calcular el total de asistencias para este usuario
            const asistencias = this.inscripcionesData.filter(ins => 
                ins.usuario?._id === usuario._id || ins.usuarioId === usuario._id
            ).length;

            return `
            <tr>
                <td>${index + 1}</td>
                <td>${usuario.apellidoNombre || 'N/A'}</td>
                <td>${usuario.legajo || 'N/A'}</td>
                <td>${usuario.email || 'N/A'}</td>
                <td>${usuario.turno || 'N/A'}</td>
                <td><span class="role-badge ${usuario.role || 'user'}">${this.getRoleText(usuario.role)}</span></td>
                <td>${usuario.fechaRegistro ? new Date(usuario.fechaRegistro).toLocaleString('es-AR') : 'N/A'}</td>
                <td>
                    <div class="user-actions">
                        ${esAdmin ? `
                            <select class="role-select" onchange="usuariosManager.cambiarRol('${usuario._id}', this.value)">
                                <option value="user" ${usuario.role === 'user' ? 'selected' : ''}>Usuario</option>
                                <option value="advanced" ${usuario.role === 'advanced' ? 'selected' : ''}>Avanzado</option>
                                <option value="admin" ${usuario.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                            <button class="btn-small btn-edit" onclick="usuariosManager.editarUsuario('${usuario._id}')" title="Editar usuario">✏️</button>
                            <button class="btn-small btn-danger" onclick="usuariosManager.eliminarUsuario('${usuario._id}')" title="Eliminar usuario">🗑️</button>
                        ` : '<span class="read-only">Solo lectura</span>'}
                        <!-- Nuevo botón para ver historial -->
                        <button class="btn-small btn-info" onclick="usuariosManager.verHistorial('${usuario._id}')" title="Ver historial de asistencia">
                            📋 Historial (${asistencias})
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    // Nuevo método para ver el historial
    async verHistorial(usuarioId) {
        const usuario = this.data.find(u => u._id === usuarioId);
        if (!usuario) return;

        // Filtrar inscripciones del usuario
        const asistencias = this.inscripcionesData.filter(ins => 
            ins.usuario?._id === usuarioId || ins.usuarioId === usuarioId
        );

        const total = asistencias.length;

        // Ordenar por fecha más reciente
        asistencias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Generar HTML para el modal
        let asistenciasHTML = '';
        if (asistencias.length === 0) {
            asistenciasHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Este usuario no tiene asistencias registradas.</p>';
        } else {
            asistenciasHTML = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <thead>
                        <tr style="background: var(--accent-color); color: white;">
                            <th style="padding: 12px; text-align: left;">Clase</th>
                            <th style="padding: 12px; text-align: left;">Turno</th>
                            <th style="padding: 12px; text-align: left;">Fecha de Inscripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${asistencias.map(ins => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 12px;">${ins.clase || 'N/A'}</td>
                                <td style="padding: 12px;">${ins.turno || 'N/A'}</td>
                                <td style="padding: 12px;">${ins.fecha ? new Date(ins.fecha).toLocaleString('es-AR') : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        const content = `
            <div style="padding: 20px;">
                <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--accent-color);">
                    <div style="margin-bottom: 10px;">
                        <strong style="font-size: 1.1em;">${usuario.apellidoNombre}</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; color: var(--text-secondary);">
                        <div>📋 Legajo: ${usuario.legajo}</div>
                        <div>📧 Email: ${usuario.email}</div>
                        <div>⏰ Turno: ${usuario.turno || 'No especificado'}</div>
                        <div>🎭 Rol: ${this.getRoleText(usuario.role)}</div>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, var(--success-500) 0%, #0f9d58 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <strong style="font-size: 1.3em;">Total de asistencias: ${total}</strong>
                </div>
                
                <h4 style="margin-bottom: 15px; color: var(--text-primary);">📅 Detalle de clases registradas:</h4>
                ${asistenciasHTML}
            </div>
        `;

        // Mostrar modal
        const modal = document.getElementById('historialModal');
        const contentDiv = document.getElementById('historialModalContent');
        const title = document.getElementById('historialModalTitle');
        
        if (modal && contentDiv && title) {
            title.textContent = `📋 Historial de Asistencia - ${usuario.apellidoNombre}`;
            contentDiv.innerHTML = content;
            modal.style.display = 'flex';
        }
    }

    getRoleText(role) {
        const roles = {
            'admin': '👑 Administrador',
            'advanced': '⭐ Avanzado',
            'user': '👤 Usuario'
        };
        return roles[role] || '👤 Usuario';
    }

    actualizarEstadisticas() {
        const total = this.data.length;
        const admins = this.data.filter(u => u.role === 'admin').length;
        const avanzados = this.data.filter(u => u.role === 'advanced').length;
        const estandar = this.data.filter(u => u.role === 'user' || !u.role).length;

        document.getElementById('totalUsuarios').textContent = total;
        document.getElementById('usuariosAdmin').textContent = admins;
        document.getElementById('usuariosAvanzados').textContent = avanzados;
        document.getElementById('usuariosEstandar').textContent = estandar;
    }

    mostrarError() {
        const tbody = document.getElementById('usuariosBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: #ff6b6b;">
                        ⚠️ Error al cargar los usuarios
                    </td>
                </tr>
            `;
        }
    }

    async cambiarRol(usuarioId, nuevoRol) {
        if (!authSystem.isAdmin()) {
            alert('Solo administradores pueden cambiar roles');
            return;
        }

        try {
            await authSystem.makeRequest(`/admin/usuarios/${usuarioId}/rol`, { role: nuevoRol }, 'PUT');
            await this.cargarDatos();
            alert('✅ Rol actualizado correctamente');
        } catch (error) {
            alert('❌ Error al cambiar rol: ' + error.message);
        }
    }

    abrirModal(usuario = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('userForm');
        const passwordGroup = document.getElementById('passwordGroup');
        
        if (usuario) {
            // Modo edición
            title.textContent = '✏️ Editar Usuario';
            document.getElementById('userId').value = usuario._id;
            document.getElementById('userNombre').value = usuario.apellidoNombre || '';
            document.getElementById('userLegajo').value = usuario.legajo || '';
            document.getElementById('userEmail').value = usuario.email || '';
            document.getElementById('userTurno').value = usuario.turno || '';
            document.getElementById('userRole').value = usuario.role || 'user';
            document.getElementById('userPassword').required = false;
            document.getElementById('userPassword').placeholder = 'Dejar en blanco para mantener';
            passwordGroup.style.display = 'block';
        } else {
            // Modo creación
            title.textContent = '➕ Crear Usuario';
            form.reset();
            document.getElementById('userId').value = '';
            document.getElementById('userPassword').required = true;
            document.getElementById('userPassword').placeholder = 'Mínimo 6 caracteres';
            passwordGroup.style.display = 'block';
        }
        
        modal.style.display = 'flex';
    }

    cerrarModal() {
        document.getElementById('userModal').style.display = 'none';
    }

    async guardarUsuario(event) {
        event.preventDefault();
        
        const formData = {
            apellidoNombre: document.getElementById('userNombre').value,
            legajo: document.getElementById('userLegajo').value,
            email: document.getElementById('userEmail').value,
            turno: document.getElementById('userTurno').value,
            role: document.getElementById('userRole').value
        };

        const password = document.getElementById('userPassword').value;
        if (password) {
            if (password.length < 6) {
                alert('La contraseña debe tener al menos 6 caracteres');
                return;
            }
            formData.password = password;
        }

        const userId = document.getElementById('userId').value;

        try {
            if (userId) {
                // Actualizar
                await authSystem.makeRequest(`/admin/usuarios/${userId}`, formData, 'PUT');
                if (password) {
                    await authSystem.makeRequest(`/admin/usuarios/${userId}/password`, { newPassword: password }, 'PUT');
                }
            } else {
                // Crear nuevo
                if (!password) {
                    alert('La contraseña es obligatoria para nuevos usuarios');
                    return;
                }
                await authSystem.makeRequest('/admin/usuarios', formData);
            }
            
            this.cerrarModal();
            await this.cargarDatos();
            alert(userId ? '✅ Usuario actualizado' : '✅ Usuario creado');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    }

    async eliminarUsuario(usuarioId) {
        if (!authSystem.isAdmin()) {
            alert('Solo administradores pueden eliminar usuarios');
            return;
        }

        const usuario = this.data.find(u => u._id === usuarioId);
        if (!usuario) return;

        if (usuario._id === authSystem.getCurrentUser()._id) {
            alert('No puedes eliminarte a ti mismo');
            return;
        }

        if (!confirm(`¿Eliminar al usuario ${usuario.apellidoNombre}?`)) return;

        try {
            await authSystem.makeRequest(`/admin/usuarios/${usuarioId}`, null, 'DELETE');
            await this.cargarDatos();
            alert('✅ Usuario eliminado');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    }

    setupEventListeners() {
        document.getElementById('createUserBtn')?.addEventListener('click', () => {
            this.abrirModal();
        });

        document.getElementById('searchUser')?.addEventListener('input', (e) => {
            this.mostrarTabla(e.target.value);
        });

        document.getElementById('refreshUsersBtn')?.addEventListener('click', async () => {
            await this.cargarDatos();
            await this.cargarInscripciones(); // Recargar inscripciones también
        });

        document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
            btn.addEventListener('click', () => this.cerrarModal());
        });

        // Cerrar modal de historial
        const closeHistorial = document.getElementById('closeHistorialModal');
        if (closeHistorial) {
            closeHistorial.addEventListener('click', () => {
                document.getElementById('historialModal').style.display = 'none';
            });
        }

        // Cerrar modal de historial haciendo click fuera
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('historialModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        document.getElementById('userForm')?.addEventListener('submit', (e) => this.guardarUsuario(e));

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('userModal');
            if (e.target === modal) this.cerrarModal();
        });
    }

    editarUsuario(usuarioId) {
        const usuario = this.data.find(u => u._id === usuarioId);
        if (usuario) {
            this.abrirModal(usuario);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.usuariosManager = new UsuariosManager();
});