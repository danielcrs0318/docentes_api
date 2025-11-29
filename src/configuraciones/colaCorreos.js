const { enviarCorreo } = require('./correo');

class ColaCorreos {
    constructor() {
        this.cola = [];
        this.procesando = false;
        this.estadisticas = {
            enviados: 0,
            fallidos: 0,
            enCola: 0,
            ultimoEnvio: null,
            errores: []
        };
        this.maxReintentos = 3;
        this.tiempoEsperaEntreMensajes = 1000; // 1 segundo entre mensajes
    }

    // Agregar correo a la cola
    agregarCorreo(destinatario, asunto, contenido, metadata = {}) {
        const correo = {
            id: Date.now() + Math.random(),
            destinatario,
            asunto,
            contenido,
            metadata,
            intentos: 0,
            timestamp: new Date()
        };

        this.cola.push(correo);
        this.estadisticas.enCola = this.cola.length;

        // Procesar la cola si no está procesando
        if (!this.procesando) {
            this.procesarCola();
        }

        return correo.id;
    }

    // Procesar cola de correos
    async procesarCola() {
        if (this.procesando || this.cola.length === 0) return;

        this.procesando = true;

        while (this.cola.length > 0) {
            const correo = this.cola[0];

            try {
                await enviarCorreo(correo.destinatario, correo.asunto, correo.contenido);
                
                // Correo enviado exitosamente
                this.estadisticas.enviados++;
                this.estadisticas.ultimoEnvio = new Date();
                this.cola.shift(); // Remover de la cola
                this.estadisticas.enCola = this.cola.length;

                console.log(`✅ Correo enviado: ${correo.asunto} -> ${correo.destinatario}`);

                // Esperar antes de enviar el siguiente
                await this.esperar(this.tiempoEsperaEntreMensajes);

            } catch (error) {
                correo.intentos++;

                if (correo.intentos >= this.maxReintentos) {
                    // Máximo de reintentos alcanzado
                    this.estadisticas.fallidos++;
                    this.estadisticas.errores.push({
                        correo: correo.destinatario,
                        asunto: correo.asunto,
                        error: error.message,
                        timestamp: new Date()
                    });

                    // Mantener solo los últimos 50 errores
                    if (this.estadisticas.errores.length > 50) {
                        this.estadisticas.errores = this.estadisticas.errores.slice(-50);
                    }

                    console.error(`❌ Error al enviar correo después de ${correo.intentos} intentos:`, {
                        destinatario: correo.destinatario,
                        asunto: correo.asunto,
                        error: error.message
                    });

                    this.cola.shift(); // Remover de la cola
                    this.estadisticas.enCola = this.cola.length;
                } else {
                    console.warn(`⚠️ Reintentando envío (${correo.intentos}/${this.maxReintentos}):`, correo.asunto);
                    // Mover al final de la cola para reintentar después
                    this.cola.push(this.cola.shift());
                    await this.esperar(2000); // Esperar 2 segundos antes de reintentar
                }
            }
        }

        this.procesando = false;
    }

    // Función helper para esperar
    esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Obtener estadísticas
    obtenerEstadisticas() {
        return {
            ...this.estadisticas,
            enCola: this.cola.length,
            procesando: this.procesando
        };
    }

    // Limpiar estadísticas
    limpiarEstadisticas() {
        this.estadisticas = {
            enviados: 0,
            fallidos: 0,
            enCola: this.cola.length,
            ultimoEnvio: null,
            errores: []
        };
    }
}

// Instancia única de la cola
const colaCorreos = new ColaCorreos();

module.exports = colaCorreos;
