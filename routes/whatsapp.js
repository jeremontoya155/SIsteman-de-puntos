const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Middleware de autenticación (será pasado desde el servidor principal)
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Rutas de WhatsApp
router.get('/', requireAuth, whatsappController.index);
router.post('/connect', requireAuth, whatsappController.connect);
router.get('/status', requireAuth, whatsappController.status);
router.post('/disconnect', requireAuth, whatsappController.disconnect);
router.post('/enviar', requireAuth, whatsappController.enviarPromocion);
router.post('/prueba', requireAuth, whatsappController.enviarPrueba);
router.get('/historial', requireAuth, whatsappController.historial);

module.exports = router;
