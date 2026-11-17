# NEXUS · Gimnasio de Memoria y Cognición

App web (React + TypeScript + Vite + Tailwind + Framer Motion) con 39 módulos de entrenamiento cognitivo en 9 dominios, evaluación inicial, perfil cognitivo, rutina diaria inteligente, SRS (SM-2), palacios de la memoria, árbol de habilidades y analíticas. Todo se guarda en `localStorage` (exportable a JSON).

```bash
npm install
npm run dev     # desarrollo
npm run build   # genera dist/index.html autocontenido (un solo archivo)
```

`build/nexus.html` es la última compilación autocontenida: se puede abrir directamente en el navegador o servir desde cualquier hosting estático.

## Arquitectura
- `src/core`: tipos, store persistente, dificultad adaptativa (staircase), XP/rangos, logros, árbol de habilidades, SRS, rutina, audio y bus de eventos.
- `src/games`: un archivo por grupo de juegos. Cada juego exporta un `GameDef` (metadatos, instrucciones, «¿Por qué funciona?», `normalize` y `Component`). Para añadir uno basta con registrarlo en `src/games/index.ts`.
- `src/components/GameRunner.tsx`: flujo común intro → práctica / sesión puntuada → predicción metacognitiva → resultados.
- `src/pages`: Centro de mando, Rutina, Biblioteca, Analíticas, Habilidades, Ajustes y Onboarding.
