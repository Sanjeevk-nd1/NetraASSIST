# RFP Automated - Setup Guide

## 📋 Requirements

### System Requirements
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **Git**: For cloning the repository

### API Keys Required
- **GROQ_API_KEY**: Required for AI-powered question extraction and response generation
  - Get your free API key from: https://console.groq.com/keys
  - The app uses Groq's LLaMA models for intelligent processing

## 🚀 Installation Steps

### 1. Download the Code
```bash
# Clone or download the project
git clone <your-repo-url>
cd rfp-automated

# Or download as ZIP and extract
```

### 2. Install Dependencies
```bash
# Install all required packages
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```bash
# Copy the example environment file
cp .env.example .env
```

Add your API key to the `.env` file:
```env
GROQ_API_KEY=your_groq_api_key_here
NODE_ENV=development
```

### 4. Database Setup (Optional)
The app uses in-memory storage by default. For production, you can configure PostgreSQL:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/rfp_automated
```

### 5. Start the Application
```bash
# Start the development server
npm run dev
```

The application will be available at: `http://localhost:5000`

## 📱 How to Use

### 1. Authentication
- Visit `http://localhost:5000`
- **Sign Up**: Create a new account (choose "Standard User" or "Administrator")
- **Login**: Use your credentials to access the dashboard

### 2. Document Processing
1. **Upload Files**: Drag and drop Excel (.xlsx) or PDF files
2. **Generate Responses**: Click "Generate Responses" to process questions
3. **Review Answers**: Accept or regenerate each AI-generated response
4. **Export Results**: Download the final responses as Excel

### 3. AI Chat Assistant
- Use the right sidebar chat for real-time assistance
- Ask questions about your documents
- Download chat history for reference
- Clear chat when needed

### 4. Admin Features (Admin accounts only)
- **User Management**: View and manage user accounts
- **Document Library**: Upload training documents for better AI responses
- **System Analytics**: Monitor application usage

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database (if using PostgreSQL)
npm run db:push      # Apply database schema
npm run db:studio    # Open database studio

# Utilities
npm run check        # TypeScript type checking
npm run lint         # Code linting
```

## 📁 Project Structure

```
rfp-automated/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Application pages
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
├── server/                # Backend Express app
│   ├── services/          # Business logic
│   ├── middleware/        # Authentication
│   └── routes.ts          # API endpoints
├── shared/                # Shared types and schemas
└── uploads/              # File storage
```

## 🔐 Security Features

- **Session-based Authentication**: Secure user sessions
- **Role-based Access Control**: User and Admin permissions
- **File Upload Security**: Validated file types and sizes
- **Input Validation**: All forms validated with Zod schemas
- **CSRF Protection**: Cross-site request forgery protection

## 🌟 Key Features

### Document Processing
- **Multi-format Support**: Excel, PDF, DOC, DOCX, TXT
- **AI Question Extraction**: Automatically identifies questions
- **Intelligent Responses**: Context-aware answer generation
- **Source Citation**: Shows document sections for each response

### User Interface
- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on desktop and mobile
- **Real-time Updates**: Live progress tracking
- **Drag & Drop**: Intuitive file upload

### AI Integration
- **Groq API**: Fast LLaMA model inference
- **Context Awareness**: Understands document content
- **Source Tracking**: Maintains citation accuracy
- **Chat Interface**: Conversational AI assistance

## 🚨 Troubleshooting

### Common Issues

1. **"GROQ_API_KEY is required" Error**
   - Ensure your API key is set in the `.env` file
   - Verify the key is valid on the Groq console

2. **Port Already in Use**
   - Kill the process using port 5000: `lsof -ti:5000 | xargs kill`
   - Or change the port in `server/index.ts`

3. **File Upload Fails**
   - Check file size (max 10MB)
   - Ensure file type is supported
   - Verify upload permissions

4. **Build Errors**
   - Clear node_modules: `rm -rf node_modules package-lock.json`
   - Reinstall: `npm install`

### Performance Tips

1. **Large Files**: Process files in smaller batches
2. **Memory Usage**: Restart the server periodically for large workloads
3. **Database**: Use PostgreSQL for production workloads

## 🛠️ Development

### Adding New Features
1. Update schemas in `shared/schema.ts`
2. Add API routes in `server/routes.ts`
3. Create React components in `client/src/components`
4. Update storage interface if needed

### Testing
```bash
# Run type checking
npm run check

# Test API endpoints
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Check the server logs for API errors
4. Ensure all environment variables are set correctly

## 🔄 Updates

The application automatically restarts when you make changes to the code. For production deployments, use:

```bash
npm run build
npm run start
```

---

**Note**: This is a development setup guide. For production deployment, additional security measures and optimizations should be implemented.