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

La API estará disponible en: http://localhost:3000
Swagger docs: http://localhost:3000/api/docs

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
│   │   ├── prisma/         # Servicio Prisma
│   │   ├── common/         # Decoradores, guards, utils
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma   # Schema de base de datos
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── features/       # Módulos por feature
│   │   ├── hooks/          # Custom hooks
│   │   ├── layouts/        # Layouts
│   │   ├── pages/          # Páginas
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand stores
│   │   └── types/          # TypeScript types
│   └── package.json
└── README.md
```

## API Endpoints

### Auth
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/profile` - Obtener perfil

### Users
- `GET /api/v1/users` - Listar usuarios
- `POST /api/v1/users` - Crear usuario
- `GET /api/v1/users/:id` - Obtener usuario
- `PATCH /api/v1/users/:id` - Actualizar usuario
- `DELETE /api/v1/users/:id` - Eliminar usuario
