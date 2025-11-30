const nodemailer = require('nodemailer');
const { registrarEnviado, registrarFallido } = require('./estadisticasCorreo');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Plantilla HTML moderna para correos
const generarPlantillaCorreo = (titulo, contenido) => {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7fa;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            padding: 30px 20px;
            text-align: center;
            color: #ffffff;
        }
        .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .email-body {
            padding: 30px;
            color: #333333;
            line-height: 1.6;
        }
        .email-body h2 {
            color: #1976d2;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 15px;
        }
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #1976d2;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box p {
            margin: 8px 0;
            font-size: 14px;
        }
        .info-box strong {
            color: #1976d2;
            font-weight: 600;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 13px;
            color: #666666;
            border-top: 1px solid #e0e0e0;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #1976d2;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1565c0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>📚 Sistema de Gestión Docente</h1>
        </div>
        <div class="email-body">
            ${contenido}
        </div>
        <div class="email-footer">
            <p>Este es un mensaje automático del Sistema de Gestión Docente.</p>
            <p>Por favor no respondas a este correo.</p>
            <p>&copy; ${new Date().getFullYear()} Sistema de Gestión Docente. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
    `;
};

const enviarCorreo = async (destinatario, asunto, contenido) => {
    try {
        await transporter.sendMail({
            from: `"Sistema de Docentes" <${process.env.EMAIL_USER}>`,
            to: destinatario,
            subject: asunto,
            html: contenido
        });
        registrarEnviado();
        return true;
    } catch (error) {
        console.error('Error detallado al enviar correo:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command
        });
        registrarFallido(error);
        throw error; // Propagar el error para mejor debugging
    }
};

module.exports = {
    enviarCorreo,
    generarPlantillaCorreo
};