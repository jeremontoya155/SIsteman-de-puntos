const axios = require('axios');

class WhatsAppService {
    constructor() {
        this.apiUrl = process.env.EVOLUTION_API_URL;
        this.apiKey = process.env.EVOLUTION_API_KEY;
        this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'sistema-puntos-2025';
        this.webhookUrl = process.env.EVOLUTION_WEBHOOK_URL;
        
        this.isConnected = false;
        this.qrCode = null;
        this.status = 'disconnected';
        this.statusMessage = 'Desconectado';
        
        this.headers = {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
        };

        console.log('🔧 WhatsApp Service configurado:');
        console.log('📡 API URL:', this.apiUrl);
        console.log('🔑 Instance Name:', this.instanceName);
    }

    async initialize() {
        try {
            console.log('🚀 Verificando instancia conectada...');
            console.log('📱 Usando instancia:', this.instanceName);
            
            this.status = 'connecting';
            this.statusMessage = 'Verificando conexión existente...';

            // Verificar el estado de la instancia conectada
            const state = await this.getConnectionState();
            console.log('📊 Estado de la instancia:', state);
            
            // Corregir la verificación del estado - puede venir en diferentes formatos
            const actualState = state?.instance?.state || state?.state;
            console.log('📊 Estado real extraído:', actualState);
            
            if (actualState === 'open') {
                this.isConnected = true;
                this.status = 'connected';
                this.statusMessage = 'Conectado y listo para enviar mensajes';
                console.log('✅ WhatsApp está conectado y listo!');
                
                // Configurar webhook si está disponible
                if (this.webhookUrl) {
                    await this.setupWebhook();
                }
                
                // Hacer una prueba de funcionamiento
                await this.testConnection();
                
                return true;
            } else {
                console.log('❌ La instancia no está conectada');
                console.log('Estado actual:', actualState || 'desconocido');
                
                this.status = 'disconnected';
                this.statusMessage = 'La instancia no está conectada a WhatsApp';
                
                // Intentar reconectar
                console.log('🔄 Intentando reconectar...');
                return await this.reconnectInstance();
            }
            
        } catch (error) {
            console.error('❌ Error verificando instancia:', error.message);
            this.status = 'error';
            this.statusMessage = 'Error: ' + error.message;
            return false;
        }
    }

    async getConnectionState() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/instance/connectionState/${this.instanceName}`,
                { headers: this.headers, timeout: 10000 }
            );
            
            console.log('📄 Respuesta del estado:', response.data);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('⚠️ Instancia no encontrada');
                return null;
            }
            console.error('❌ Error obteniendo estado:', error.message);
            return null;
        }
    }

    async testConnection() {
        try {
            console.log('🧪 Probando funcionalidad de la instancia...');
            
            // Verificar que la instancia responde
            const profile = await axios.get(
                `${this.apiUrl}/chat/whatsappProfile/${this.instanceName}`,
                { headers: this.headers, timeout: 8000 }
            );
            
            console.log('✅ Perfil de WhatsApp obtenido:', profile.data?.name || 'Sin nombre');
            
            return true;
        } catch (error) {
            console.log('⚠️ No se pudo obtener el perfil, pero la instancia parece estar conectada');
            return true; // No es crítico
        }
    }

    async reconnectInstance() {
        try {
            console.log('🔄 Intentando reconectar instancia...');
            
            const response = await axios.get(
                `${this.apiUrl}/instance/connect/${this.instanceName}`,
                { headers: this.headers, timeout: 15000 }
            );
            
            console.log('📄 Respuesta de reconexión:', response.data);
            
            if (response.data?.qrcode || response.data?.code) {
                let qrData = response.data.qrcode?.base64 || response.data.qrcode || response.data.code;
                
                if (qrData && !qrData.startsWith('data:image')) {
                    qrData = `data:image/png;base64,${qrData}`;
                }
                
                this.qrCode = qrData;
                this.status = 'qr-ready';
                this.statusMessage = 'Escanea el código QR para reconectar';
                console.log('✅ QR generado para reconexión');
                
                this.startConnectionPolling();
                return true;
            } else {
                throw new Error('No se pudo generar QR para reconexión');
            }
            
        } catch (error) {
            console.error('❌ Error reconectando:', error.message);
            this.status = 'error';
            this.statusMessage = 'Error al intentar reconectar';
            return false;
        }
    }

    async setupWebhook() {
        try {
            console.log('🔗 Configurando webhook...');
            
            const webhookData = {
                webhook: {
                    url: this.webhookUrl,
                    events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
                    webhookByEvents: true,
                    webhookBase64: false
                }
            };

            const response = await axios.put(
                `${this.apiUrl}/webhook/set/${this.instanceName}`,
                webhookData,
                { headers: this.headers }
            );

            console.log('✅ Webhook configurado correctamente');
            return response.data;
        } catch (error) {
            console.log('⚠️ No se pudo configurar webhook:', error.message);
            // No es crítico, el sistema puede funcionar sin webhook
        }
    }

    startConnectionPolling() {
        let attempts = 0;
        const maxAttempts = 40; // 2 minutos
        
        console.log('🔄 Iniciando verificación de conexión...');
        
        const interval = setInterval(async () => {
            attempts++;
            
            try {
                const state = await this.getConnectionState();
                
                if (state?.state === 'open') {
                    clearInterval(interval);
                    this.isConnected = true;
                    this.status = 'connected';
                    this.statusMessage = 'Conectado y listo para enviar mensajes';
                    this.qrCode = null;
                    console.log('✅ WhatsApp reconectado exitosamente!');
                    
                    if (this.webhookUrl) {
                        await this.setupWebhook();
                    }
                }
            } catch (error) {
                console.log(`⚠️ Verificación ${attempts}: Error`);
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                if (!this.isConnected) {
                    this.status = 'timeout';
                    this.statusMessage = 'Tiempo agotado esperando conexión';
                    console.log('⏰ Timeout esperando reconexión');
                }
            }
        }, 3000);
    }

    async sendMessage(phoneNumber, message) {
        if (!this.isConnected) {
            throw new Error('WhatsApp no está conectado');
        }

        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            
            console.log(`📤 Enviando mensaje a: ${phoneNumber} (${formattedNumber})`);
            
            const messageData = {
                number: formattedNumber,
                text: message
            };

            const response = await axios.post(
                `${this.apiUrl}/message/sendText/${this.instanceName}`,
                messageData,
                { headers: this.headers, timeout: 10000 }
            );

            console.log('✅ Mensaje enviado exitosamente');
            console.log('📄 Respuesta:', response.data);
            
            return {
                success: true,
                contact: { telefono: phoneNumber },
                messageId: response.data.key?.id,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
            return {
                success: false,
                contact: { telefono: phoneNumber },
                error: error.message
            };
        }
    }

    // NUEVA FUNCIÓN: Envío masivo de mensajes
    async sendBulkMessages(contacts, messageTemplate) {
        if (!this.isConnected) {
            throw new Error('WhatsApp no está conectado');
        }

        console.log(`📤 Iniciando envío masivo a ${contacts.length} contactos...`);
        
        const results = [];
        
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            
            try {
                // Personalizar mensaje reemplazando [NOMBRE]
                const personalizedMessage = messageTemplate.replace(/\[NOMBRE\]/g, contact.nombre);
                
                console.log(`📤 Enviando mensaje ${i + 1}/${contacts.length} a ${contact.nombre} (${contact.telefono})`);
                
                const result = await this.sendMessage(contact.telefono, personalizedMessage);
                
                results.push({
                    success: result.success,
                    contact: contact,
                    messageId: result.messageId,
                    error: result.error || null,
                    timestamp: new Date()
                });
                
                // Pausa entre mensajes para evitar spam (2 segundos)
                if (i < contacts.length - 1) {
                    console.log('⏳ Esperando 2 segundos antes del siguiente mensaje...');
                    await this.delay(2000);
                }
                
            } catch (error) {
                console.error(`❌ Error enviando mensaje a ${contact.nombre}:`, error.message);
                results.push({
                    success: false,
                    contact: contact,
                    error: error.message,
                    timestamp: new Date()
                });
            }
        }
        
        const exitosos = results.filter(r => r.success).length;
        const fallidos = results.filter(r => !r.success).length;
        
        console.log(`✅ Envío masivo completado: ${exitosos} exitosos, ${fallidos} fallidos`);
        
        return results;
    }

    formatPhoneNumber(phoneNumber) {
        // Limpiar el número
        let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        // Si ya tiene el formato correcto, devolverlo
        if (formatted.includes('@')) {
            return formatted;
        }
        
        // Agregar código de país si no lo tiene
        if (!formatted.startsWith('+')) {
            if (formatted.startsWith('549')) {
                formatted = '+' + formatted;
            } else if (formatted.startsWith('9')) {
                formatted = '+54' + formatted;
            } else {
                formatted = '+549' + formatted;
            }
        }
        
        // Remover el + y agregar @s.whatsapp.net
        formatted = formatted.replace('+', '') + '@s.whatsapp.net';
        
        return formatted;
    }

    async getInstanceInfo() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/instance/fetchInstances`,
                { headers: this.headers }
            );
            
            const instance = response.data.find(inst => 
                inst.instance?.instanceName === this.instanceName
            );
            
            return instance || null;
        } catch (error) {
            console.error('❌ Error obteniendo info de instancia:', error.message);
            return null;
        }
    }

    getStatus() {
        return {
            status: this.status,
            message: this.statusMessage,
            isConnected: this.isConnected,
            qrCode: this.qrCode,
            instanceName: this.instanceName
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    handleWebhook(data) {
        console.log('📨 Webhook recibido:', data);
        
        if (data.event === 'connection.update' || data.data?.event === 'connection.update') {
            const connectionData = data.data || data;
            
            if (connectionData.state === 'open') {
                this.isConnected = true;
                this.status = 'connected';
                this.statusMessage = 'Conectado vía webhook';
                this.qrCode = null;
                console.log('✅ Conectado vía webhook');
            } else if (connectionData.state === 'close') {
                this.isConnected = false;
                this.status = 'disconnected';
                this.statusMessage = 'Desconectado';
                console.log('❌ Desconectado vía webhook');
            }
        }
    }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
