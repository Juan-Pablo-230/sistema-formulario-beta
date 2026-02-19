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

    // CORREGIDO: Método para cargar todas las inscripciones
    async cargarInscripciones() {
        try {
            console.log('📥 Cargando inscripciones para historial...');
            const result = await authSystem.makeRequest('/inscripciones', null, 'GET');
            
            // Verificar la estructura de los datos
            if (result.success && result.data) {
                this.inscripcionesData = result.data;
                console.log(`✅ ${this.inscripcionesData.length} inscripciones cargadas para historial`);
                
                // Mostrar las primeras inscripciones para debug
                if (this.inscripcionesData.length > 0) {
                    console.log('📋 Ejemplo de inscripción:', {
                        usuarioId: this.inscripcionesData[0].usuarioId,
                        usuario: this.inscripcionesData[0].usuario?._id,
                        clase: this.inscripcionesData[0].clase
                    });
                }
            } else {
                console.warn('⚠️ No se pudieron cargar las inscripciones');
                this.inscripcionesData = [];
            }
        } catch (error) {
            console.error('❌ Error cargando inscripciones:', error);
            this.inscripcionesData = [];
        }
    }

    // CORREGIDO: Método para contar asistencias de un usuario
    contarAsistenciasUsuario(usuarioId) {
        if (!this.inscripcionesData || this.inscripcionesData.length === 0) {
            return 0;
        }
        
        // Contar inscripciones que coincidan con el ID del usuario
        const asistencias = this.inscripcionesData.filter(ins => {
            // Verificar si el usuarioId está en usuario._id o en usuarioId
            const coincide = (ins.usuario && ins.usuario._id === usuarioId) || 
                            (ins.usuarioId === usuarioId);
            
            if (coincide) {
                console.log(`✅ Coincidencia encontrada para usuario ${usuarioId}:`, ins.clase);
            }
            
            return coincide;
        });
        
        return asistencias.length;
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
            // CORREGIDO: Calcular el total de asistencias para este usuario
            const asistencias = this.contarAsistenciasUsuario(usuario._id);

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
                        <!-- Botón de historial SOLO con icono -->
                        <button class="btn-small btn-info" onclick="usuariosManager.verHistorial('${usuario._id}')" title="Ver historial de asistencia (${asistencias} asistencias)">
                            📋
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    // CORREGIDO: Método para ver el historial
    async verHistorial(usuarioId) {
        const usuario = this.data.find(u => u._id === usuarioId);
        if (!usuario) return;

        // CORREGIDO: Filtrar inscripciones del usuario correctamente
        const asistencias = this.inscripcionesData.filter(ins => {
            // Intentar diferentes formas de coincidencia
            const coincide = (ins.usuario && ins.usuario._id === usuarioId) || 
                            (ins.usuarioId === usuarioId);
            
            if (coincide) {
                console.log(`📝 Asistencia encontrada para ${usuario.apellidoNombre}:`, ins.clase);
            }
            
            return coincide;
        });

        const total = asistencias.length;
        console.log(`📊 Total asistencias para ${usuario.apellidoNombre}: ${total}`);

        // Ordenar por fecha más reciente
        asistencias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Generar HTML para el modal
        let asistenciasHTML = '';
        if (asistencias.length === 0) {
            asistenciasHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Este usuario no tiene asistencias registradas.</p>';
        } else {
            asistenciasHTML = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background: var(--accent-color); color: white;">
                                <th style="padding: 12px; text-align: left;">#</th>
                                <th style="padding: 12px; text-align: left;">Clase</th>
                                <th style="padding: 12px; text-align: left;">Turno</th>
                                <th style="padding: 12px; text-align: left;">Fecha de Inscripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${asistencias.map((ins, index) => `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 12px;">${index + 1}</td>
                                    <td style="padding: 12px; font-weight: 500;">${ins.clase || 'N/A'}</td>
                                    <td style="padding: 12px;">${ins.turno || 'N/A'}</td>
                                    <td style="padding: 12px;">${ins.fecha ? new Date(ins.fecha).toLocaleString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    }) : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const content = `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-container) 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid var(--accent-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--text-primary);">${usuario.apellidoNombre}</h3>
                        <span class="role-badge ${usuario.role || 'user'}">${this.getRoleText(usuario.role)}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; color: var(--text-secondary);">
                        <div><strong>📋 Legajo:</strong> ${usuario.legajo}</div>
                        <div><strong>📧 Email:</strong> ${usuario.email}</div>
                        <div><strong>⏰ Turno:</strong> ${usuario.turno || 'No especificado'}</div>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, var(--success-500) 0%, #0f9d58 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 5px;">Total de asistencias</div>
                    <strong style="font-size: 2.5em;">${total}</strong>
                </div>
                
                <h4 style="margin-bottom: 15px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                    <span>📅</span> Detalle de clases registradas
                </h4>
                ${asistenciasHTML}
            </div>
        `;

        // Mostrar modal
        const modal = document.getElementById('historialModal');
        const contentDiv = document.getElementById('historialModalContent');
        const title = document.getElementById('historialModalTitle');
        
        if (modal && contentDiv && title) {
            title.textContent = `📋 Historial de Asistencia`;
            contentDiv.innerHTML = content;
            modal.style.display = 'flex';
            
            console.log(`✅ Modal abierto para ${usuario.apellidoNombre} con ${total} asistencias`);
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
            await this.cargarInscripciones(); // Recargar inscripciones también
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
            const btn = document.getElementById('refreshUsersBtn');
            const originalText = btn.textContent;
            btn.textContent = '🔄 Actualizando...';
            btn.disabled = true;
            
            await this.cargarDatos();
            await this.cargarInscripciones(); // Recargar inscripciones también
            
            btn.textContent = originalText;
            btn.disabled = false;
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