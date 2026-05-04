# OutreachX - AI-Powered Cold Outreach SaaS Platform

Complete full-stack SaaS application for automating cold email campaigns with AI-powered personalization.

## 🚀 Features

### Authentication
- ✅ Email + OTP signup
- ✅ Email + password login
- ✅ Secure JWT token management
- ✅ Password hashing with bcrypt
- ✅ Resume upload mandatory before dashboard

### Dashboard Modules
- ✅ **DevaAI** - RAG chatbot with memory
- ✅ **Templates** - HTML + text, AI generated, preview supported
- ✅ **Assets** - GitHub API + URL scraping + document parsing
- ✅ **Leads** - Excel upload, parse structured data
- ✅ **Campaigns** - Send bulk emails using SMTP
- ✅ **Settings** - User info + email credentials management

### AI System
- ✅ RAG architecture using vector DB (Pinecone)
- ✅ Context sources: resume, assets, leads, templates
- ✅ Memory: extract important chat info and store

### Campaign Engine
- ✅ Select template + leads
- ✅ Send bulk emails via SMTP
- ✅ Track logs and status
- ✅ Retry mechanism with exponential backoff

### Email Verification
- ✅ Use SMTP to send test mail
- ✅ Use IMAP to verify inbox
- ✅ Mark credentials as verified

## 🏗️ Architecture

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (via Supabase)
- **Cache**: Redis
- **Queue**: Celery
- **AI/LLM**: OpenAI GPT-4
- **Vector DB**: Pinecone
- **Email**: SMTP + IMAP
- **Auth**: JWT + OTP

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React Icons
- **Auth**: JWT stored in localStorage

### Database
- PostgreSQL with comprehensive schema
- Tables: users, resume, assets, leads, templates, campaigns, settings, ai_memory, email_logs, otp_codes

## 📋 Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- OpenAI API key
- Pinecone API key
- Gmail account with app passwords enabled

## 🔧 Installation

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv myenv
source myenv/bin/activate  # Windows: myenv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
cp .env.example .env

# Run migrations (setup database schema)
# Use schema.sql in Supabase SQL editor
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local (copy from .env.example)
cp .env.example .env.local

# Run development server
npm run dev
```

### 3. Start Backend

```bash
cd backend
uvicorn main:app --reload
```

Backend will be available at `http://localhost:8000`

## 🌐 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/outreachx
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API Endpoints

### Authentication
- `POST /auth/signup` - Start signup (send OTP)
- `POST /auth/verify-otp` - Verify OTP and create user
- `POST /auth/set-password` - Set password
- `POST /auth/login` - Login with email + password

### User
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update profile

### Resume
- `POST /resume/upload` - Upload and parse resume
- `GET /resume` - Get parsed resume data

### Email Credentials
- `POST /email-credentials` - Add email credential
- `GET /email-credentials` - List credentials
- `POST /email-credentials/{id}/verify` - Verify credential

### Templates
- `POST /templates` - Create template
- `GET /templates` - List templates

### Campaigns
- `POST /campaigns` - Create campaign
- `GET /campaigns` - List campaigns

### Leads
- `POST /leads/upload` - Upload leads from Excel

### AI Chat
- `POST /ai/chat` - Send message to DevaAI

### Settings
- `GET /settings` - Get user settings
- `PUT /settings` - Update settings

## 🗄️ Database Schema

Key tables:
- **users** - User accounts
- **otp_codes** - OTP verification
- **user_resumes** - Parsed resume data
- **email_credentials** - Email account credentials (encrypted)
- **templates** - Email templates
- **assets** - User assets (GitHub, portfolio, documents)
- **campaigns** - Email campaigns
- **leads** - Campaign leads
- **email_logs** - Email sending logs
- **ai_memory** - AI conversation history

## 🚀 Deployment

### Docker Deployment

```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d
```

### Deploy to Production

#### Backend (Vercel/Railway/Render)
1. Push to GitHub
2. Connect repository
3. Set environment variables
4. Deploy

#### Frontend (Vercel)
1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- AES-256 encryption for sensitive data
- HTTPS/SSL support
- CORS protection
- Rate limiting ready
- Secure password reset flow
- Email verification

## 📊 Performance Optimizations

- Database indexing on frequently queried fields
- Redis caching for sessions
- Celery queue for async tasks
- Pagination for list endpoints
- Lazy loading on frontend

## 🧪 Testing

```bash
# Backend tests
pytest backend/tests/

# Frontend tests
npm run test
```

## 🐛 Troubleshooting

### "Invalid token" error
- Verify JWT_SECRET matches between backend and frontend
- Check token expiration time

### Email sending fails
- Verify SMTP credentials
- Enable "Less secure apps" for Gmail
- Use app-specific password for Gmail

### OpenAI API errors
- Verify API key is correct
- Check API quota and billing
- Ensure model name is correct

## 📖 Documentation

- [API Documentation](./docs/API.md)
- [Database Schema](./schema.sql)
- [Architecture Design](./docs/ARCHITECTURE.md)

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 💬 Support

For support, email support@outreachx.com or create an issue in the repository.

---

Built with ❤️ by the OutreachX team
