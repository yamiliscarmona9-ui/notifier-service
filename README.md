# Notifiers Service (`notifiers-service`)

Microservicio Worker desarrollado en **TypeScript** con **NestJS** encargado de consumir eventos de **Apache Kafka** y enviar correos de bienvenida vía **SMTP** (usando `nodemailer`).

El servicio está diseñado como un **Background Worker puro**: no expone endpoints HTTP ni requiere conexión a base de datos.

---

## 🏛️ Arquitectura Hexagonal

El proyecto implementa estrictamente los principios de la Arquitectura Hexagonal (Puertos y Adaptadores):

```
src/
├── domain/                               # Núcleo de Dominio
│   └── ports/
│       └── email-sender.port.ts          # Puerto de salida: EmailSenderPort
├── application/                          # Casos de Uso
│   └── use-cases/
│       └── send-email.use-case.ts        # SendEmailUseCase: Orquesta el envío
├── infrastructure/                       # Adaptadores y Configuración
│   ├── adapters/
│   │   ├── in/                           # Adaptadores de Entrada (Controladores Kafka)
│   │   │   └── kafka-consumer.controller.ts  # KafkaConsumerController (@MessagePattern('user-events'))
│   │   └── out/                          # Adaptadores de Salida
│   │       └── smtp-email.adapter.ts     # SmtpEmailAdapter (implementa EmailSenderPort con Nodemailer)
│   └── config/
│       └── kafka.config.ts               # Configuración de Kafka (Aiven SSL + SASL)
├── app.module.ts                         # Registro de ClientKafka y onModuleInit
└── main.ts                               # Bootstrap como Microservicio Kafka (sin HTTP)
```

### Componentes Clave

1. **Dominio (`src/domain/ports/email-sender.port.ts`)**:
   - `EmailSenderPort`: Interfaz con el contrato `sendWelcomeEmail(email: string, name: string): Promise<void>`.
   - Token de inyección `EMAIL_SENDER_PORT`.

2. **Aplicación (`src/application/use-cases/send-email.use-case.ts`)**:
   - `SendEmailUseCase`: Recibe las dependencias mediante inversión de control, valida y orquesta el envío del correo de bienvenida.

3. **Infraestructura - Adaptador de Entrada (`src/infrastructure/adapters/in/kafka-consumer.controller.ts`)**:
   - `KafkaConsumerController`: Escucha el tópico `user-events` mediante `@MessagePattern('user-events')`.
   - Extrae de forma segura `email` y `name`, siendo compatible con eventos de Spring Boot (`UserCreatedDomainEvent` con payload anidado `{ eventName, payload: { email, name } }`), payloads planos (`{ email, name }`) y mensajes empaquetados por KafkaJS (`{ value: ... }` / `Buffer`).
   - Invoca `SendEmailUseCase.sendWelcomeEmail(email, name)`.

4. **Infraestructura - Adaptador de Salida (`src/infrastructure/adapters/out/smtp-email.adapter.ts`)**:
   - `SmtpEmailAdapter`: Implementa `EmailSenderPort` utilizando `nodemailer`.
   - Lee la configuración del servidor SMTP (`SMTP_HOST`, `SMTP_PORT`, credenciales y remitente).

5. **Módulo Principal (`src/app.module.ts`)**:
   - Configura `ClientKafka` con `ClientsModule.registerAsync`.
   - Implementa `OnModuleInit`: se suscribe al tópico `user-events` mediante `this.kafkaClient.subscribeToResponseOf('user-events')` y establece la conexión.

6. **Punto de Entrada (`src/main.ts`)**:
   - Inicializa la aplicación mediante `NestFactory.createMicroservice<MicroserviceOptions>`, asegurando que no se levante ningún servidor HTTP.

---

## ⚙️ Configuración de Variables de Entorno

Crear un archivo `.env` en la raíz (se proporciona `.env.example` como plantilla):

```bash
cp .env.example .env
```

### Parámetros Disponibles:

```ini
# ==========================================
# Kafka Configuration (Aiven / Local)
# ==========================================
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=notifiers-service
KAFKA_GROUP_ID=notifiers-service-group
KAFKA_USER_EVENTS_TOPIC=user-events

# Credenciales Aiven Kafka (SSL y SASL):
KAFKA_SSL=false
KAFKA_CA_PATH=./ca.pem
KAFKA_SASL_USERNAME=
KAFKA_SASL_PASSWORD=
KAFKA_SASL_MECHANISM=plain

# ==========================================
# SMTP Email Configuration (Nodemailer)
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=tu-correo@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM_ADDRESS=tu-correo@gmail.com
SMTP_FROM_NAME=Gestión de Usuarios
```

> **Nota para Aiven Kafka**: Si se conecta a un clúster Aiven en la nube (`*.aivencloud.com`), configure `KAFKA_SSL=true`, el certificado CA (`ca.pem` incluido en la raíz), y las credenciales SASL (`KAFKA_SASL_USERNAME` y `KAFKA_SASL_PASSWORD`).

---

## 🚀 Comandos de Ejecución

```bash
# Instalar dependencias
npm install

# Compilar proyecto en TypeScript
npm run build

# Iniciar en modo desarrollo con recarga automática
npm run start:dev

# Iniciar en producción
npm run start:prod
```

---

## 🧪 Pruebas Automatizadas

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Ejecutar pruebas con reporte de cobertura
npm run test:cov

# Ejecutar pruebas de integración (e2e)
npm run test:e2e

# Ejecutar linter
npm run lint
```
