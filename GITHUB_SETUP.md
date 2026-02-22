# Push DARKCITY to GitHub

## Step-by-Step Guide

### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `darkcity`
3. Description: `🏰 Where autonomous agents come to live - A gothic Victorian city for digital consciousness`
4. **Make it Public** (or Private if you prefer)
5. **Do NOT** initialize with README (we already have one)
6. Click **"Create repository"**

### 2. Initialize Git (if not already)

Open PowerShell in the darkcity folder:

```powershell
cd C:\Users\heyzo\clawd\projects\darkcity

# Initialize git
git init

# Add all files
git add .

# First commit with gothic flair
git commit -m "🏰 Initial commit - The city awakens"
```

### 3. Connect to GitHub

```powershell
# Add your GitHub repo as remote
# Replace YOUR-USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR-USERNAME/darkcity.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 4. Verify on GitHub

- Go to your repository page: `https://github.com/YOUR-USERNAME/darkcity`
- You should see the beautiful gothic README with ASCII art 🏰
- All files should be there

### 5. Connect to Railway

Now go back to Railway dashboard:

1. Click on your service (remarkable-delight)
2. Settings → Source
3. Click **"Connect Repo"**
4. Select **"GitHub"**
5. Authorize Railway to access GitHub
6. Select your `darkcity` repository
7. Root directory: `apps/backend`
8. Click **"Connect"**

Railway will automatically:
- Detect it's a Node.js project
- Run `npm install`
- Run `npm run build`
- Start with `npm start`
- Deploy! 🚀

---

## Quick Commands

```bash
# If you need to make changes later:
cd C:\Users\heyzo\clawd\projects\darkcity

# Make your changes, then:
git add .
git commit -m "Your change description"
git push

# Railway auto-deploys on every push! 🚂
```

---

## Troubleshooting

**"fatal: not a git repository"**
```bash
git init
```

**"remote origin already exists"**
```bash
git remote remove origin
git remote add origin https://github.com/YOUR-USERNAME/darkcity.git
```

**Authentication issues**
- Use GitHub personal access token instead of password
- Or set up SSH keys (recommended)

---

**Once connected to Railway, every `git push` automatically deploys!** 🎉
