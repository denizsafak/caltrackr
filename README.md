# CalTrackr

CalTrackr is a structured MVP for calorie tracking, weekly diet planning, and ingredient-based recipe suggestions.

## Project Structure

```text
backend/
  src/
    config/          App and database configuration
    database/        SQLite connection, schema, seed data
    repositories/    Data Access Layer
    services/        Business Logic Layer
    patterns/        Observer, Strategy, Memento implementations
    routes/          REST API presentation layer
frontend/
  src/
    api/             Backend API client
    core/            Frontend business services and observers
    components/      Reusable UI elements
    screens/         Five app screens
    theme/           Color system
    types/           Shared TypeScript models
```

## Setup

```bash
cd backend
npm install
npm start
```

In another terminal:

```bash
cd frontend
npm install
npm start
```

The backend runs on `http://localhost:4000`. For a physical phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN address before starting Expo.

## Simulation

```bash
cd backend
npm run simulate
```

This logs a high-calorie meal, recalculates daily totals, updates the progress observer, and triggers the limit alert observer.
