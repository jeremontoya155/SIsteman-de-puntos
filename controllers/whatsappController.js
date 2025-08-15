const { pool } = require('../config/database');
const whatsappService = require('../services/whatsappService');

class WhatsAppController {
    
    // Mostrar página principal de WhatsApp
    async index(req, res) {
        try {
            const promociones = await pool.query(`
                SELECT p.*, c.nombre as categoria_nombre 
                FROM promociones p 
                LEFT JOIN categorias c ON p.categoria_id = c.id 
                WHERE p.activa = true 
                ORDER BY p.fecha_inicio DESC
            `);
            
            const whatsappStatus = whatsappService.getStatus();
            
            res.render('whatsapp/index', { 
                promociones: promociones.rows,
                whatsappStatus: whatsappStatus,
                currentPage: 'whatsapp'
            });
        } catch (err) {
            console.error('Error:', err);
            res.render('whatsapp/index', { 
                promociones: [],
                whatsappStatus: { status: 'error', message: 'Error del servidor' },
                currentPage: 'whatsapp'
            });
        }
    }

    // Inicializar conexión de WhatsApp
    async connect(req, res) {
        try {
            const result = await whatsappService.initialize();
            
            if (result) {
                res.json({ 
                    success: true, 
                    message: 'Iniciando conexión de WhatsApp...'
                });
            } else {
                res.json({ 
                    success: false, 
                    error: 'No se pudo inicializar WhatsApp'
                });
            }
        } catch (error) {
            console.error('Error conectando WhatsApp:', error);
            res.json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    // Obtener estado actual de WhatsApp
    async status(req, res) {
        try {
            const status = whatsappService.getStatus();
            res.json(status);
        } catch (error) {
            res.json({ 
                status: 'error', 
                message: 'Error obteniendo estado',
                isConnected: false
            });
        }
    }

    // Desconectar WhatsApp
    async disconnect(req, res) {
        try {
            await whatsappService.disconnect();
            res.json({ 
                success: true, 
                message: 'WhatsApp desconectado'
            });
        } catch (error) {
            res.json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    // Enviar promoción masiva
    async enviarPromocion(req, res) {
        const { promocion_id } = req.body;
        
        try {
            // Verificar que WhatsApp esté conectado
            const status = whatsappService.getStatus();
            if (status.status !== 'connected') {
                return res.json({ 
                    success: false, 
                    error: 'WhatsApp no está conectado. Conecta primero y espera a que se establezca la conexión.'
                });
            }

            // Obtener promoción
            const promocionResult = await pool.query('SELECT * FROM promociones WHERE id = $1', [promocion_id]);
            if (promocionResult.rows.length === 0) {
                return res.json({ success: false, error: 'Promoción no encontrada' });
            }

            const promocion = promocionResult.rows[0];

            // Obtener clientes que aceptan promociones
            let clientesQuery;
            let queryParams = [];
            
            if (promocion.categoria_id) {
                // Enviar solo a clientes de la categoría específica
                clientesQuery = `
                    SELECT * FROM clientes 
                    WHERE categoria_id = $1 AND activo = true AND acepta_promociones = true
                `;
                queryParams = [promocion.categoria_id];
            } else {
                // Enviar a todos los clientes que aceptan promociones
                clientesQuery = `
                    SELECT * FROM clientes 
                    WHERE activo = true AND acepta_promociones = true
                `;
            }

            const clientesResult = await pool.query(clientesQuery, queryParams);

            if (clientesResult.rows.length === 0) {
                const categoria = promocion.categoria_id ? 'esta categoría' : 'todas las categorías';
                return res.json({ 
                    success: false, 
                    error: `No hay clientes disponibles para ${categoria} que acepten promociones.`
                });
            }

            // Preparar mensaje
            const mensajeBase = promocion.mensaje_personalizado || 
                `¡Hola [NOMBRE]! 📢 ${promocion.titulo}: ${promocion.descripcion}`;

            console.log(`Enviando promoción "${promocion.titulo}" a ${clientesResult.rows.length} clientes...`);

            // Enviar mensajes en lote
            const resultados = await whatsappService.sendBulkMessages(
                clientesResult.rows.map(cliente => ({
                    nombre: cliente.nombre,
                    telefono: cliente.telefono,
                    id: cliente.id
                })),
                mensajeBase
            );

            // Guardar resultados en la base de datos
            for (const resultado of resultados) {
                const estado = resultado.success ? 'enviado' : 'error';
                const mensaje = mensajeBase.replace(/\[NOMBRE\]/g, resultado.contact.nombre);
                
                await pool.query(`
                    INSERT INTO mensajes_enviados (cliente_id, promocion_id, mensaje, estado, enviado_at, error_detalle) 
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    resultado.contact.id, 
                    promocion.id, 
                    mensaje, 
                    estado,
                    resultado.success ? new Date() : null,
                    resultado.success ? null : resultado.error
                ]);
            }

            const exitosos = resultados.filter(r => r.success).length;
            const fallidos = resultados.filter(r => !r.success).length;

            res.json({ 
                success: true, 
                mensaje: `Promoción enviada exitosamente. ${exitosos} mensajes enviados, ${fallidos} fallidos.`,
                detalles: {
                    total: resultados.length,
                    exitosos: exitosos,
                    fallidos: fallidos,
                    clientes: clientesResult.rows.length
                }
            });

        } catch (err) {
            console.error('Error enviando promoción:', err);
            res.json({ 
                success: false, 
                error: `Error del servidor: ${err.message}`
            });
        }
    }

    // Enviar mensaje de prueba
    async enviarPrueba(req, res) {
        const { telefono, mensaje } = req.body;
        
        try {
            const status = whatsappService.getStatus();
            if (status.status !== 'connected') {
                return res.json({ 
                    success: false, 
                    error: 'WhatsApp no está conectado'
                });
            }

            const resultado = await whatsappService.sendMessage(telefono, mensaje);
            
            res.json({ 
                success: true, 
                message: 'Mensaje de prueba enviado exitosamente',
                resultado: resultado
            });

        } catch (error) {
            console.error('Error enviando mensaje de prueba:', error);
            res.json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    // Ver historial de mensajes
    async historial(req, res) {
        try {
            const mensajes = await pool.query(`
                SELECT 
                    m.*,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    p.titulo as promocion_titulo
                FROM mensajes_enviados m
                LEFT JOIN clientes c ON m.cliente_id = c.id
                LEFT JOIN promociones p ON m.promocion_id = p.id
                ORDER BY m.created_at DESC
                LIMIT 100
            `);

            res.render('whatsapp/historial', { 
                mensajes: mensajes.rows,
                currentPage: 'whatsapp'
            });
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            res.render('whatsapp/historial', { 
                mensajes: [],
                currentPage: 'whatsapp'
            });
        }
    }
}

module.exports = new WhatsAppController();
