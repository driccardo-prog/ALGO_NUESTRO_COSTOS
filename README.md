# Algo Nuestro · Sistema de costeo

App web para calcular el costo real por producto y el precio sugerido de venta de las carteras de Algo Nuestro, con exportación a Excel.

**¿Sos Loli?** Empezá por la [guía paso a paso](docs/GUIA.md).

## Stack

- React + Vite + TypeScript
- Supabase (base de datos, login solo con contraseña para una única usuaria, fotos en Storage) con Row Level Security
- Vercel (hosting)

## Desarrollo

```bash
npm install
cp .env.example .env   # completar con los datos de Supabase (opcional)
npm run dev
```

Sin `.env`, la app arranca en **modo prueba**: guarda los datos en el `localStorage` del navegador.

- `npm test`: tests (Vitest)
- `npm run build`: chequeo de tipos + build de producción
- `supabase/schema.sql`: tablas y políticas RLS (se corre en el SQL Editor de Supabase)

## Estructura

- `src/lib/types.ts`: modelo de datos
- `src/lib/db.ts`: acceso a datos (Supabase o local)
- `src/lib/data.tsx`: carga inicial y precarga de datos (`seed.ts`)
- `src/pages/`: pantallas · `src/components/`: piezas reutilizables

## Fases

- [x] Fase 1: setup, Supabase, login, modelo de datos, productos y fichas técnicas
- [ ] Fase 2: tandas y carga de gastos
- [ ] Fase 3: motor de cálculo de costos y pantalla de costeo
- [ ] Fase 4: precios, comisiones, calculadora inversa, inversión inicial
- [ ] Fase 5: exportación a Excel
- [ ] Fase 6: deploy y guía de uso
