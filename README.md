# Sistema de Gestión de Órdenes — v2

Aplicación web para el seguimiento de órdenes de trabajo. Optimizada para grandes volúmenes (800+ órdenes/mes).

## Funcionalidades

- 🔐 Login con usuario y contraseña
- 👑 Sistema de Super Admin (solo el admin original autoriza cambios de rol)
- 📊 Dashboard con KPIs (filtros por sucursal, mes, año)
- 📝 Carga de órdenes con N° orden + N° reclamo + modelo de vehículo
- ✅ Seguimiento por estado: Iniciado, Reclamado, Anulado, Pagado
- 💰 Carga diferenciada de pagos de fábrica
- 📈 Reportes detallados por estado con paginación
- 🔍 Búsqueda en servidor (rápida con muchos registros)
- ⚠️ Análisis de órdenes con pérdida
- ⚙️ Gestión de asesores, sucursales, modelos y usuarios
- 📥 Exportación a Excel

## Configuración

Variables de entorno necesarias en Vercel:
```
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Base de datos

- **Primera vez:** ejecutá `setup-database.sql`
- **Si actualizás desde v1:** ejecutá `setup-database-v2.sql` (no borra tus datos)

## Usuario inicial

- Usuario: `admin`
- Contraseña: `admin123` (cambiala en cuanto entres)

El usuario `admin` es **Super Administrador** y es el único que puede asignar/quitar el rol de administrador a otros usuarios.
