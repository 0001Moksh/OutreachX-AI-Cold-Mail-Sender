# OutreachX - Quick Start Guide

Complete guide to set up and deploy OutreachX locally or to production.

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (optional)

### 2. Local Setup with Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/outreachx.git
cd outreachx

# Create .env file
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Update .env with your credentials:
# - OPENAI_API_KEY
# - PINECONE_API_KEY
# - JWT_SECRET (generate: openssl rand -hex 32)
# - ENCRYPTION_KEY (generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Start all services
docker-compose up -d

# Run migrations (in PostgreSQL)
# Open schema.sql in PostgreSQL GUI and execute

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### 3. Local Setup without Docker

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv myenv
source myenv/bin/activate  # Windows: myenv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env
cp .env.example .env

# Run migrations
# Execute schema.sql in your PostgreSQL database

# Start backend
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Update NEXT_PUBLIC_API_URL=http://localhost:8000

# Start frontend
npm run dev
```

#### Redis and Celery

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Celery Worker
cd backend
celery -A tasks worker --loglevel=info

# Terminal 3: Start Celery Beat (for scheduled tasks)
celery -A tasks beat --loglevel=info
```

## 🔐 Environment Configuration

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/outreachx

# Security
JWT_SECRET=your-secret-key-generate-with-openssl-rand-hex-32
ENCRYPTION_KEY=base64-encoded-fernet-key

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Pinecone (Vector DB)
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENV=us-west1-gcp
PINECONE_INDEX=outreachx

# Email (for OTP)
SYSTEM_EMAIL=noreply@outreachx.com
SYSTEM_EMAIL_PASSWORD=your-app-password

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🗄️ Database Setup

### Option 1: Supabase (Recommended for Production)

1. Create account at supabase.com
2. Create new project
3. Go to SQL Editor
4. Copy schema.sql and run it
5. Update DATABASE_URL with Supabase connection string

### Option 2: Local PostgreSQL

```bash
# Create database
createdb outreachx

# Connect to database
psql -U postgres -d outreachx

# Run schema.sql
\i schema.sql

# Verify tables
\dt
```

## 🎯 First Login

1. Navigate to http://localhost:3000
2. Click "Sign Up"
3. Enter email and full name
4. Verify OTP from console (check backend logs)
5. Set password
6. Upload resume (PDF or DOCX)
7. Add email credentials for sending
8. Start creating campaigns!

## 📊 API Documentation

### Swagger UI
- URL: http://localhost:8000/docs
- Shows all endpoints with request/response schemas
- Can test endpoints directly

### ReDoc
- URL: http://localhost:8000/redoc
- Alternative API documentation format

## 🔄 Testing API Endpoints

### Using curl

```bash
# Sign up
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","full_name":"Test User"}'

# Verify OTP (check console for OTP code)
curl -X POST "http://localhost:8000/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"000000"}'

# Set password
curl -X POST "http://localhost:8000/auth/set-password" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"uuid","password":"password123","confirm_password":"password123"}'

# Login
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚀 Deployment

### Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Railway/Render (Backend)

1. Push code to GitHub
2. Connect repository to Railway/Render
3. Set environment variables
4. Deploy

### Deploy with Docker

```bash
# Build images
docker build -t outreachx-backend ./backend
docker build -t outreachx-frontend ./frontend

# Push to Docker Hub
docker tag outreachx-backend username/outreachx-backend:latest
docker push username/outreachx-backend:latest

# Deploy on your server/cloud
docker-compose up -d
```

## 🔧 Troubleshooting

### "Can't connect to database"
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure database exists and schema is loaded

### "Invalid token"
- Verify JWT_SECRET matches between instances
- Check token expiration
- Clear localStorage and login again

### "OpenAI API error"
- Verify API key is correct and has balance
- Check API quota limits
- Ensure correct model name (gpt-4 or gpt-3.5-turbo)

### "Email sending fails"
- Verify SMTP credentials
- Enable "Less secure apps" for Gmail
- Use app-specific password for Gmail
- Check email is verified in email_credentials table

### "DevaAI returns generic responses"
- Verify Pinecone is configured correctly
- Upload and parse resume first
- Check OpenAI API has sufficient quota

## 📈 Performance Tips

1. **Database**: Add indexes on frequently queried columns (already done in schema.sql)
2. **Caching**: Redis caches are used for sessions
3. **Queue**: Use Celery for long-running tasks
4. **Frontend**: Enable Next.js image optimization
5. **Backend**: Use pagination for list endpoints

## 🔐 Security Best Practices

1. **Never commit .env files** (use .gitignore)
2. **Use strong JWT_SECRET** (generate with: openssl rand -hex 32)
3. **Enable HTTPS** in production
4. **Use environment variables** for all secrets
5. **Enable CORS** only for trusted domains
6. **Hash passwords** with bcrypt (done automatically)
7. **Encrypt sensitive data** at rest
8. **Use app passwords** for email, not main password

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

## 🤝 Contributing

1. Create feature branch
2. Make changes and test locally
3. Commit with descriptive message
4. Push and create pull request

## 📝 License

MIT License - see LICENSE file

## 💬 Support

- Email: support@outreachx.com
- GitHub Issues: [Create issue](https://github.com/yourusername/outreachx/issues)
- Discord: [Join server](https://discord.gg/outreachx)

---

Happy outreaching! 🚀
