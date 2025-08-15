# 🌟 Sistema de Puntos Empresarial con WhatsApp

Un sistema completo para empresas que desean implementar un programa de fidelización de clientes con puntos y mensajería masiva por WhatsApp.

## 🚀 Características Principales

### 📊 Sistema de Puntos
- ✅ Gestión de clientes por categorías (Bronce, Plata, Oro, Platino)
- ✅ Acumulación automática de puntos por compras
- ✅ Descuentos automáticos según categoría
- ✅ Seguimiento de movimientos de puntos

### 📱 Mensajería WhatsApp
- ✅ Envío masivo de promociones por categoría
- ✅ Mensajes personalizados con nombre del cliente
- ✅ Segmentación de audiencia
- ✅ Control de preferencias de marketing

### 🎯 Promociones Segmentadas
- ✅ Creación de promociones específicas por categoría
- ✅ Programación de fechas de vigencia
- ✅ Vista previa de mensajes
- ✅ Plantillas predefinidas

### 🔐 Panel de Administración
- ✅ Autenticación segura
- ✅ Dashboard con estadísticas
- ✅ Interfaz intuitiva con Bootstrap 5
- ✅ Responsive design

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js + Express
- **Base de Datos**: PostgreSQL
- **Frontend**: EJS + Bootstrap 5
- **Autenticación**: Express-session + bcryptjs
- **WhatsApp**: whatsapp-web.js (preparado)
- **Estilos**: CSS personalizado con gradientes

## 📋 Requisitos Previos

1. **Node.js** (versión 14 o superior)
2. **PostgreSQL** (versión 12 o superior)
3. **NPM** o **Yarn**

## ⚡ Instalación Rápida

### 1. Clonar e Instalar Dependencias

```bash
# Navegar al directorio del proyecto
cd "Sistema de puntos"

# Instalar dependencias
npm install
```

### 2. Configurar Base de Datos

#### Crear la base de datos en PostgreSQL:
```sql
CREATE DATABASE sistema_puntos;
```

#### Ejecutar el script de creación de tablas:
```bash
# Conectar a PostgreSQL y ejecutar
psql -d sistema_puntos -f database.sql
```

### 3. Configurar Variables de Entorno

Edita el archivo `.env` con tus datos:

```env
# Configuración de la base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_puntos
DB_USER=tu_usuario_postgresql
DB_PASSWORD=tu_password_postgresql

# Configuración del servidor
PORT=3000
SESSION_SECRET=tu_clave_secreta_super_segura_cambiar_esto

# Configuración de administrador por defecto
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 4. Iniciar el Servidor

```bash
# Modo desarrollo
npm run dev

# O modo producción
npm start
```

### 5. Acceder al Sistema

Abre tu navegador y ve a: `http://localhost:3000`

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

## 📊 Estructura de la Base de Datos

### Tablas Principales:

- **usuarios**: Administradores del sistema
- **categorias**: Categorías de clientes (Bronce, Plata, Oro, Platino)
- **clientes**: Información de clientes y puntos acumulados
- **promociones**: Promociones segmentadas por categoría
- **movimientos_puntos**: Historial de puntos ganados/canjeados
- **mensajes_enviados**: Registro de mensajes de WhatsApp

## 🎯 Guía de Uso

### 1. Configuración Inicial

1. **Crear Categorías**: Define las categorías de clientes con sus beneficios
   - Ejemplo: VIP (15% descuento, 2 puntos por peso)
   - Ejemplo: Frecuente (5% descuento, 1.25 puntos por peso)

2. **Agregar Clientes**: Registra clientes y asígnalos a categorías
   - Incluye número de WhatsApp para promociones
   - Configura preferencias de marketing

### 2. Gestión de Promociones

1. **Crear Promoción**: Define título, descripción y fechas
2. **Seleccionar Categoría**: Elige qué grupo de clientes recibirá la promoción
3. **Personalizar Mensaje**: Crea el mensaje de WhatsApp personalizado
4. **Enviar**: Distribución masiva a la categoría seleccionada

### 3. Mensajería WhatsApp

- Los mensajes se envían solo a clientes que aceptaron promociones
- Cada mensaje incluye automáticamente el nombre del cliente
- Se registra cada envío para seguimiento y analíticas

## 🔧 Configuración Avanzada

### WhatsApp Business API

Para habilitar el envío real de WhatsApp:

1. Obtén credenciales de WhatsApp Business API
2. Configura las variables de entorno correspondientes
3. Modifica el código de envío en `/whatsapp/enviar`

### Personalización de Categorías

Puedes modificar las categorías por defecto editando `database.sql`:

```sql
INSERT INTO categorias (nombre, descripcion, descuento_porcentaje, puntos_por_peso) VALUES
('Tu Categoría', 'Descripción', 10.00, 1.50);
```

## 📁 Estructura del Proyecto

```
Sistema de puntos/
├── config/
│   └── database.js          # Configuración de PostgreSQL
├── public/
│   └── css/
│       └── styles.css       # Estilos personalizados
├── views/
│   ├── clientes/           # Vistas de gestión de clientes
│   ├── categorias/         # Vistas de gestión de categorías
│   ├── promociones/        # Vistas de gestión de promociones
│   ├── whatsapp/          # Vistas de mensajería
│   ├── dashboard.ejs      # Panel principal
│   ├── login.ejs          # Página de login
│   └── layout.ejs         # Layout principal
├── .env                   # Variables de entorno
├── database.sql          # Script de creación de BD
├── package.json          # Dependencias del proyecto
├── server.js             # Servidor principal
└── README.md            # Este archivo
```

## 🚀 Funcionalidades del Sistema

### Dashboard Principal
- Estadísticas en tiempo real
- Accesos rápidos a funciones principales
- Resumen de clientes, categorías y promociones

### Gestión de Clientes
- ➕ Agregar nuevos clientes
- 📋 Lista completa con filtros
- 🏷️ Asignación de categorías
- ⭐ Visualización de puntos acumulados

### Gestión de Categorías
- 🎨 Categorías personalizables
- 💰 Configuración de descuentos
- ⭐ Configuración de puntos por peso
- 📊 Vista previa de beneficios

### Sistema de Promociones
- 📅 Programación por fechas
- 🎯 Segmentación por categoría
- 📱 Vista previa de mensajes WhatsApp
- 📋 Plantillas predefinidas

### Mensajería WhatsApp
- 📤 Envío masivo por categoría
- 👤 Personalización con nombre del cliente
- ✅ Control de preferencias de marketing
- 📊 Registro de mensajes enviados

## 🔐 Seguridad

- Autenticación con sesiones seguras
- Contraseñas hasheadas con bcrypt
- Validación de datos de entrada
- Protección contra inyección SQL

## 🚧 Roadmap de Mejoras

### Próximas Funcionalidades:
- [ ] API REST para integraciones
- [ ] Reportes y analíticas avanzadas
- [ ] Integración con WhatsApp Business API
- [ ] Sistema de roles y permisos
- [ ] Importación masiva de clientes
- [ ] Notificaciones por email
- [ ] Dashboard para clientes
- [ ] App móvil

## 🆘 Solución de Problemas

### Error de Conexión a PostgreSQL
```bash
# Verificar que PostgreSQL esté corriendo
pg_ctl status

# Verificar credenciales en .env
```

### Error "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error de Puerto en Uso
```bash
# Cambiar puerto en .env
PORT=3001
```

## 📞 Soporte

Para soporte técnico o consultas sobre implementación:

1. Revisa la documentación en este README
2. Verifica los logs del servidor en la consola
3. Consulta los comentarios en el código fuente

## 📄 Licencia

Este proyecto está bajo la licencia ISC. Ver el archivo `package.json` para más detalles.

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

⭐ **¡Dale una estrella si este proyecto te resulta útil!** ⭐
