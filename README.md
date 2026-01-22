<<<<<<< HEAD
# Sistema de Gestión de Precios de Cauchos y Baterías

Aplicación web Next.js para gestión dinámica de precios con ajustes globales y base de datos en la nube.

## 🚀 Características

- ✅ **Gestión de productos** (Cauchos y Baterías)
- ✅ **Ajustes de precios base** (-5%, -1%, 0, +1%, +5%, +)
- ✅ **Ajustes globales** por tipo de precio (Cashea, Transferencia, Divisas, Personalizado)
- ✅ **Importación/Exportación Excel**
- ✅ **Base de datos en la nube** (Supabase)
- ✅ **Actualizaciones en tiempo real**
- ✅ **Responsive design**
- ✅ **Panel de administrador seguro**

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui
- **File Processing**: XLSX

## 📋 Configuración Inicial

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd <project-folder>
```

### 2. Instalar dependencias
```bash
bun install
```

### 3. Configurar Supabase
1. Crea una cuenta en [https://supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia las credenciales (Project URL y anon key)
4. Ejecuta el schema SQL (`supabase-schema.sql`) en el SQL Editor de Supabase

### 4. Configurar variables de entorno
Crea un archivo `.env` con:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Iniciar desarrollo
```bash
bun run dev
```

Visita `http://localhost:3000` para ver la aplicación.

## 🌐 Despliegue en Producción

### Opción 1: Vercel (Recomendado)
1. Crea cuenta en [https://vercel.com](https://vercel.com)
2. Conecta tu repositorio de GitHub
3. Configura las variables de entorno en Vercel
4. Despliega automáticamente

### Opción 2: Netlify
1. Crea cuenta en [https://netlify.com](https://netlify.com)
2. Conecta tu repositorio de GitHub
3. Configura las variables de entorno
4. Despliega

## 📊 Funcionalidades Principales

### Ajustes de Precios Base
- **📊 Ajustar Lista (Bs)**: Botones rápidos -5%, -1%, 0, +1%, +5%, +
- **💵 Ajustar Lista ($)**: Botones rápidos -5%, -1%, 0, +1%, +5%, +
- Redondeo automático a múltiplos de 5
- Guardado automático en la nube

### Ajustes Globales
- **Cashea (Bs)**: Ajuste global para precios en Bolívares
- **Transferencia (Bs)**: Ajuste para transferencias
- **Divisas ($)**: Ajuste para precios en dólares
- **Otro Precio**: Ajuste personalizado

### Gestión de Productos
- Agregar/editar/eliminar productos
- Importación masiva desde Excel
- Exportación a Excel
- Ajustes individuales por producto

## 🔐 Seguridad

- Panel de administrador con contraseña
- Contraseña por defecto: `admin123`
- Las credenciales de Supabase son públicas (solo para lectura/escritura de datos)

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/          # API Routes
│   │   ├── products/
│   │   └── settings/
│   ├── components/   # Componentes React
│   └── page.tsx      # Página principal
├── lib/
│   ├── supabase.ts   # Cliente de Supabase
│   └── db.ts         # Antiguo cliente Prisma (deprecado)
└── components/
    └── ui/           # Componentes shadcn/ui
```

## 🔄 Migración desde SQLite

Si vienes de la versión local con SQLite:

1. Configura Supabase (ver arriba)
2. Ejecuta el schema SQL en Supabase
3. Los datos locales no se migran automáticamente
4. Deberás重新ingresar los productos

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🆘 Soporte

Si tienes problemas:

1. Revisa el archivo `SUPABASE_SETUP.md`
2. Verifica que las variables de entorno estén correctas
3. Asegúrate de haber ejecutado el schema SQL en Supabase
4. Revisa la consola del navegador para errores

---

**Hecho con ❤️ usando Next.js y Supabase**
