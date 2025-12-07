const express = require('express');
const router = express.Router();
const { enviarCorreo } = require('../configuraciones/correo');

/**
 * @swagger
 * /correo/enviar:
 *   post:
 *     summary: Enviar correo electrónico
 *     tags: [Correo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destinatario
 *               - asunto
 *               - contenido
 *             properties:
 *               destinatario:
 *                 type: string
 *                 description: Email del destinatario
 *               asunto:
 *                 type: string
 *                 description: Asunto del correo
 *               contenido:
 *                 type: string
 *                 description: Contenido HTML del correo
 *               docenteId:
 *                 type: integer
 *                 description: ID del docente (opcional)
 *     responses:
 *       200:
 *         description: Correo enviado exitosamente
 *       500:
 *         description: Error al enviar el correo
 */
router.post('/enviar', async (req, res) => {
  try {
    const { destinatario, asunto, contenido, docenteId = null } = req.body;

    if (!destinatario || !asunto || !contenido) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos',
        requeridos: ['destinatario', 'asunto', 'contenido']
      });
    }

    const enviado = await enviarCorreo(destinatario, asunto, contenido, docenteId);

    if (enviado) {
      res.status(200).json({ 
        mensaje: 'Correo enviado exitosamente',
        destinatario
      });
    } else {
      res.status(500).json({ error: 'No se pudo enviar el correo' });
    }
  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({ 
      error: 'Error al enviar el correo',
      detalles: error.message 
    });
  }
});

module.exports = router;
