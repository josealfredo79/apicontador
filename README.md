<div align="center">

# 🔐 API Contador Soroban

### REST API · Contratos Inteligentes Stellar · Smart Wallet con Passkeys (WebAuthn)

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.22-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Stellar SDK](https://img.shields.io/badge/@stellar%2Fstellar--sdk-15.0-7D00FF?style=flat-square&logo=stellar&logoColor=white)](https://github.com/stellar/js-stellar-sdk)
[![SimpleWebAuthn](https://img.shields.io/badge/@simplewebauthn%2Fserver-9.0-4ecdc4?style=flat-square)](https://simplewebauthn.dev)
[![Deploy on Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://railway.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**[🚀 Ver DApp + Tutorial en Vivo](https://api-contador-production.up.railway.app)** &nbsp;·&nbsp;
**[🌐 API Pública](https://api-contador-production.up.railway.app/contador)** &nbsp;·&nbsp;
**[🔍 Stellar Explorer](https://stellar.expert/explorer/testnet)**

</div>

---

## 📋 ¿Qué es este proyecto?

API REST construida con **Node.js + Express** que interactúa con un **contrato inteligente Contador** desplegado en **Soroban (Stellar Testnet)**. Incluye autenticación sin contraseñas usando **Passkeys / WebAuthn** (biometría: huella digital, Face ID o PIN del dispositivo).

El proyecto sirve como actividad académica completa para aprender:

| Concepto | Tecnología usada |
|---|---|
| Servidores web | Node.js + Express |
| APIs REST | Express Router + middleware |
| Contratos inteligentes | Soroban (Stellar) |
| Blockchain | Stellar Testnet |
| Autenticación sin contraseñas | WebAuthn / FIDO2 (Passkeys) |
| Despliegue en producción | Railway |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     DApp (Navegador)                            │
│  ┌──────────────────────┐   ┌─────────────────────────────────┐ │
│  │    Smart Wallet UI   │   │       Contador UI               │ │
│  │  navigator.credentials│  │  GET  /contador  (público)      │ │
│  │  .create() registro  │   │  POST /increment [Bearer Token] │ │
│  │  .get()    login     │   │  POST /decrement [Bearer Token] │ │
│  └──────────┬───────────┘   └───────────────┬─────────────────┘ │
└─────────────┼─────────────────────────────────┼─────────────────┘
              │  Bearer Token (24h)              │ Bearer Token
              ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API REST  (index.js / Express)                  │
│  ┌──────────────────────┐   ┌─────────────────────────────────┐ │
│  │  /auth/*  Passkeys   │   │  /contador/*  Blockchain        │ │
│  │  register/begin      │   │  GET  /contador                 │ │
│  │  register/complete   │   │  POST /increment ← [auth]       │ │
│  │  login/begin         │   │  POST /decrement ← [auth]       │ │
│  │  login/complete      │   │  POST /reset     ← [auth]       │ │
│  └──────────┬───────────┘   └───────────────┬─────────────────┘ │
│             └──── requireAuth middleware ────┘                   │
└────────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│          Stellar Soroban TESTNET (soroban-testnet.stellar.org)  │
│          Contrato: increment() / decrement() / reset() / get()  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js 20+** — [nodejs.org](https://nodejs.org) (versión LTS)
- **Git** — [git-scm.com](https://git-scm.com)

### Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/josealfredo79/apicontador.git
cd apicontador

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores (ver sección Variables de Entorno)

# 4. Iniciar el servidor
npm start
# → http://localhost:3000
```

Con `npm run dev` el servidor se recarga automáticamente al guardar cambios.

---

## ⚙️ Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (nunca lo subas a GitHub):

```env
# ID del contrato inteligente en Soroban Testnet
CONTRACT_ID=CCPS7OWL25OIBYGBMM7EXLFPQBKTOIREWIKYZZR2FM5MTFVOOO6UTMTF

# Cuenta Stellar que firma las transacciones
PUBLIC_KEY=GDACK6HOWBCIENKEQZHWI35FBYXRTTGVWGIADAK6BHLM3XP4UQCP6NLN
SECRET_KEY=SDKM74652MDRO3S5CJSTDRXQGN5DMECAF7ITFDGKHJGSKH7DXO4DSTOU

# Red de Stellar
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL=https://soroban-testnet.stellar.org

# Puerto (Railway lo sobreescribe automáticamente)
PORT=3000

# Dominio para Passkeys/WebAuthn
# ▸ Local:      localhost
# ▸ Railway:    mi-app.up.railway.app  (sin https:// ni /)
RP_ID=localhost
```

> ⚠️ **`SECRET_KEY`** es la llave privada de tu cuenta Stellar. Quien la tenga puede mover fondos. En producción úsala solo como variable de entorno del servidor, nunca en el frontend.

---

## 🔌 Endpoints de la API

Base URL en producción: `https://api-contador-production.up.railway.app`

### Contador (Blockchain)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET`  | `/contador` | — | Lee el valor actual del contrato Soroban |
| `POST` | `/contador/increment` | 🔐 Bearer | Suma 1 al contador (TX en blockchain) |
| `POST` | `/contador/decrement` | 🔐 Bearer | Resta 1 al contador (TX en blockchain) |
| `POST` | `/contador/reset` | 🔐 Bearer | Reinicia el contador a 0 (TX en blockchain) |
| `GET`  | `/health` | — | Estado del servidor |

### Autenticación — Passkeys / WebAuthn

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/register/begin` | Genera opciones para `navigator.credentials.create()` |
| `POST` | `/auth/register/complete` | Verifica la credencial biométrica, devuelve Bearer Token |
| `POST` | `/auth/login/begin` | Genera challenge para usuario existente |
| `POST` | `/auth/login/complete` | Verifica firma biométrica, devuelve nuevo Token |
| `GET`  | `/auth/status` | Verifica si el token de sesión es válido 🔐 |
| `POST` | `/auth/logout` | Invalida el token actual 🔐 |

### Ejemplos con `curl`

```bash
# Leer el contador (público)
curl https://api-contador-production.up.railway.app/contador
# {"valor":7,"success":true}

# Incrementar (requiere Bearer Token obtenido desde la DApp)
curl -X POST https://api-contador-production.up.railway.app/contador/increment \
  -H "Authorization: Bearer TU_TOKEN"
# {"valor":8,"txHash":"abc123def...","success":true}

# Estado de salud
curl https://api-contador-production.up.railway.app/health
```

---

## 🔐 Flujo de Passkeys (WebAuthn / FIDO2)

```
REGISTRO                              LOGIN
─────────                             ─────
1. POST /auth/register/begin          1. POST /auth/login/begin
   ← opciones + challenge aleatorio      ← opciones + challenge aleatorio

2. navigator.credentials.create()    2. navigator.credentials.get()
   Dispositivo pide biometría            Dispositivo pide biometría
   Genera par de llaves PKI              Firma el challenge con llave privada
   Llave privada NUNCA sale             (llave privada nunca sale del dispositivo)
   del dispositivo

3. POST /auth/register/complete       3. POST /auth/login/complete
   @simplewebauthn verifica               @simplewebauthn verifica la firma
   la credencial                          con la llave pública guardada

4. Servidor devuelve Bearer Token (24h)  ← mismo resultado

5. Token → header Authorization: Bearer TOKEN
   Cada POST /contador/* lo requiere
```

> Las Passkeys están **vinculadas al dominio** (RP_ID). Una credencial de `localhost` no funciona en `railway.app` y viceversa. Registra tu cuenta en cada entorno por separado.

---

## 📁 Estructura del Proyecto

```
apicontador/
├── index.js          # Servidor Express: API + Auth + Passkeys
├── index.html        # Tutorial completo + DApp integrada
├── dapp.html         # DApp standalone (alternativa minimalista)
├── package.json      # Dependencias y scripts
├── railway.toml      # Configuración de deploy en Railway
├── .env.example      # Plantilla de variables de entorno
├── .gitignore        # node_modules, .env excluidos
└── README.md         # Este archivo
```

---

## 📦 Dependencias

| Paquete | Versión | Para qué sirve |
|---------|---------|----------------|
| `express` | ^4.22 | Framework HTTP: rutas, middleware, respuestas JSON |
| `cors` | ^2.8 | Permite llamadas cross-origin (CORS headers) |
| `dotenv` | ^16.6 | Lee variables del archivo `.env` |
| `@stellar/stellar-sdk` | ^15.0 | Construye, firma y envía transacciones a Soroban |
| `@simplewebauthn/server` | ^9.0 | Verifica credenciales WebAuthn en el servidor |

Frontend (CDN, sin instalación):

```html
<script src="https://unpkg.com/@simplewebauthn/browser@9/dist/bundle/index.umd.min.js"></script>
```

---

## ☁️ Deploy en Railway

```bash
# 1. Login con Railway CLI
npx @railway/cli login

# 2. Inicializar proyecto (primera vez)
npx @railway/cli init
npx @railway/cli up

# 3. Configurar variables de entorno
npx @railway/cli variables set \
  CONTRACT_ID=... \
  PUBLIC_KEY=... \
  SECRET_KEY=... \
  RPC_URL=https://soroban-testnet.stellar.org \
  NETWORK_PASSPHRASE="Test SDF Network ; September 2015" \
  RP_ID=tu-app.up.railway.app

# 4. Redeploy con cambios
npx @railway/cli up --detach

# 5. Ver logs en tiempo real
npx @railway/cli logs
```

Railway detecta automáticamente Node.js (`package.json`), ejecuta `npm install` y `npm start`.

---

## 🔧 Solución de Problemas

| Error | Causa | Solución |
|-------|-------|----------|
| `CONTRACT_ID no configurado` | Falta el `.env` o la variable | `cp .env.example .env` y editar |
| `Account not found` | Cuenta sin fondos en Testnet | `stellar keys fund MI-CUENTA --network testnet` |
| `ECONNREFUSED` | El servidor no está corriendo | Ejecutar `npm start` y dejarlo abierto |
| `Transaction failed` | CONTRACT_ID incorrecto o sin XLM | Verificar el txHash en [stellar.expert](https://stellar.expert/explorer/testnet) |
| Passkeys no funcionan en Railway | RP_ID incorrecto | Debe ser el dominio sin `https://` ni `/` |
| Usuarios se pierden al reiniciar | Almacenamiento en RAM | En producción real: conectar PostgreSQL |

---

## 🛣️ Posibles Mejoras

- [ ] Base de datos PostgreSQL para persistencia de usuarios
- [ ] JWT firmado con RS256 en lugar de tokens aleatorios
- [ ] Rate limiting por IP (express-rate-limit)
- [ ] Soporte multi-contract (varios contratos por usuario)
- [ ] Dashboard con historial completo de transacciones
- [ ] Tests automatizados con Jest + Supertest

---

## 📚 Recursos

- [Documentación de Soroban](https://docs.stellar.org/build/smart-contracts/getting-started/setup)
- [SimpleWebAuthn Docs](https://simplewebauthn.dev/docs/)
- [passkeys.dev — Guía WebAuthn](https://passkeys.dev)
- [Stellar Expert — Explorador Testnet](https://stellar.expert/explorer/testnet)
- [Railway Docs](https://docs.railway.app)

---

## 📄 Licencia

MIT © 2026 — Actividad académica de desarrollo Web3 con Stellar Soroban

---

<div align="center">

Hecho con ☕ usando Node.js · Stellar · WebAuthn · Railway

</div>
