# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm install` - Install project dependencies
- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Architecture

This is a **Dofus Tools** full stack application using :

- **Next.js**
- **React 18** with functional components and hooks
- **React Router** for client-side routing and navigation
- **Tailwind CSS** for styling with utility classes
- **Prisma** as ORM

## Project Deployment

The application is deploy on Vercel, and use a Neon as a database. The deployment is automatically done using a **GitHub** repo

## Application Structure

The app follows a single-page application (SPA) pattern with:
- **Sidebar navigation** (`/src/components/Sidebar.jsx`) - Fixed navigation with icons and active states