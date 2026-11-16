# Maletín — Sistema de planificación para generar riqueza desde cero

App web (React + TypeScript + Vite + Tailwind + Framer Motion + Recharts) para un estudiante de 18 años en Jesús María, Aguascalientes, que empieza con $0 MXN.

## Uso

```bash
cd maletin
npm install
npm run dev      # desarrollo
npm run build    # genera dist/ (sitio estático, funciona en cualquier hosting o abriendo con un servidor local)
```

Los datos se guardan en el navegador (localStorage). Exporta un respaldo JSON desde **Respaldo** cada semana.

## Secciones

1. Diagnóstico → perfil de emprendedor y 3 rutas recomendadas
2. Catálogo de 46 ideas con ficha completa y filtros
3. Protocolos interactivos (Día 0–7, 30 y 90 días, prospección, precios, entrega, dinero, semana de estudiante, anti-burnout)
4. Escalera de riqueza (7 niveles, calculada con tus ingresos reales)
5. Centro financiero (registro, gráficos, metas, calculadora de interés compuesto, guía de formalización)
6. CRM de prospectos y clientes
7. Panel de mando
8. Biblioteca de habilidades con recursos gratuitos
9. Trampas que debes evitar
10. Diario y revisión semanal

## Maletín 2.0: Planificación de doble vía

- **Sala de guerra**: meta del mes, progreso, pipeline proyectado, sprint activo, ritual del día y el próximo paso más importante.
- **Modo Efectivo (Vía Rápida)**: sprints de 72 h / 7 d / 30 d con contador, 22 ofertas express, constructor de ofertas, mapa de prospección local y contador de actividad con tasas de conversión.
- **Modo Imperio (Vía Larga)**: árbol de activos con hitos, evolución de LKM'r, laboratorio de productos con validación, simulador de futuro y fondo de Vía Larga. Cada ingreso de Vía Rápida aparta automáticamente el % configurado (20% por defecto).
- **Plan maestro**: visión a 10 años → 5 años → año → OKR trimestral → mes → semana → hoy, matriz ICE, planificador semanal (pincel + arrastrar y soltar), ritual diario y revisión mensual.
- **Herramientas**: cotizador con PDF y WhatsApp, calculadora de precios (hora / proyecto / valor), biblioteca de guiones, logros y modo enfoque (Pomodoro persistente).
- **CRM Kanban** con valor proyectado ponderado por etapa y **plan imprimible**.

Los respaldos de la versión anterior se importan sin perder datos.

## Estructura

- `src/data/` — todo el contenido (ideas por categoría, protocolos, escalera, habilidades, trampas, finanzas)
- `src/store/` — estado global persistente + exportar/importar
- `src/components/ui/` — sistema de diseño
- `src/pages/` — una página por sección

Las cifras de ingresos son estimaciones, no promesas. La información fiscal y financiera es general: verifica en sat.gob.mx o con un contador.
