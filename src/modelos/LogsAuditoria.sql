-- Script de creación de tabla LogsAuditoria
-- Ejecutar este script si la sincronización automática de Sequelize no funciona

CREATE TABLE IF NOT EXISTS `LogsAuditoria` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuarioId` INT NULL,
    `accion` VARCHAR(100) NOT NULL COMMENT 'Tipo de acción: LOGIN, LOGOUT, CREAR, EDITAR, ELIMINAR, etc.',
    `entidad` VARCHAR(100) NULL COMMENT 'Entidad afectada: Estudiantes, Clases, Evaluaciones, etc.',
    `entidadId` INT NULL COMMENT 'ID del registro afectado',
    `descripcion` TEXT NULL COMMENT 'Descripción detallada de la acción',
    `ip` VARCHAR(45) NULL COMMENT 'Dirección IP del usuario',
    `userAgent` TEXT NULL COMMENT 'User Agent del navegador',
    `datosAnteriores` JSON NULL COMMENT 'Estado anterior del registro (para ediciones)',
    `datosNuevos` JSON NULL COMMENT 'Estado nuevo del registro (para ediciones/creaciones)',
    `resultado` ENUM('EXITOSO', 'FALLIDO') NOT NULL DEFAULT 'EXITOSO',
    `mensajeError` TEXT NULL COMMENT 'Mensaje de error si la acción falló',
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`usuarioId`) REFERENCES `Usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_usuarioId` (`usuarioId`),
    INDEX `idx_accion` (`accion`),
    INDEX `idx_resultado` (`resultado`),
    INDEX `idx_createdAt` (`createdAt`),
    INDEX `idx_entidad` (`entidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Consultas útiles para auditoría

-- Ver logs recientes
SELECT * FROM LogsAuditoria ORDER BY createdAt DESC LIMIT 50;

-- Contar logs por acción
SELECT accion, COUNT(*) as cantidad 
FROM LogsAuditoria 
GROUP BY accion 
ORDER BY cantidad DESC;

-- Ver intentos fallidos de login
SELECT l.*, u.login, u.correo 
FROM LogsAuditoria l
LEFT JOIN Usuarios u ON l.usuarioId = u.id
WHERE l.accion = 'LOGIN_FALLIDO'
ORDER BY l.createdAt DESC;

-- Ver actividad por usuario
SELECT u.login, COUNT(*) as total_acciones
FROM LogsAuditoria l
INNER JOIN Usuarios u ON l.usuarioId = u.id
GROUP BY u.login
ORDER BY total_acciones DESC;

-- Limpiar logs antiguos (más de 90 días)
-- DELETE FROM LogsAuditoria WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
