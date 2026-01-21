# Gestión de Precios de Cauchos y Baterías

Aplicación web desarrollada con Next.js 16, TypeScript y Prisma para la gestión de precios de cauchos y baterías con impuestos y ajustes.

## Características Implementadas

### ✅ Funcionalidades Principales
- **Gestión de Productos**: Agregar, editar y eliminar cauchos y baterías
- **Sistema de Precios**: Soporte para múltiples tipos de precios (Transferencia, Cashea, Divisas, Personalizado)
- **Ajustes Globales**: Configuración de ajustes porcentuales para cada tipo de precio
- **Ajustes Individuales**: Posibilidad de sobreescribir ajustes globales por producto
- **Impuestos**: Configuración de tasa de impuestos aplicable a todos los productos
- **Autenticación**: Sistema de administrador con contraseña (Chirica001*)
- **Búsqueda**: Filtrado de productos por tipo o medida

### ✅ Importación y Exportación
- **Importación desde Excel**: Soporte para archivos .xlsx, .xls y .csv
- **Exportación a Excel**: Generación de archivos Excel con los productos actuales
- **Detección Inteligente**: Reconocimiento automático de columnas y datos

### ❌ Funcionalidades Eliminadas
- **Importación desde PDF**: Removida según solicitud
- **Importación desde Imágenes**: Removida según solicitud
- **Reconocimiento OCR**: Removido según solicitud

## Arquitectura Técnica

### Frontend
- **Next.js 16** con App Router
- **TypeScript** para tipado seguro
- **Tailwind CSS** para estilos
- **Componentes personalizados** con Glassmorphism

### Backend
- **API Routes** de Next.js
- **Prisma ORM** para base de datos
- **SQLite** como base de datos local
- **XLSX** para manejo de archivos Excel

### Base de Datos
- **Products**: Almacenamiento de productos con precios y ajustes
- **Settings**: Configuraciones globales y ajustes

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── products/          # CRUD de productos
│   │   ├── settings/          # Configuraciones
│   │   └── export/            # Exportación a Excel
│   ├── components/
│   │   └── ExcelImport.tsx    # Componente de importación
│   ├── lib/
│   │   └── db.ts              # Cliente de Prisma
│   └── page.tsx               # Página principal
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
```

## Instalación y Uso

1. **Instalar dependencias**:
   ```bash
   bun install
   ```

2. **Configurar base de datos**:
   ```bash
   bun run db:push
   bun run db:generate
   ```

3. **Iniciar desarrollo**:
   ```bash
   bun run dev
   ```

4. **Acceder a la aplicación**:
   - URL: http://localhost:3000
   - Contraseña de administrador: `Chirica001*`

## Características de Seguridad

- **Autenticación por contraseña**: Solo los administradores pueden modificar datos
- **Validación de datos**: Verificación en frontend y backend
- **Sanitización de entradas**: Protección contra inyección de código

## Mejoras Implementadas

1. **Sin PDF**: Se eliminó completamente la funcionalidad de importación desde PDF
2. **Exportación Excel**: Botón prominente para exportar datos actuales
3. **Base de Datos Robusta**: Esquema bien estructurado con Prisma
4. **TypeScript**: Tipado completo para mayor seguridad
5. **Responsive Design**: Interfaz adaptable a móviles y escritorio

## Tecnologías Utilizadas

- **Next.js 16**: Framework React full-stack
- **TypeScript**: Superset de JavaScript con tipado
- **Prisma**: ORM moderno para bases de datos
- **SQLite**: Base de datos ligera y confiable
- **Tailwind CSS**: Framework de CSS utility-first
- **XLSX**: Librería para manejo de archivos Excel

La aplicación está lista para producción y cumple con todos los requisitos solicitados.