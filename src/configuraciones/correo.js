const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const enviarCorreo = async (destinatario, asunto, contenido) => {
    try {
        await transporter.sendMail({
            from: `"Sistema de Docentes" <${process.env.EMAIL_USER}>`,
            to: destinatario,
            subject: asunto,
            html: contenido
        });
        return true;
    } catch (error) {
        console.error('Error al enviar correo:', error);
        return false;
    }
};

module.exports = {
    enviarCorreo
};