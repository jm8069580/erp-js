# ERP JavaScript

Sistema ERP desarrollado con Node.js (NestJS) y React (Vite).

## Stack Tecnológico

### Backend
- **NestJS** - Framework Node.js enterprise-ready
- **Prisma** - ORM para PostgreSQL
- **JWT** - Autenticación
- **Swagger** - Documentación API

### Frontend
- **React 18** - Library UI
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **React Hook Form** - Forms
- **Zod** - Validation

## Requisitos

- Node.js >= 18
- PostgreSQL
- npm o yarn

## Instalación

### Backend

```bash
cd backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos de PostgreSQL

# Instalar Prisma
npx prisma generate

# Crear base de datos
npx prisma db push

# Iniciar desarrollo
npm run start:dev
```

La API estará disponible en: http://localhost:3001
Swagger docs: http://localhost:3001/api/docs

### Frontend

```bash
cd frontend
npm install

# Iniciar desarrollo
npm run dev
```

El frontend estará disponible en: http://localhost:5173

## Estructura del Proyecto

```
erp-js/
├── backend/
│   ├── src/
│   │   ├── auth/           # Módulo de autenticación
│   │   ├── users/          # Módulo de usuarios
│   │   ├── products/       # Módulo de productos
│   │   ├── stats/          # Módulo de estadísticas
│   │   ├── notion/         # Módulo Notion (opcional)
│   │   ├── prisma/         # Servicio Prisma
│   │   ├── common/         # Decoradores y guards
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma   # Schema de base de datos
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── layouts/        # Layouts
│   │   ├── pages/          # Páginas
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand stores
│   │   └── App.tsx         # Rutas y protección
│   └── package.json
└── README.md
```

## API Endpoints

### Auth
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/profile` - Obtener perfil

### Users (escritura solo ADMIN)
- `GET /api/v1/users` - Listar usuarios
- `POST /api/v1/users` - Crear usuario
- `GET /api/v1/users/:id` - Obtener usuario
- `PATCH /api/v1/users/:id` - Actualizar usuario
- `DELETE /api/v1/users/:id` - Eliminar usuario

### Products (escritura ADMIN/MANAGER)
- `GET /api/v1/products` - Listar productos
- `POST /api/v1/products` - Crear producto
- `GET /api/v1/products/:id` - Obtener producto
- `PATCH /api/v1/products/:id` - Actualizar producto
- `DELETE /api/v1/products/:id` - Eliminar producto

## Configuración

### Backend

Las variables de entorno aceptadas son (ver `backend/.env.example`):

| Variable | Descripción | Default |
| --- | --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL | requerido |
| `JWT_SECRET` | Secreto para firmar JWT | requerido |
| `JWT_EXPIRATION` | Expiración del token | `1h` |
| `PORT` | Puerto HTTP | `3001` |
| `API_PREFIX` | Prefijo global de la API | `api/v1` |
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma; vacío = permitir todos) | `http://localhost:5173` |
| `NOTION_TOKEN` | Token de API de Notion (opcional) | vacío |
| `NOTION_DOCS_PAGE_ID` | ID de página padre de la documentación | vacío |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Usuario admin del seed | `admin@erp.com` / `admin123` |

El puerto y el prefijo se leen de las variables de entorno (`PORT`, `API_PREFIX`).

### Frontend

- `VITE_API_URL`: URL base de la API. En desarrollo se usa el proxy de Vite (no es necesario definirla); en producción o para apuntar a otro servidor, definir la URL completa (p. ej. `http://localhost:3001/api/v1`). Si está vacía o ausente, se usa `/api/v1`.
