# OutreachX Backend Deployment on Render

Complete guide to deploy the OutreachX backend to Render Web Service.

## ✅ Prerequisites

Before deploying to Render, ensure you have:
1. A Render account (https://render.com)
2. A PostgreSQL database (or create a new Render PostgreSQL service)
3. All required API keys and credentials
4. The backend repository pushed to GitHub

## 🔧 Required Environment Variables

Set these environment variables in Render dashboard (**Settings → Environment**):

### Database Configuration
```
DATABASE_URL=postgresql://user:password@hostname:5432/dbname
```
- Create a PostgreSQL service on Render or use an existing database
- Format: `postgresql://username:password@host:port/database`

### Authentication & Security
```
JWT_SECRET=your-secret-key-32-char-random-string
ENCRYPTION_KEY=your-fernet-key-from-cryptography
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-api-key
```

**To generate `JWT_SECRET`:**
```bash
openssl rand -hex 32
```

**To generate `ENCRYPTION_KEY`:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Email Configuration
```
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL=your-gmail@gmail.com
APP_PASSWORD=your-gmail-app-password
```

**Note:** For Gmail, use [App Passwords](https://support.google.com/accounts/answer/185833), not your regular password.

### API Keys
```
OPENAI_API_KEY=your-openai-api-key
PINECONE_API_KEY=your-pinecone-api-key
GROQ_API_KEY=your-groq-api-key
JINA_API_KEY=your-jina-api-key
```

### Redis (if using Celery for background tasks)
```
REDIS_URL=redis://your-redis-host:6379
```

### CORS Configuration
```
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000
```

## 📋 Step-by-Step Deployment

### 1. Push Code to GitHub
```bash
cd backend
git add .
git commit -m "Fix backend startup issues for Render deployment"
git push origin main
```

### 2. Create Render Web Service
1. Go to https://dashboard.render.com
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `outreachx-backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Auto-deploy:** Enable

### 3. Add Environment Variables
1. Go to **Settings** → **Environment**
2. Add all required variables from the list above
3. Click **Save Changes**

### 4. Deploy
1. Click **Deploy** button
2. Monitor build logs in the **Logs** tab
3. Watch for "Live" status indicator

### ✅ Verification

Once deployed, verify your backend is working:

```bash
# Get your Render URL from the dashboard
BACKEND_URL=https://your-service.onrender.com

# Test health endpoint
curl $BACKEND_URL/docs

# You should see Swagger API documentation

# Test API endpoint
curl $BACKEND_URL/health

# Should return 200 OK
```

## 🐛 Troubleshooting

### Build Fails with "npm run build exited with 1"
This is for the **frontend** (Next.js). Make sure you're looking at the **backend** logs.

### "No open ports detected" / "Exited with status 1"
**Root Cause:** Missing environment variables causing startup failure.

**Solution:**
1. Check Render logs for error messages
2. Verify all required environment variables are set
3. Ensure `DATABASE_URL` is correctly formatted
4. Check PostgreSQL database is running and accessible

**To debug locally:**
```bash
cd backend
python -m uvicorn main:app --reload
```

### "Connection refused" to database
- Verify `DATABASE_URL` is correct
- Check PostgreSQL service is running on Render
- Ensure Render Web Service can reach the PostgreSQL database
- Check firewall/network rules

### "CORS error" when frontend tries to connect
1. Get your frontend URL from Vercel
2. Update `ALLOWED_ORIGINS` in Render environment
3. Redeploy backend
4. Test from frontend

Example:
```
ALLOWED_ORIGINS=https://outreachx.vercel.app,https://www.outreachx.vercel.app,http://localhost:3000
```

## 📊 Monitoring

After deployment, monitor your backend:

1. **Render Dashboard:** Check service metrics
2. **Logs:** Monitor for errors in real-time
3. **Health Endpoint:** Periodically check `GET /health`

## 🔄 Updating Backend

To deploy updates:

```bash
cd backend
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically redeploy if auto-deploy is enabled.

## 🔒 Security Notes

- Never commit `.env` files to Git
- Use Render's environment variables, not `.env` files
- Rotate API keys periodically
- Use strong, unique values for `JWT_SECRET` and `ENCRYPTION_KEY`
- Keep dependencies updated

## 📞 Support

If you encounter issues:
1. Check Render documentation: https://render.com/docs
2. Review backend logs: `Settings → Logs`
3. Verify all environment variables are set correctly
4. Test locally first before deploying
