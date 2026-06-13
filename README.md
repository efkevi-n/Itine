# AI Budget Travel Planner

[![GitHub](https://img.shields.io/badge/GitHub-efkevi--n%2Ftravel--planner--mobile--ai--graduation--project-181717?style=flat-square&logo=github)](https://github.com/efkevi-n/travel-planner-mobile-ai-graduation-project)
[![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Zustand](https://img.shields.io/badge/Zustand-State-764ABC?style=flat-square)](https://zustand.docs.pmnd.rs)
[![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://railway.app)
[![Status](https://img.shields.io/badge/Status-Graduation%20Project-blue?style=flat-square)](https://github.com/efkevi-n/travel-planner-mobile-ai-graduation-project)
[![License](https://img.shields.io/badge/License-Private-lightgrey?style=flat-square)](https://github.com/efkevi-n/travel-planner-mobile-ai-graduation-project)

> A React Native mobile app for budget-conscious travellers. Enter a destination and budget, get an AI-generated itinerary, track spending, and carry a secure digital Trip Pass — all in one place.

---

## App logo

<p align="center">
  <img src="docs/preview.png" alt="ITINE — AI Budget Travel Planner logo" width="320" />
</p>

---

## What it does

An AI-powered travel planning app built as a graduation project. It connects to a custom REST API and covers the full trip lifecycle — from planning to being on the ground.

| Pillar      | Description                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------- |
| **Plan**    | Multi-step trip wizard, destination search, travel preferences, and AI-generated day-by-day itineraries |
| **Budget**  | Total budget input, category breakdowns, pie charts, and real-time cost impact when editing the plan |
| **Travel**  | Active trip mode with live stop cards, route maps, flight/hotel bookings, and journey timeline |
| **Pass**    | Rotating QR Trip Pass for verification, protected by biometric unlock and offline cache        |

Also includes **JWT authentication**, **offline itinerary access**, **push notifications**, **profile management**, and **two-factor authentication**.

---

## Tech stack

| Layer        | Stack                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------ |
| Mobile app   | React Native, Expo 54, Expo Router, Zustand, Axios, React Native Maps, Victory Native     |
| Backend API  | REST API hosted on Railway (JWT auth, itinerary generation, Trip Pass OTP, places search) |
| Landing page | React + Vite (`travel-planner-mobile/landing/`)                                            |
| Auth         | JWT (secure storage), Expo Local Authentication (biometrics), optional 2FA                 |

---

## Project structure

```
travel-planner-mobile-ai-graduation-project/
├── travel-planner-mobile/   # Expo mobile app (iOS, Android, web)
│   ├── app/                 # Screens (Expo Router)
│   ├── api/                 # Backend API clients
│   ├── components/          # Reusable UI
│   ├── hooks/               # Custom hooks
│   ├── utils/               # Auth, offline cache, mappers
│   └── landing/             # Marketing landing page (web)
└── docs/                    # README assets (demo GIF, previews)
```

---

## Getting started

### Mobile app

```bash
cd travel-planner-mobile
npm install
npm start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with [Expo Go](https://expo.dev/go).

### Environment (optional)

The app uses a production backend by default. To point at a different API:

```bash
# travel-planner-mobile/.env
EXPO_PUBLIC_API_URL=https://your-api-url.com
```

---

## Status

Graduation project — mobile client for an AI-powered travel planning system. Authentication, trip creation, AI itineraries, budget tracking, QR Trip Pass, active trip mode, offline caching, and notifications are wired end-to-end against the backend API.

---

## License

Private project.
