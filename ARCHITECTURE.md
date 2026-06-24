# OutreachX Project Architecture

This document provides an overview of the technical architecture for the OutreachX project.

## Overview

OutreachX is a full-stack application designed as an AI-powered system for cold email outreach. It features a decoupled architecture with a modern frontend and a powerful, AI-driven backend.

## 1. Frontend

The frontend is a modern web application responsible for the user interface and user experience.

*   **Framework**: **Next.js** (using the App Router).
*   **Language**: **TypeScript**.
*   **UI/Styling**:
    *   **React** for component-based UI construction.
    *   **Tailwind CSS** for utility-first styling.
    *   **Framer Motion** for animations.
    *   **Lucide React** for icons.
*   **State Management**: Local component state is managed with React Hooks (`useState`, `useEffect`, `useCallback`, etc.).
*   **Authentication**: User authentication is handled via **Supabase Auth**.
*   **Deployment**: The application is configured for deployment on **Vercel**.

## 2. Backend

The backend provides the core business logic, data processing, and AI capabilities.

*   **Language**: **Python**.
*   **API**: A RESTful API is exposed for the frontend to consume. This is how data is created, read, updated, and deleted.
*   **Database**: The primary data store is a **PostgreSQL** database, hosted and managed by **Supabase**.
*   **AI Core ("Deva")**: The core functionality is powered by "Deva," an autonomous AI agent system. This system appears to be composed of multiple specialized agents responsible for:
    *   Lead scraping and data enrichment.
    *   Email verification (SMTP checks, MX records).
    *   Contextual analysis of user-provided documents and websites.
    *   Personalized content generation (emails, subject lines).
    *   Secure campaign scheduling and execution.

## 3. System Architecture Pattern

The project follows a **Decoupled (Headless) Architecture**.

*   The **Frontend** (Next.js) and **Backend** (Python) are separate applications.
*   They communicate over the network via a defined **API**.
*   **Supabase** acts as a Backend-as-a-Service (BaaS) providing both the database and authentication services.

This separation of concerns allows for independent development, scaling, and maintenance of the frontend and backend services.