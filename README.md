<<<<<<< HEAD
# Sistema de Gestión de Precios - Cauchos y Baterias

Aplicación web Next.js para gestión dinámica de precios de Cauchos y Baterías, con actualizaciones automáticas de tasa BCV y cálculos de precios especializados.

## 🚀 Características Principales

### 💰 Gestión de Precios Inteligente
- **Cálculo Automático**: Precios en Bs y USD actualizados en tiempo real.
- **Reglas de Negocio Personalizadas**:
  - **Cashea**: Cálculo automático del 45% del precio (Cliente paga inicial del 55%).
  - **Transferencia**: Descuento del 55% sobre el precio base.
  - **Pago Móvil (Bs)**: Aumento del 300% sobre la base en Bs.
  - **Divisas**: Precio base en dólares sin ajustes.

### 🔄 Automatización y Datos
- **Tasa BCV Automática**: Se actualiza automáticamente desde el Banco Central de Venezuela cada 12 horas.
- **Indicador en Tiempo Real**: Visualización de la tasa actual en el encabezado.
- **Base de Datos en la Nube**: Integración con Supabase para persistencia de datos.

### ⚡ Rendimiento Optimizado
- **Carga Diferida (Lazy Loading)**: Módulos pesados como exportación PDF/Excel se cargan solo cuando se necesitan.
- **Mejoras UX**: Esqueletos de carga (Skeletons) para una experiencia fluida.
- **Código Optimizado**: Eliminación de dependencias no utilizadas y code-splitting.

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **UI Components**: shadcn/ui, Lucide Icons
- **Herramientas**: `jspdf`, `xlsx` (Carga dinámica)

## 📋 Configuración Inicial

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd <project-folder>
```

### 2. Instalar dependencias
```bash
npm install
# o
bun install
```

### 3. Configurar Variables de Entorno
Crea un archivo `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key (Solo para scripts administrativos)
```

### 4. Iniciar desarrollo
```bash
npm run dev
```

Visita `http://localhost:3000` para ver la aplicación.

## 🔒 Roles y Seguridad
- **Super Admin**: Acceso total a configuración, usuarios y precios.
- **Administrador**: Gestión de precios e inventario.
- **Trabajador**: Vista de lista de precios y calculadora.

---
**Desarrollado para Grupo Chirica**
