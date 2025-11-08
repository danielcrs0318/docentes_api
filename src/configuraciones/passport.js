const jwt = require('jsonwebtoken');

const validarToken = (req, res, next) => {
    console.log('Headers recibidos:', req.headers);
    const bearerHeader = req.headers['authorization'];
    
    if (!bearerHeader) {
        return res.status(401).json({ 
            error: 'Token no proporcionado',
            ayuda: 'Asegúrate de incluir el header Authorization'
        });
    }

    console.log('Authorization header:', bearerHeader);
    console.log('Tipo de Authorization header:', typeof bearerHeader);
    console.log('Longitud del header:', bearerHeader.length);
    
    // Detectar caracteres especiales o invisibles
    console.log('Códigos ASCII del header:', Array.from(bearerHeader).map(c => c.charCodeAt(0)));
    
    const bearer = bearerHeader.split(' ');
    console.log('Partes después del split:', bearer);
    
    if (bearer.length !== 2 || bearer[0] !== 'Bearer') {
        return res.status(401).json({ 
            error: 'Formato de token inválido',
            formatoCorrecto: 'Bearer tu_token_aqui',
            recibido: bearerHeader,
            partes: bearer
        });
    }

    // Limpiamos el token de cualquier carácter que no sea parte válida de un JWT
    let token = bearer[1].trim();
    token = token.replace(/[^A-Za-z0-9\-_\.]/g, '');
    
    console.log('Token extraído (después de limpieza):', token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        console.log('Ruta actual:', req.path);
        console.log('Token decodificado:', decoded);
        
        // Si la ruta contiene 'restablecer-contrasena', verificar que el token tenga pin:true
        if (req.path.includes('restablecer-contrasena')) {
            if (!decoded.pin) {
                console.log('Token no tiene pin:true');
                return res.status(401).json({ 
                    error: 'Token no válido para restablecer contraseña',
                    detalles: 'El token debe ser generado por el proceso de validación de PIN'
                });
            }
            console.log('Token válido para restablecer contraseña');
        }
        
        req.usuario = decoded;
        next();
    } catch (error) {
        console.error('Error al validar token:', error);
        return res.status(401).json({ 
            error: 'Token inválido o expirado',
            detalles: error.message 
        });
    }
};

module.exports = {
    validarToken
};