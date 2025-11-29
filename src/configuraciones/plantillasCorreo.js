// Plantillas HTML para correos

const estilosBase = `
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .badge-success { background-color: #28a745; color: white; }
        .badge-danger { background-color: #dc3545; color: white; }
        .badge-warning { background-color: #ffc107; color: #212529; }
        .badge-info { background-color: #17a2b8; color: white; }
        .info-card { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .cambio-item { padding: 10px; margin: 5px 0; background-color: #fff3cd; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        table th, table td { padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6; }
        table th { background-color: #f8f9fa; font-weight: bold; }
    </style>
`;

const plantillasCorreo = {
    // Notificación de evaluación editada
    evaluacionEditada: (datos) => {
        const { evaluacion, cambios, usuario } = datos;
        
        let cambiosHTML = '';
        if (cambios && cambios.length > 0) {
            cambiosHTML = cambios.map(cambio => `
                <div class="cambio-item">
                    <strong>${cambio.campo}:</strong><br>
                    Anterior: <del>${cambio.anterior || 'N/A'}</del><br>
                    Nuevo: <strong style="color: #28a745;">${cambio.nuevo || 'N/A'}</strong>
                </div>
            `).join('');
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                ${estilosBase}
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📝 Evaluación Actualizada</h1>
                    </div>
                    <div class="content">
                        <p>Hola,</p>
                        <p>Se ha actualizado la evaluación <strong>"${evaluacion.titulo}"</strong>.</p>
                        
                        <div class="info-card">
                            <p><strong>Evaluación:</strong> ${evaluacion.titulo}</p>
                            <p><strong>Nota Máxima:</strong> ${evaluacion.notaMaxima}</p>
                            <p><strong>Fecha de Cierre:</strong> ${new Date(evaluacion.fechaCierre).toLocaleString('es-ES')}</p>
                            <p><strong>Actualizado por:</strong> ${usuario || 'Sistema'}</p>
                        </div>

                        ${cambiosHTML ? `
                            <h3>Cambios realizados:</h3>
                            ${cambiosHTML}
                        ` : ''}

                        <p style="margin-top: 20px; color: #666;">
                            Por favor, revisa los cambios y asegúrate de estar al tanto de las actualizaciones.
                        </p>
                    </div>
                    <div class="footer">
                        <p>Este es un mensaje automático del Sistema de Gestión Docente.</p>
                        <p>Por favor, no respondas a este correo.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    // Notificación de evaluación eliminada
    evaluacionEliminada: (datos) => {
        const { evaluacion, usuario } = datos;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                ${estilosBase}
            </head>
            <body>
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <h1>🗑️ Evaluación Eliminada</h1>
                    </div>
                    <div class="content">
                        <p>Hola,</p>
                        <p>Te informamos que la evaluación <strong>"${evaluacion.titulo}"</strong> ha sido eliminada del sistema.</p>
                        
                        <div class="info-card" style="border-left-color: #dc3545;">
                            <p><strong>Evaluación:</strong> ${evaluacion.titulo}</p>
                            <p><strong>Nota Máxima:</strong> ${evaluacion.notaMaxima}</p>
                            <p><strong>Eliminado por:</strong> ${usuario || 'Sistema'}</p>
                            <p><strong>Fecha de eliminación:</strong> ${new Date().toLocaleString('es-ES')}</p>
                        </div>

                        <p style="margin-top: 20px; color: #666;">
                            Esta evaluación ya no está disponible en el sistema. Si tienes dudas, contacta con tu docente.
                        </p>
                    </div>
                    <div class="footer">
                        <p>Este es un mensaje automático del Sistema de Gestión Docente.</p>
                        <p>Por favor, no respondas a este correo.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    // Notificación de asistencia registrada
    asistenciaRegistrada: (datos) => {
        const { asistencia, estudiante, clase } = datos;

        let estadoBadge = '';
        let estadoColor = '';
        let estadoEmoji = '';

        switch (asistencia.estado) {
            case 'PRESENTE':
                estadoBadge = 'badge-success';
                estadoColor = '#28a745';
                estadoEmoji = '✅';
                break;
            case 'AUSENTE':
                estadoBadge = 'badge-danger';
                estadoColor = '#dc3545';
                estadoEmoji = '❌';
                break;
            case 'TARDANZA':
                estadoBadge = 'badge-warning';
                estadoColor = '#ffc107';
                estadoEmoji = '⚠️';
                break;
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                ${estilosBase}
            </head>
            <body>
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <h1>📋 Asistencia Registrada</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>${estudiante.nombre}</strong>,</p>
                        <p>Se ha registrado tu asistencia para la clase de hoy.</p>
                        
                        <div class="info-card" style="border-left-color: ${estadoColor};">
                            <p><strong>Clase:</strong> ${clase.nombre}</p>
                            <p><strong>Fecha:</strong> ${new Date(asistencia.fecha).toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</p>
                            <p>
                                <strong>Estado:</strong> 
                                <span class="badge ${estadoBadge}">${estadoEmoji} ${asistencia.estado}</span>
                            </p>
                            ${asistencia.descripcion ? `<p><strong>Observación:</strong> ${asistencia.descripcion}</p>` : ''}
                        </div>

                        ${asistencia.estado === 'AUSENTE' ? `
                            <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                                <strong>⚠️ Importante:</strong> Tu inasistencia ha sido registrada. 
                                Si tienes una justificación, por favor comunícate con tu docente.
                            </p>
                        ` : ''}

                        ${asistencia.estado === 'TARDANZA' ? `
                            <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                                <strong>⚠️ Nota:</strong> Tu tardanza ha sido registrada. 
                                Te recomendamos llegar puntual a las próximas clases.
                            </p>
                        ` : ''}
                    </div>
                    <div class="footer">
                        <p>Este es un mensaje automático del Sistema de Gestión Docente.</p>
                        <p>Por favor, no respondas a este correo.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    // Notificación múltiple de asistencias
    asistenciasMultiples: (datos) => {
        const { asistencias, clase, fecha, resumen } = datos;

        let tablaAsistencias = '';
        if (asistencias && asistencias.length > 0) {
            tablaAsistencias = `
                <table>
                    <thead>
                        <tr>
                            <th>Estudiante</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${asistencias.map(a => {
                            let badge = 'badge-info';
                            let emoji = '📝';
                            if (a.estado === 'PRESENTE') { badge = 'badge-success'; emoji = '✅'; }
                            if (a.estado === 'AUSENTE') { badge = 'badge-danger'; emoji = '❌'; }
                            if (a.estado === 'TARDANZA') { badge = 'badge-warning'; emoji = '⚠️'; }
                            
                            return `
                                <tr>
                                    <td>${a.estudiante?.nombre || 'N/A'}</td>
                                    <td><span class="badge ${badge}">${emoji} ${a.estado}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                ${estilosBase}
            </head>
            <body>
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <h1>📊 Asistencias Registradas</h1>
                    </div>
                    <div class="content">
                        <p>Hola,</p>
                        <p>Se han registrado las asistencias para la clase del día de hoy.</p>
                        
                        <div class="info-card">
                            <p><strong>Clase:</strong> ${clase?.nombre || 'N/A'}</p>
                            <p><strong>Fecha:</strong> ${new Date(fecha).toLocaleDateString('es-ES')}</p>
                            ${resumen ? `
                                <p><strong>Resumen:</strong></p>
                                <ul>
                                    <li>✅ Presentes: ${resumen.presentes || 0}</li>
                                    <li>❌ Ausentes: ${resumen.ausentes || 0}</li>
                                    <li>⚠️ Tardanzas: ${resumen.tardanzas || 0}</li>
                                    <li>📊 Total: ${resumen.total || 0}</li>
                                </ul>
                            ` : ''}
                        </div>

                        ${tablaAsistencias}
                    </div>
                    <div class="footer">
                        <p>Este es un mensaje automático del Sistema de Gestión Docente.</p>
                        <p>Por favor, no respondas a este correo.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    // Notificación de asistencia actualizada
    asistenciaActualizada: (datos) => {
        const { asistencia, asistenciaAnterior, estudiante, clase, cambios } = datos;

        let estadoBadge = '';
        let estadoColor = '';
        let estadoEmoji = '';

        switch (asistencia.estado) {
            case 'PRESENTE':
                estadoBadge = 'badge-success';
                estadoColor = '#28a745';
                estadoEmoji = '✅';
                break;
            case 'AUSENTE':
                estadoBadge = 'badge-danger';
                estadoColor = '#dc3545';
                estadoEmoji = '❌';
                break;
            case 'TARDANZA':
                estadoBadge = 'badge-warning';
                estadoColor = '#ffc107';
                estadoEmoji = '⚠️';
                break;
        }

        let cambiosHTML = '';
        if (cambios && cambios.length > 0) {
            cambiosHTML = cambios.map(cambio => `
                <div class="cambio-item">
                    <strong>${cambio.campo}:</strong><br>
                    Anterior: <del>${cambio.anterior || 'N/A'}</del><br>
                    Nuevo: <strong style="color: #28a745;">${cambio.nuevo || 'N/A'}</strong>
                </div>
            `).join('');
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                ${estilosBase}
            </head>
            <body>
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <h1>🔄 Asistencia Actualizada</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>${estudiante.nombre}</strong>,</p>
                        <p>Se ha actualizado tu registro de asistencia.</p>
                        
                        <div class="info-card" style="border-left-color: ${estadoColor};">
                            <p><strong>Clase:</strong> ${clase.nombre}</p>
                            <p><strong>Fecha:</strong> ${new Date(asistencia.fecha).toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</p>
                            <p>
                                <strong>Nuevo Estado:</strong> 
                                <span class="badge ${estadoBadge}">${estadoEmoji} ${asistencia.estado}</span>
                            </p>
                            ${asistencia.descripcion ? `<p><strong>Observación:</strong> ${asistencia.descripcion}</p>` : ''}
                        </div>

                        ${cambiosHTML ? `
                            <h3>Cambios realizados:</h3>
                            ${cambiosHTML}
                        ` : ''}

                        ${asistencia.estado === 'AUSENTE' ? `
                            <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                                <strong>⚠️ Importante:</strong> Tu estado ha sido actualizado a ausente. 
                                Si tienes una justificación, por favor comunícate con tu docente.
                            </p>
                        ` : ''}

                        ${asistencia.estado === 'TARDANZA' ? `
                            <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                                <strong>⚠️ Nota:</strong> Tu estado ha sido actualizado a tardanza. 
                                Te recomendamos llegar puntual a las próximas clases.
                            </p>
                        ` : ''}

                        ${asistencia.estado === 'PRESENTE' && asistenciaAnterior?.estado !== 'PRESENTE' ? `
                            <p style="margin-top: 20px; padding: 15px; background-color: #d4edda; border-radius: 4px; border-left: 4px solid #28a745;">
                                <strong>✅ Excelente:</strong> Tu asistencia ha sido corregida y ahora apareces como presente.
                            </p>
                        ` : ''}
                    </div>
                    <div class="footer">
                        <p>Este es un mensaje automático del Sistema de Gestión Docente.</p>
                        <p>Por favor, no respondas a este correo.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
};

module.exports = plantillasCorreo;
