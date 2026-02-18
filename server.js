const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectToDatabase, getDB, mongoDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN INICIAL ====================
console.log('🚀 Iniciando Sistema de Formularios MongoDB...');
console.log('📋 Environment check:');
console.log('- Node version:', process.version);
console.log('- PORT:', PORT);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'DEFINIDA' : 'NO DEFINIDA');

// ==================== MIDDLEWARES BÁSICOS ====================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==================== RUTAS DE DIAGNÓSTICO ====================
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('MONGODB_URI defined:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);

// ==================== RUTAS DE HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check request recibido');
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongoDB: mongoDB.isConnected ? 'CONECTADO' : 'NO CONECTADO'
    });
});

app.get('/api/test/simple', (req, res) => {
    console.log('✅ Ruta de prueba GET llamada');
    res.json({ 
        success: true, 
        message: 'Test GET funciona',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/debug/routes', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas API disponibles',
        routes: [
            '/api/health',
            '/api/test/simple',
            '/api/init-db',
            '/api/auth/login (POST)',
            '/api/auth/register (POST)',
            '/api/auth/check-legajo/:legajo',
            '/api/inscripciones',
            '/api/inscripciones/verificar/:usuarioId/:clase',
            '/api/material/solicitudes',
            '/api/admin/usuarios',
            '/api/debug/mongo',
            '/api/env-check'
        ],
        timestamp: new Date().toISOString()
    });
});

app.get('/api/env-check', (req, res) => {
    res.json({
        mongoDB_URI: process.env.MONGODB_URI ? 'DEFINED' : 'NOT DEFINED',
        mongoDB_URI_length: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
        allVariables: Object.keys(process.env).sort()
    });
});

// ==================== RUTAS DE AUTENTICACIÓN ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Intento de login recibido:', { identifier: req.body.identifier });
        const { identifier, password } = req.body;
        
        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email/legajo y contraseña requeridos' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Buscar usuario por email o legajo
        const usuario = await db.collection('usuarios').findOne({
            $or: [
                { email: identifier },
                { legajo: identifier.toString() }
            ]
        });

        console.log('🔍 Usuario encontrado:', usuario ? 'Sí' : 'No');
        
        if (!usuario) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña
        if (usuario.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña incorrecta'
            });
        }

        // Remover password de la respuesta
        const { password: _, ...usuarioSinPassword } = usuario;
        
        res.json({ 
            success: true, 
            message: 'Login exitoso', 
            data: usuarioSinPassword 
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Registro de usuario:', req.body);
        const { apellidoNombre, legajo, turno, email, password, role = 'user' } = req.body;
        
        // Validaciones básicas
        if (!apellidoNombre || !legajo || !turno || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar si el usuario ya existe
        const usuarioExistente = await db.collection('usuarios').findOne({
            $or: [
                { email: email },
                { legajo: legajo.toString() }
            ]
        });
        
        if (usuarioExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email o legajo ya están registrados' 
            });
        }
        
        // Crear nuevo usuario
        const nuevoUsuario = {
            apellidoNombre,
            legajo: legajo.toString(),
            turno,
            email,
            password,
            role,
            fechaRegistro: new Date()
        };
        
        const result = await db.collection('usuarios').insertOne(nuevoUsuario);
        
        // Remover password de la respuesta
        const { password: _, ...usuarioCreado } = nuevoUsuario;
        usuarioCreado._id = result.insertedId;
        
        res.json({ 
            success: true, 
            message: 'Usuario registrado exitosamente', 
            data: usuarioCreado 
        });
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/auth/check-legajo/:legajo', async (req, res) => {
    try {
        const { legajo } = req.params;
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const usuarioExistente = await db.collection('usuarios').findOne({ 
            legajo: legajo.toString() 
        });
        
        res.json({ 
            success: true, 
            data: { exists: !!usuarioExistente } 
        });
        
    } catch (error) {
        console.error('❌ Error verificando legajo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== RUTAS DE INSCRIPCIONES ====================
app.post('/api/inscripciones', async (req, res) => {
    try {
        const { usuarioId, clase, turno } = req.body;
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar si ya está inscrito
        const inscripcionExistente = await db.collection('inscripciones').findOne({
            usuarioId: new ObjectId(usuarioId),
            clase: clase
        });
        
        if (inscripcionExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya estás inscrito en esta clase' 
            });
        }
        
        // Crear nueva inscripción
        const nuevaInscripcion = {
            usuarioId: new ObjectId(usuarioId),
            clase,
            turno,
            fecha: new Date()
        };
        
        await db.collection('inscripciones').insertOne(nuevaInscripcion);
        
        res.json({ 
            success: true, 
            message: 'Inscripción registrada exitosamente' 
        });
        
    } catch (error) {
        console.error('❌ Error registrando inscripción:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/inscripciones/verificar/:usuarioId/:clase', async (req, res) => {
    try {
        const { usuarioId, clase } = req.params;
        
        console.log('🔍 Verificando inscripción para:', { usuarioId, clase });
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Primero intentar como ObjectId
        let objectId;
        if (ObjectId.isValid(usuarioId)) {
            objectId = new ObjectId(usuarioId);
        } else {
            // Si no es ObjectId válido, buscar por legajo
            const usuario = await db.collection('usuarios').findOne({ 
                legajo: usuarioId.toString() 
            });
            
            if (!usuario) {
                return res.json({ 
                    success: true, 
                    data: { exists: false } 
                });
            }
            
            objectId = usuario._id;
        }
        
        const inscripcionExistente = await db.collection('inscripciones').findOne({
            usuarioId: objectId,
            clase: decodeURIComponent(clase)
        });
        
        console.log('📊 Inscripción existe:', !!inscripcionExistente);
        
        res.json({ 
            success: true, 
            data: { exists: !!inscripcionExistente } 
        });
        
    } catch (error) {
        console.error('❌ Error verificando inscripción:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/inscripciones', async (req, res) => {
    try {
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Obtener todas las inscripciones con datos del usuario
        const inscripciones = await db.collection('inscripciones')
            .aggregate([
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'usuarioId',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                { $unwind: '$usuario' },
                // Ordenar por fecha más reciente
                { $sort: { fecha: -1 } }
            ])
            .toArray();
        
        // Formatear fechas para respuesta
        const inscripcionesFormateadas = inscripciones.map(insc => {
            const inscripcion = { ...insc };
            
            // Formatear fecha si existe
            if (inscripcion.fecha instanceof Date) {
                inscripcion.fecha = inscripcion.fecha.toISOString();
            }
            
            // Eliminar password del usuario por seguridad
            if (inscripcion.usuario && inscripcion.usuario.password) {
                delete inscripcion.usuario.password;
            }
            
            return inscripcion;
        });
        
        console.log(`📋 ${inscripcionesFormateadas.length} inscripciones obtenidas`);
        
        res.json({ 
            success: true, 
            data: inscripcionesFormateadas 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo inscripciones:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/inscripciones/estadisticas', async (req, res) => {
    try {
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Obtener todas las inscripciones
        const inscripciones = await db.collection('inscripciones')
            .aggregate([
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'usuarioId',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                { $unwind: '$usuario' }
            ])
            .toArray();
        
        console.log(`📊 Total inscripciones para estadísticas: ${inscripciones.length}`);
        
        // Calcular estadísticas
        const hoy = new Date().toISOString().split('T')[0];
        
        const inscripcionesHoy = inscripciones.filter(i => {
            if (!i.fecha) return false;
            
            // Convertir fecha a string para comparación
            let fechaStr;
            if (i.fecha instanceof Date) {
                fechaStr = i.fecha.toISOString().split('T')[0];
            } else if (typeof i.fecha === 'string') {
                fechaStr = i.fecha.split('T')[0];
            } else {
                return false;
            }
            
            return fechaStr === hoy;
        }).length;
        
        // Estadísticas por clase
        const porClase = {};
        inscripciones.forEach(insc => {
            if (insc.clase) {
                porClase[insc.clase] = (porClase[insc.clase] || 0) + 1;
            }
        });
        
        // Estadísticas por turno
        const porTurno = {};
        inscripciones.forEach(insc => {
            if (insc.turno) {
                porTurno[insc.turno] = (porTurno[insc.turno] || 0) + 1;
            }
        });
        
        // Preparar últimas inscripciones para mostrar
        const ultimas = inscripciones.slice(0, 10).map(insc => {
            let fechaFormateada = 'Fecha no disponible';
            if (insc.fecha instanceof Date) {
                fechaFormateada = insc.fecha.toLocaleString({hour12: false}, 'es-AR');
            } else if (typeof insc.fecha === 'string') {
                fechaFormateada = new Date(insc.fecha).toLocaleString({hour12: false}, 'es-AR');
            }
            
            return {
                usuario: insc.usuario?.apellidoNombre || 'N/A',
                clase: insc.clase || 'N/A',
                fecha: fechaFormateada
            };
        });
        
        res.json({ 
            success: true, 
            data: {
                total: inscripciones.length,
                hoy: inscripcionesHoy,
                porClase: porClase,
                porTurno: porTurno,
                ultimas: ultimas
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de inscripciones:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== RUTAS DE CLASES HISTÓRICAS (GESTIÓN VISUAL) ====================

// Obtener todas las clases históricas (ACTIVAS E INACTIVAS)
app.get('/api/clases-historicas', async (req, res) => {
    try {
        console.log('📥 GET /api/clases-historicas');
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Eliminar el filtro { activa: { $ne: false } } para mostrar TODAS las clases
        const clases = await db.collection('clases')
            .find({}) // ← Sin filtro, muestra todas (activas e inactivas)
            .sort({ fechaClase: -1 })
            .toArray();
        
        console.log(`✅ ${clases.length} clases históricas obtenidas (${clases.filter(c => c.activa).length} activas, ${clases.filter(c => !c.activa).length} inactivas)`);
        
        res.json({ 
            success: true, 
            data: clases 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo clases históricas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Obtener una clase específica por ID
app.get('/api/clases-historicas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📥 GET /api/clases-historicas/${id}`);
        
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID inválido' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const clase = await db.collection('clases').findOne({ 
            _id: new ObjectId(id) 
        });
        
        if (!clase) {
            return res.status(404).json({ 
                success: false, 
                message: 'Clase no encontrada' 
            });
        }
        
        res.json({ 
            success: true, 
            data: clase 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo clase:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Crear nueva clase histórica
app.post('/api/clases-historicas', async (req, res) => {
    try {
        const userHeader = req.headers['user-id'];
        console.log('📥 POST /api/clases-historicas - Usuario:', userHeader);
        
        if (!userHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar que es admin
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (!usuario || usuario.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Solo administradores pueden crear clases' 
            });
        }
        
        const { nombre, descripcion, fechaClase, enlaces, activa, instructores, tags } = req.body;
        
        // Validaciones básicas
        if (!nombre || !fechaClase || !enlaces?.youtube || !enlaces?.powerpoint) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan campos requeridos' 
            });
        }
        
        // Crear fecha manteniendo la hora local
        const fecha = new Date(fechaClase);
        
        const nuevaClase = {
            nombre,
            descripcion: descripcion || '',
            fechaClase: fecha,
            enlaces: {
                youtube: enlaces.youtube,
                powerpoint: enlaces.powerpoint
            },
            activa: activa !== false,
            instructores: instructores || [],
            tags: tags || [],
            fechaCreacion: new Date(),
            creadoPor: new ObjectId(userHeader)
        };
        
        const result = await db.collection('clases').insertOne(nuevaClase);
        
        console.log('✅ Clase creada:', result.insertedId);
        console.log('📅 Fecha guardada:', fecha);
        console.log('🔘 Activa:', nuevaClase.activa);
        
        res.json({ 
            success: true, 
            message: 'Clase creada exitosamente',
            data: { ...nuevaClase, _id: result.insertedId }
        });
        
    } catch (error) {
        console.error('❌ Error creando clase:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Actualizar clase histórica
app.put('/api/clases-historicas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userHeader = req.headers['user-id'];
        console.log(`📥 PUT /api/clases-historicas/${id} - Usuario:`, userHeader);
        
        if (!userHeader || !ObjectId.isValid(id)) {
            return res.status(401).json({ 
                success: false, 
                message: 'Solicitud inválida' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar que es admin
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (!usuario || usuario.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Solo administradores pueden actualizar clases' 
            });
        }
        
        const { nombre, descripcion, fechaClase, enlaces, activa, instructores, tags } = req.body;
        
        // Validaciones básicas
        if (!nombre || !fechaClase || !enlaces?.youtube || !enlaces?.powerpoint) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan campos requeridos' 
            });
        }
        
        const fecha = new Date(fechaClase);
        
        const updateData = {
            $set: {
                nombre,
                descripcion: descripcion || '',
                fechaClase: fecha,
                enlaces: {
                    youtube: enlaces.youtube,
                    powerpoint: enlaces.powerpoint
                },
                activa: activa !== false,
                instructores: instructores || [],
                tags: tags || [],
                fechaActualizacion: new Date()
            }
        };
        
        const result = await db.collection('clases').updateOne(
            { _id: new ObjectId(id) },
            updateData
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Clase no encontrada' 
            });
        }
        
        console.log('✅ Clase actualizada:', id);
        console.log('🔘 Estado activa:', activa);
        
        res.json({ 
            success: true, 
            message: 'Clase actualizada exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error actualizando clase:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Eliminar clase histórica
app.delete('/api/clases-historicas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userHeader = req.headers['user-id'];
        console.log(`📥 DELETE /api/clases-historicas/${id} - Usuario:`, userHeader);
        
        if (!userHeader || !ObjectId.isValid(id)) {
            return res.status(401).json({ 
                success: false, 
                message: 'Solicitud inválida' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar que es admin
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (!usuario || usuario.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Solo administradores pueden eliminar clases' 
            });
        }
        
        const result = await db.collection('').deleteOne({
            _id: new ObjectId(id)
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Clase no encontrada' 
            });
        }
        
        console.log('✅ Clase eliminada:', id);
        
        res.json({ 
            success: true, 
            message: 'Clase eliminada exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error eliminando clase:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== RUTAS DE MATERIAL HISTÓRICO (SOLICITUDES) ====================

// Guardar solicitud de material histórico
app.post('/api/material-historico/solicitudes', async (req, res) => {
    try {
        const userHeader = req.headers['user-id'];
        
        console.log('📦 POST /material-historico/solicitudes - Headers user-id:', userHeader);
        
        if (!userHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado - Falta user-id en headers' 
            });
        }
        
        const { claseId, claseNombre, email, youtube, powerpoint } = req.body;
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar que el usuario existe
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (!usuario) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // Verificar si ya solicitó esta clase
        const solicitudExistente = await db.collection('solicitudMaterial').findOne({
            usuarioId: new ObjectId(userHeader),
            claseId: claseId
        });
        
        if (solicitudExistente) {
            // Si ya existe, devolvemos los enlaces pero no creamos duplicado
            return res.json({ 
                success: true, 
                message: 'Material ya solicitado anteriormente',
                data: solicitudExistente,
                exists: true
            });
        }
        
        // Crear nueva solicitud
        const nuevaSolicitud = {
            usuarioId: new ObjectId(userHeader),
            claseId: claseId,
            claseNombre: claseNombre,
            email: email,
            youtube: youtube,
            powerpoint: powerpoint,
            fechaSolicitud: new Date()
        };
        
        await db.collection('solicitudMaterial').insertOne(nuevaSolicitud);
        
        res.json({ 
            success: true, 
            message: 'Solicitud de material histórico registrada exitosamente',
            data: nuevaSolicitud
        });
        
    } catch (error) {
        console.error('❌ Error registrando solicitud de material histórico:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Obtener solicitudes de material histórico
app.get('/api/material-historico/solicitudes', async (req, res) => {
    try {
        const userHeader = req.headers['user-id'];
        
        console.log('📦 GET /material-historico/solicitudes - Headers user-id:', userHeader);
        
        if (!userHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado - Falta user-id en headers' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar que el usuario existe
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (!usuario) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // Si es admin, puede ver todas las solicitudes
        // Si no es admin, solo puede ver las suyas
        let matchCriteria = { usuarioId: new ObjectId(userHeader) };
        
        if (usuario.role === 'admin') {
            console.log('👑 Admin: viendo TODAS las solicitudes de material histórico');
            matchCriteria = {};
        }
        
        // Obtener solicitudes con datos del usuario
        const solicitudes = await db.collection('solicitudMaterial')
            .aggregate([
                {
                    $match: matchCriteria
                },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'usuarioId',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                { $unwind: { path: '$usuario', preserveNullAndEmptyArrays: true } },
                { $sort: { fechaSolicitud: -1 } }
            ])
            .toArray();
        
        console.log(`📊 Encontradas ${solicitudes.length} solicitudes de material histórico`);
        
        res.json({ 
            success: true, 
            data: solicitudes 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo solicitudes de material histórico:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Obtener estadísticas de material histórico
app.get('/api/material-historico/estadisticas', async (req, res) => {
    try {
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const totalSolicitudes = await db.collection('solicitudMaterial').countDocuments();
        
        // Clases más solicitadas
        const clasesPopulares = await db.collection('solicitudMaterial')
            .aggregate([
                { $group: { _id: '$claseNombre', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ])
            .toArray();
        
        // Solicitudes por día (últimos 30 días)
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 30);
        
        const solicitudesPorDia = await db.collection('solicitudMaterial')
            .aggregate([
                { $match: { fechaSolicitud: { $gte: fechaLimite } } },
                { 
                    $group: { 
                        _id: { 
                            $dateToString: { format: '%Y-%m-%d', date: '$fechaSolicitud' } 
                        }, 
                        count: { $sum: 1 } 
                    } 
                },
                { $sort: { _id: 1 } }
            ])
            .toArray();
        
        res.json({ 
            success: true, 
            data: {
                total: totalSolicitudes,
                clasesPopulares: clasesPopulares,
                solicitudesPorDia: solicitudesPorDia
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Inicializar colección de material histórico
app.get('/api/material-historico/init', async (req, res) => {
    try {
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar/crear colección de clases históricas
        const clasesHistoricasExists = await db.listCollections({ name: 'clases' }).hasNext();
        if (!clasesHistoricasExists) {
            console.log('📝 Creando colección "clases"...');
            await db.createCollection('clases');
            
            await db.collection('clases').createIndex({ fechaClase: -1 });
            await db.collection('clases').createIndex({ nombre: 1 });
            
            // Insertar algunas clases de ejemplo
            const clasesEjemplo = [
                {
                    nombre: "Telemetría Avanzada",
                    descripcion: "Clase grabada sobre monitoreo cardíaco y telemetría",
                    fechaClase: new Date('2026-02-10'),
                    enlaces: {
                        youtube: "https://www.youtube.com/watch?v=telemetria2026",
                        powerpoint: "https://docs.google.com/presentation/d/1-telemetria"
                    },
                    activa: true,
                    fechaCreacion: new Date()
                },
                {
                    nombre: "Rotación de Personal en Salud",
                    descripcion: "Estrategias y mejores prácticas para rotación de personal",
                    fechaClase: new Date('2026-02-11'),
                    enlaces: {
                        youtube: "https://www.youtube.com/watch?v=rotacion2026",
                        powerpoint: "https://docs.google.com/presentation/d/1-rotacion"
                    },
                    activa: true,
                    fechaCreacion: new Date()
                }
            ];
            
            await db.collection('clases').insertMany(clasesEjemplo);
            console.log('✅ Clases de ejemplo insertadas');
        }
        
        // Verificar/crear colección de material histórico
        const materialHistoricoExists = await db.listCollections({ name: 'solicitudMaterial' }).hasNext();
        if (!materialHistoricoExists) {
            console.log('📝 Creando colección "solicitudMaterial"...');
            await db.createCollection('solicitudMaterial');
            
            await db.collection('solicitudMaterial').createIndex({ usuarioId: 1, claseId: 1 });
            await db.collection('solicitudMaterial').createIndex({ fechaSolicitud: -1 });
            await db.collection('solicitudMaterial').createIndex({ claseId: 1 });
            
            console.log('✅ Colección "solicitudMaterial" creada con índices');
        }
        
        res.json({ 
            success: true, 
            message: 'Sistema de material histórico inicializado',
            clasesHistoricas: clasesHistoricasExists ? 'existe' : 'creada',
            materialHistorico: materialHistoricoExists ? 'existe' : 'creada'
        });
        
    } catch (error) {
        console.error('❌ Error inicializando material histórico:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== RUTAS DE ADMINISTRACIÓN ====================
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const usuarios = await db.collection('usuarios')
            .find({}, { projection: { password: 0 } }) // Excluir password
            .toArray();
        
        res.json({ 
            success: true, 
            data: usuarios 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

app.post('/api/admin/usuarios', async (req, res) => {
    try {
        const { apellidoNombre, legajo, turno, email, password, role = 'user' } = req.body;
        
        if (!apellidoNombre || !legajo || !turno || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar si el usuario ya existe
        const usuarioExistente = await db.collection('usuarios').findOne({
            $or: [
                { email: email },
                { legajo: legajo.toString() }
            ]
        });
        
        if (usuarioExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email o legajo ya están registrados' 
            });
        }
        
        // Crear nuevo usuario
        const nuevoUsuario = {
            apellidoNombre,
            legajo: legajo.toString(),
            turno,
            email,
            password,
            role,
            fechaRegistro: new Date()
        };
        
        const result = await db.collection('usuarios').insertOne(nuevoUsuario);
        
        // Remover password de la respuesta
        const { password: _, ...usuarioCreado } = nuevoUsuario;
        usuarioCreado._id = result.insertedId;
        
        res.json({ 
            success: true, 
            message: 'Usuario creado exitosamente', 
            data: usuarioCreado 
        });
        
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.put('/api/admin/usuarios/:id/rol', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!['admin', 'advanced', 'user'].includes(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Rol inválido' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const result = await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $set: { role: role } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Rol actualizado correctamente' 
        });
        
    } catch (error) {
        console.error('❌ Error actualizando rol:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.put('/api/admin/usuarios/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        console.log('🔐 Cambiando contraseña para usuario ID:', id);
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'La nueva contraseña debe tener al menos 6 caracteres' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Actualizar contraseña
        const result = await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $set: { password: newPassword } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Contraseña cambiada correctamente' 
        });
        
    } catch (error) {
        console.error('❌ Error cambiando contraseña:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.put('/api/admin/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { apellidoNombre, legajo, email, turno } = req.body;
        
        console.log('✏️ Editando usuario ID:', id, 'Datos:', req.body);
        
        if (!apellidoNombre || !legajo || !email || !turno) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar si el nuevo legajo o email ya existen en otro usuario
        const usuarioExistente = await db.collection('usuarios').findOne({
            $and: [
                { _id: { $ne: new ObjectId(id) } },
                { $or: [
                    { legajo: legajo.toString() },
                    { email: email }
                ]}
            ]
        });
        
        if (usuarioExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email o legajo ya están registrados por otro usuario' 
            });
        }
        
        // Actualizar usuario
        const result = await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $set: { 
                apellidoNombre, 
                legajo: legajo.toString(), 
                email, 
                turno 
            }}
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Usuario actualizado correctamente' 
        });
        
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Eliminando usuario con ID:', id);
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar que el usuario existe
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(id) 
        });
        
        if (!usuario) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // No permitir eliminar al usuario actual
        const currentUserId = req.headers['user-id'];
        if (currentUserId === id) {
            return res.status(400).json({ 
                success: false, 
                message: 'No puedes eliminarte a ti mismo' 
            });
        }
        
        // Eliminar el usuario
        const result = await db.collection('usuarios').deleteOne({ 
            _id: new ObjectId(id) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        console.log('✅ Usuario eliminado:', usuario.apellidoNombre);
        
        res.json({ 
            success: true, 
            message: `Usuario ${usuario.apellidoNombre} eliminado correctamente` 
        });
        
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== RUTAS DE USUARIO (para perfil) ====================
app.put('/api/usuarios/perfil', async (req, res) => {
    try {
        const userHeader = req.headers['user-id'];
        
        console.log('✏️ Actualizando perfil para usuario ID:', userHeader);
        
        if (!userHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado' 
            });
        }
        
        const { apellidoNombre, legajo, turno, email, password, currentPassword } = req.body;
        
        // Validaciones
        if (!apellidoNombre || !legajo || !turno || !email || !currentPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar usuario actual
        const usuarioActual = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (!usuarioActual) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // Verificar contraseña actual
        if (usuarioActual.password !== currentPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña actual incorrecta' 
            });
        }
        
        // Verificar si el nuevo legajo o email ya existen (excluyendo el usuario actual)
        if (legajo !== usuarioActual.legajo || email !== usuarioActual.email) {
            const usuarioExistente = await db.collection('usuarios').findOne({
                $and: [
                    { _id: { $ne: new ObjectId(userHeader) } },
                    { $or: [
                        { legajo: legajo.toString() },
                        { email: email }
                    ]}
                ]
            });
            
            if (usuarioExistente) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El email o legajo ya están registrados por otro usuario' 
                });
            }
        }
        
        // Preparar datos para actualizar
        const updateData = {
            apellidoNombre,
            legajo: legajo.toString(),
            turno,
            email
        };
        
        // Si se proporciona nueva contraseña, añadirla
        if (password && password.length >= 6) {
            updateData.password = password;
        }
        
        // Actualizar usuario
        const result = await db.collection('usuarios').updateOne(
            { _id: new ObjectId(userHeader) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // Obtener usuario actualizado (sin password)
        const usuarioActualizado = await db.collection('usuarios').findOne(
            { _id: new ObjectId(userHeader) },
            { projection: { password: 0 } }
        );
        
        console.log('✅ Perfil actualizado:', usuarioActualizado.apellidoNombre);
        
        res.json({ 
            success: true, 
            message: 'Perfil actualizado correctamente',
            data: usuarioActualizado 
        });
        
    } catch (error) {
        console.error('❌ Error actualizando perfil:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.delete('/api/usuarios/cuenta', async (req, res) => {
    try {
        const userHeader = req.headers['user-id'];
        
        console.log('🗑️ Eliminando cuenta para usuario ID:', userHeader);
        
        if (!userHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado' 
            });
        }
        
        const { currentPassword } = req.body;
        
        if (!currentPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'La contraseña actual es requerida' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar usuario
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (!usuario) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // Verificar contraseña
        if (usuario.password !== currentPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña incorrecta' 
            });
        }
        
        // Eliminar usuario
        const result = await db.collection('usuarios').deleteOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        console.log('✅ Cuenta eliminada:', usuario.apellidoNombre);
        
        res.json({ 
            success: true, 
            message: 'Cuenta eliminada correctamente' 
        });
        
    } catch (error) {
        console.error('❌ Error eliminando cuenta:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== INICIALIZACIÓN DE BASE DE DATOS ====================
app.get('/api/init-db', async (req, res) => {
    try {
        console.log('🔄 Inicializando base de datos...');
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar/Crear colecciones
        const collections = ['usuarios', 'inscripciones', 'material', 'clases', 'clases', 'solicitudMaterial'];
        
        for (const collectionName of collections) {
            const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
            
            if (!collectionExists) {
                console.log(`📝 Creando colección "${collectionName}"...`);
                await db.createCollection(collectionName);
                
                // Crear índices según la colección
                if (collectionName === 'usuarios') {
                    await db.collection(collectionName).createIndex({ email: 1 }, { unique: true });
                    await db.collection(collectionName).createIndex({ legajo: 1 }, { unique: true });
                    console.log(`✅ Índices creados para "${collectionName}"`);
                } else if (collectionName === 'inscripciones') {
                    await db.collection(collectionName).createIndex({ usuarioId: 1, clase: 1 }, { unique: true });
                    console.log(`✅ Índices creados para "${collectionName}"`);
                } else if (collectionName === 'material') {
                    await db.collection(collectionName).createIndex({ usuarioId: 1, clase: 1 });
                    await db.collection(collectionName).createIndex({ fechaSolicitud: -1 });
                    console.log(`✅ Índices creados para "${collectionName}"`);
                } else if (collectionName === 'clases') {
                    await db.collection(collectionName).createIndex({ fechaClase: -1 });
                    await db.collection(collectionName).createIndex({ nombre: 1 });
                    console.log(`✅ Índices creados para "${collectionName}"`);
                } else if (collectionName === 'solicitudMaterial') {
                    await db.collection(collectionName).createIndex({ usuarioId: 1, claseId: 1 });
                    await db.collection(collectionName).createIndex({ fechaSolicitud: -1 });
                    console.log(`✅ Índices creados para "${collectionName}"`);
                }
                
                console.log(`✅ Colección "${collectionName}" creada`);
            } else {
                console.log(`✅ Colección "${collectionName}" ya existe`);
            }
        }
        
        // Crear usuario admin por defecto si no existe
        const adminExists = await db.collection('usuarios').findOne({ email: 'admin@example.com' });
        if (!adminExists) {
            const adminUser = {
                apellidoNombre: 'Administrador',
                legajo: '99999',
                turno: 'Turno mañana',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'admin',
                fechaRegistro: new Date()
            };
            
            await db.collection('usuarios').insertOne(adminUser);
            console.log('✅ Usuario admin creado por defecto');
        }
        
        // Crear clase por defecto si no existe
        const claseExists = await db.collection('clases').findOne({ 
            nombre: 'Aislamientos y casos clínicos' 
        });
        if (!claseExists) {
            const clase = {
                nombre: "Aislamientos y casos clínicos",
                descripcion: "Lic. Romina Seminario, Lic. Mirta Díaz",
                fechaClase: new Date('2025-12-04'),
                fechaCierre: new Date('2025-12-04T10:00:00'),
                activa: true,
                instructores: ["Lic. Romina Seminario", "Lic. Mirta Díaz"]
            };
            
            await db.collection('clases').insertOne(clase);
            console.log('✅ Clase creada por defecto');
        }
        
        res.json({ 
            success: true, 
            message: 'Base de datos inicializada correctamente' 
        });
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error inicializando base de datos',
            error: error.message 
        });
    }
});

// ==================== RUTA POR DEFECTO ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== MANEJO DE RUTAS NO ENCONTRADAS ====================
app.use('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            success: false, 
            message: 'Ruta API no encontrada: ' + req.path 
        });
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// ==================== INICIAR SERVIDOR ====================
async function startServer() {
    try {
        // Intentar conectar a MongoDB primero
        console.log('\n🔄 Intentando conectar a MongoDB...');
        try {
            await mongoDB.connect();
            console.log('✅ MongoDB conectado exitosamente');
        } catch (dbError) {
            console.warn('⚠️ MongoDB no disponible:', dbError.message);
            console.log('⚠️ El servidor iniciará sin base de datos');
        }
        
        // Iniciar servidor
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('\n==========================================');
            console.log('✅ SERVIDOR INICIADO CORRECTAMENTE');
            console.log(`🔧 Puerto: ${PORT}`);
            console.log(`🌍 URL: http://0.0.0.0:${PORT}`);
            console.log(`🏥 Health: /api/health`);
            console.log(`🧪 Test: /api/test/simple`);
            console.log(`🔄 Init DB: /api/init-db`);
            console.log('==========================================\n');
        });
        
        server.on('error', (error) => {
            console.error('❌ Error del servidor:', error.message);
            if (error.code === 'EADDRINUSE') {
                console.error(`⚠️ Puerto ${PORT} en uso`);
            }
        });
        
        return server;
    } catch (error) {
        console.error('❌ ERROR iniciando servidor:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Iniciar servidor
startServer();