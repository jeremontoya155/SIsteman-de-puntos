const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { pool, testConnection } = require('./config/database');
const whatsappService = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Cambiar a true en producción con HTTPS
}));

// Configuración de EJS con layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout'); // El archivo de layout principal

// Middleware de autenticación
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Rutas de autenticación
app.get('/login', (req, res) => {
    res.render('login', { error: null, layout: false });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.render('login', { error: 'Usuario no encontrado', layout: false });
        }
        
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (isValid) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/dashboard');
        } else {
            res.render('login', { error: 'Contraseña incorrecta', layout: false });
        }
    } catch (err) {
        console.error('Error en login:', err);
        res.render('login', { error: 'Error del servidor', layout: false });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Ruta principal
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Dashboard principal
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        // Verificar que las tablas existan y obtener estadísticas
        const clientesResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM clientes 
            WHERE activo = true
        `);
        
        const categoriasResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM categorias 
            WHERE activa = true
        `);
        
        const promocionesResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM promociones 
            WHERE activa = true AND fecha_fin >= CURRENT_DATE
        `);

        // Obtener estadísticas adicionales
        const totalComprasResult = await pool.query(`
            SELECT COALESCE(SUM(total_compras), 0) as total 
            FROM clientes
        `);

        const mensajesResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM mensajes_enviados 
            WHERE enviado_at >= CURRENT_DATE - INTERVAL '7 days'
        `);
        
        const stats = {
            clientes: parseInt(clientesResult.rows[0].total) || 0,
            categorias: parseInt(categoriasResult.rows[0].total) || 0,
            promociones: parseInt(promocionesResult.rows[0].total) || 0,
            totalCompras: parseFloat(totalComprasResult.rows[0].total) || 0,
            mensajesSemanales: parseInt(mensajesResult.rows[0].total) || 0
        };

        console.log('📊 Dashboard stats:', stats);
        
        res.render('dashboard', { 
            user: req.session.username || 'Admin', 
            stats,
            currentPage: 'dashboard',
            layout: 'layout'
        });
    } catch (err) {
        console.error('❌ Error en dashboard:', err);
        // Proporcionar datos por defecto si hay error
        const defaultStats = { 
            clientes: 0, 
            categorias: 0, 
            promociones: 0,
            totalCompras: 0,
            mensajesSemanales: 0 
        };
        
        res.render('dashboard', { 
            user: req.session.username || 'Admin', 
            stats: defaultStats,
            currentPage: 'dashboard',
            layout: 'layout',
            error: 'Error cargando estadísticas. Verifica la conexión a la base de datos.'
        });
    }
});

// RUTAS DE CLIENTES
app.get('/clientes', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, cat.nombre as categoria_nombre 
            FROM clientes c 
            LEFT JOIN categorias cat ON c.categoria_id = cat.id 
            ORDER BY c.created_at DESC
        `);
        
        // Capturar mensaje de éxito si existe
        const successMessage = req.query.success || null;
        
        res.render('clientes/index', { 
            clientes: result.rows,
            currentPage: 'clientes',
            successMessage
        });
    } catch (err) {
        console.error('Error obteniendo clientes:', err);
        res.render('clientes/index', { 
            clientes: [],
            currentPage: 'clientes',
            successMessage: null
        });
    }
});

app.get('/clientes/nuevo', requireAuth, async (req, res) => {
    try {
        const categorias = await pool.query('SELECT * FROM categorias WHERE activa = true ORDER BY nombre');
        res.render('clientes/nuevo', { 
            categorias: categorias.rows, 
            error: null,
            currentPage: 'clientes'
        });
    } catch (err) {
        console.error('Error:', err);
        res.render('clientes/nuevo', { 
            categorias: [], 
            error: 'Error cargando categorías',
            currentPage: 'clientes'
        });
    }
});

app.post('/clientes', requireAuth, async (req, res) => {
    const { nombre, apellido, telefono, email, fecha_nacimiento, categoria_id, acepta_promociones } = req.body;
    
    try {
        // Validaciones básicas
        if (!nombre || !apellido || !telefono) {
            throw new Error('Nombre, apellido y teléfono son obligatorios');
        }

        // Verificar que el teléfono no esté ya registrado
        const existingPhone = await pool.query('SELECT id FROM clientes WHERE telefono = $1', [telefono]);
        if (existingPhone.rows.length > 0) {
            throw new Error('Este número de teléfono ya está registrado');
        }

        // Insertar nuevo cliente
        const result = await pool.query(`
            INSERT INTO clientes (nombre, apellido, telefono, email, fecha_nacimiento, categoria_id, acepta_promociones) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [nombre, apellido, telefono, email || null, fecha_nacimiento || null, categoria_id || null, acepta_promociones === 'on']);

        console.log('✅ Cliente creado exitosamente:', result.rows[0].id);
        res.redirect('/clientes?success=Cliente registrado exitosamente');
        
    } catch (err) {
        console.error('❌ Error creando cliente:', err);
        
        try {
            const categorias = await pool.query('SELECT * FROM categorias WHERE activa = true ORDER BY nombre');
            res.render('clientes/nuevo', { 
                categorias: categorias.rows, 
                error: err.message,
                currentPage: 'clientes',
                // Mantener los datos del formulario
                formData: {
                    nombre: nombre || '',
                    apellido: apellido || '',
                    telefono: telefono || '',
                    email: email || '',
                    fecha_nacimiento: fecha_nacimiento || '',
                    categoria_id: categoria_id || '',
                    acepta_promociones: acepta_promociones === 'on'
                }
            });
        } catch (dbErr) {
            console.error('❌ Error cargando categorías:', dbErr);
            res.render('clientes/nuevo', { 
                categorias: [], 
                error: 'Error del servidor: ' + err.message,
                currentPage: 'clientes',
                formData: {}
            });
        }
    }
});

// RUTAS DE CATEGORÍAS
app.get('/categorias', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categorias ORDER BY nombre');
        res.render('categorias/index', { 
            categorias: result.rows,
            currentPage: 'categorias'
        });
    } catch (err) {
        console.error('Error obteniendo categorías:', err);
        res.render('categorias/index', { 
            categorias: [],
            currentPage: 'categorias'
        });
    }
});

app.get('/categorias/nueva', requireAuth, (req, res) => {
    res.render('categorias/nueva', { 
        error: null,
        currentPage: 'categorias'
    });
});

app.post('/categorias', requireAuth, async (req, res) => {
    const { nombre, descripcion, descuento_porcentaje, puntos_por_peso } = req.body;
    
    try {
        await pool.query(`
            INSERT INTO categorias (nombre, descripcion, descuento_porcentaje, puntos_por_peso) 
            VALUES ($1, $2, $3, $4)
        `, [nombre, descripcion, descuento_porcentaje, puntos_por_peso]);
        
        res.redirect('/categorias');
    } catch (err) {
        console.error('Error creando categoría:', err);
        res.render('categorias/nueva', { 
            error: 'Error creando categoría: ' + err.message,
            currentPage: 'categorias'
        });
    }
});

// RUTAS DE PROMOCIONES
app.get('/promociones', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.nombre as categoria_nombre 
            FROM promociones p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            ORDER BY p.created_at DESC
        `);
        res.render('promociones/index', { 
            promociones: result.rows,
            currentPage: 'promociones'
        });
    } catch (err) {
        console.error('Error obteniendo promociones:', err);
        res.render('promociones/index', { 
            promociones: [],
            currentPage: 'promociones'
        });
    }
});

app.get('/promociones/nueva', requireAuth, async (req, res) => {
    try {
        const categorias = await pool.query('SELECT * FROM categorias WHERE activa = true ORDER BY nombre');
        res.render('promociones/nueva', { 
            categorias: categorias.rows, 
            error: null,
            currentPage: 'nueva-promocion'
        });
    } catch (err) {
        console.error('Error:', err);
        res.render('promociones/nueva', { 
            categorias: [], 
            error: 'Error cargando categorías',
            currentPage: 'nueva-promocion'
        });
    }
});

app.post('/promociones', requireAuth, async (req, res) => {
    const { titulo, descripcion, categoria_id, fecha_inicio, fecha_fin, mensaje_personalizado } = req.body;
    
    try {
        await pool.query(`
            INSERT INTO promociones (titulo, descripcion, categoria_id, fecha_inicio, fecha_fin, mensaje_personalizado) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [titulo, descripcion, categoria_id, fecha_inicio, fecha_fin, mensaje_personalizado]);
        
        res.redirect('/promociones');
    } catch (err) {
        console.error('Error creando promoción:', err);
        const categorias = await pool.query('SELECT * FROM categorias WHERE activa = true ORDER BY nombre');
        res.render('promociones/nueva', { 
            categorias: categorias.rows, 
            error: 'Error creando promoción: ' + err.message,
            currentPage: 'nueva-promocion'
        });
    }
});

// RUTA DE MENSAJERÍA WHATSAPP - Usando controllers
const whatsappRoutes = require('./routes/whatsapp');
app.use('/whatsapp', whatsappRoutes);

// Webhook para Evolution API
app.post('/webhook/whatsapp', (req, res) => {
    try {
        whatsappService.handleWebhook(req.body);
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        res.status(500).json({ error: 'Error procesando webhook' });
    }
});

// Inicializar servidor
async function startServer() {
    await testConnection();
    
    // Evolution API configurado y listo para conectar
    console.log('📱 Evolution API configurado y listo para conectar');
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`👤 Usuario por defecto: admin / admin123`);
        console.log(`📱 WhatsApp: Ve a /whatsapp para conectar Evolution API`);
    });
}

startServer();