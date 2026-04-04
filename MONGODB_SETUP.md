# MongoDB Installation & Setup

## 🎯 Goal
Get MongoDB running so the backend can store data.

---

## Option 1: Local MongoDB (Windows)

### Download & Install
1. Visit: https://www.mongodb.com/try/download/community
2. Select your Windows version (64-bit)
3. Download and run the installer
4. Choose "Complete" installation
5. Install MongoDB Compass (GUI tool)

### Start MongoDB
```bash
# MongoDB runs as a Windows Service automatically after installation
# Check if running: services.msc → Search for "MongoDB Server"
```

Or manually start:
```bash
# PowerShell as Admin
mongod
# Should show: "waiting for connections on port 27017"
```

### Verify
```bash
# In new terminal
mongosh
# Should connect successfully
```

---

## Option 2: MongoDB Atlas (Cloud - Recommended)

### Setup
1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create organization and project
4. Click "Build a Database"
5. Choose **M0 Free Tier**
6. Select region (nearest to you)
7. Click "Create Cluster"

### Get Connection String
1. Go to "Database" → "Clusters"
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Copy connection string (looks like):
```
mongodb+srv://username:password@cluster.mongodb.net/naanaa?retryWrites=true
```

### Update Backend
Edit `ecommerce-backend/.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/naanaa
```

Replace:
- `username` with your database user
- `password` with your password

---

## ✅ Verify Connection

After setup, run:
```bash
cd ecommerce-backend
node seed.js
```

**Success:** 
```
Connected to MongoDB
Cleared existing products
Successfully seeded 10 products
```

**Error:**
```
Error seeding database: MongooseError
```
→ MongoDB not running or connection string wrong

---

## 🔧 Troubleshooting

### "Connection refused"
- MongoDB not running
- On Windows: Start MongoDB Service from Services.msc
- Or run: `mongod` in terminal

### "Authentication failed"
- Wrong username/password in .env
- Go to MongoDB Atlas → Security → Database Users → edit user

### "Timeout error"
- Internet connection issue
- MongoDB Atlas firewall blocking
- Go to MongoDB Atlas → Security → Network Access → Add your IP

### "Already seeded?"
- Delete data first:
```bash
mongosh
use naanaa
db.products.deleteMany({})
exit
# Then run: node seed.js
```

---

## 📊 After Seeding

Check MongoDB Compass to see data:
1. Open MongoDB Compass
2. Click "Connect"
3. Navigate to `naanaa` database
4. View collections: Products, Users, Orders, Carts

You should see 10 products!

---

## 🚀 Next Step

After MongoDB is set up and seeded:
```bash
http://localhost:5173
```

Your ecommerce platform is now fully functional! ✨
