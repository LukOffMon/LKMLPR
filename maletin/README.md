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

## Estructura

- `src/data/` — todo el contenido (ideas por categoría, protocolos, escalera, habilidades, trampas, finanzas)
- `src/store/` — estado global persistente + exportar/importar
- `src/components/ui/` — sistema de diseño
- `src/pages/` — una página por sección

Las cifras de ingresos son estimaciones, no promesas. La información fiscal y financiera es general: verifica en sat.gob.mx o con un contador.
