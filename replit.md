# replit.md

## Overview

This is a comprehensive full-stack React application that automates RFP (Request for Proposal) response generation with advanced authentication, user management, and AI-powered chat capabilities. The application features a professional login/signup system, role-based access control, document processing with source citation, real-time chatbot assistance, and comprehensive admin management tools.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **File Upload**: React Dropzone for drag-and-drop file uploads
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for file uploads, Python scripts for document parsing
- **AI Integration**: Groq API for answer generation
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

## Key Components

### Data Models
- **Users**: Basic user management with username/password authentication
- **Processing Jobs**: Tracks file upload and processing status
- **Questions**: Individual questions extracted from uploaded documents with AI-generated answers

### Core Services
- **AI Service**: Handles communication with Groq API for answer generation
- **File Processor**: Extracts questions from Excel and PDF files using Python scripts
- **Storage Service**: Manages database operations with in-memory fallback

### UI Components
- **File Upload**: Drag-and-drop interface with progress tracking
- **Question Cards**: Collapsible cards showing questions, answers, and acceptance status
- **Progress Tracker**: Real-time progress visualization during processing
- **Export Section**: Download functionality for completed responses

## Data Flow

1. **File Upload**: User uploads Excel/PDF file through drag-and-drop interface
2. **Question Extraction**: Backend processes file and extracts questions using Python scripts
3. **AI Processing**: Questions are sent to Groq API for answer generation
4. **Review Process**: User reviews generated answers and can accept or regenerate them
5. **Export**: Final accepted responses are compiled and exported as Excel file

## External Dependencies

### AI Services
- **Groq API**: Primary AI service for answer generation using LLaMA models
- **Configuration**: Requires GROQ_API_KEY environment variable

### Database
- **PostgreSQL**: Primary database using Neon serverless
- **Connection**: Requires DATABASE_URL environment variable
- **ORM**: Drizzle ORM for type-safe database operations

### File Processing
- **Python Runtime**: Required for Excel and PDF processing scripts
- **Libraries**: Handles document parsing and question extraction

## Deployment Strategy

### Development
- **Command**: `npm run dev` starts development server with hot reload
- **Database**: `npm run db:push` applies schema changes
- **TypeScript**: `npm run check` for type checking

### Production
- **Build**: `npm run build` creates optimized production build
- **Start**: `npm run start` runs production server
- **Static Assets**: Vite handles client-side bundling and optimization

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `GROQ_API_KEY`: API key for AI service
- `NODE_ENV`: Environment mode (development/production)

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 06, 2025. Initial setup