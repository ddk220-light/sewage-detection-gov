# Deployment Guide - Sewage Detection Government Portal

## Prerequisites
- Node.js installed
- Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`

## Step 1: Initialize D1 Database

The database needs to be created and initialized before the application can work.

### Option A: Using the existing database ID (Recommended)
```bash
# Execute the schema on the existing database
npx wrangler d1 execute complaints_db --remote --file=./schema.sql
```

### Option B: Create a new database
```bash
# Create a new D1 database
npx wrangler d1 create complaints_db

# This will output a database ID. Update wrangler.toml with the new ID.
# Then execute the schema:
npx wrangler d1 execute complaints_db --remote --file=./schema.sql
```

## Step 2: Verify Database Table

```bash
# Check if the table was created successfully
npx wrangler d1 execute complaints_db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"

# You should see 'complaints' in the output
```

## Step 3: Set Environment Variables

In your Cloudflare Pages dashboard:

1. Go to your Pages project settings
2. Navigate to **Settings** > **Environment variables**
3. Add the following variables:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=[your-secure-password]
DEV_PASSWORD=[your-dev-portal-password]
```

## Step 4: Configure Bindings

In Cloudflare Pages dashboard:

1. Go to **Settings** > **Functions**
2. Add **D1 database binding**:
   - Variable name: `DB`
   - D1 database: `complaints_db`
3. Add **R2 bucket binding**:
   - Variable name: `ImageStore`
   - R2 bucket: `gov-complaint-images`

## Step 5: Deploy

### Deploy to Cloudflare Pages
```bash
# Login to Cloudflare
npx wrangler login

# Deploy the site
npx wrangler pages deploy . --project-name sewage-detection-gov
```

## Local Development

To test locally with Wrangler:

```bash
# Install dependencies
npm install wrangler --save-dev

# Create .dev.vars file for local environment variables
cat > .dev.vars << EOF
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
DEV_PASSWORD=dev123
R2_PUBLIC_URL=https://pub-62cfd0f5ce354768976829718b8e95cd.r2.dev
EOF

# Run local development server with bindings
npx wrangler pages dev . --d1 DB=complaints_db --r2 ImageStore=gov-complaint-images
```

## Troubleshooting

### 500 Error on Complaint Submission

**Cause:** Database table doesn't exist or bindings not configured

**Solution:**
1. Verify the database table exists (Step 2)
2. Check that bindings are properly configured (Step 4)
3. Check browser console and Cloudflare Pages logs for detailed error messages

### Images Not Uploading

**Cause:** R2 bucket binding not configured or bucket doesn't exist

**Solution:**
1. Verify R2 bucket exists: `npx wrangler r2 bucket list`
2. Create if needed: `npx wrangler r2 bucket create gov-complaint-images`
3. Ensure R2 binding is properly configured

### Admin Login Fails

**Cause:** Environment variables not set

**Solution:**
1. Verify environment variables are set in Cloudflare Pages dashboard
2. For local development, ensure `.dev.vars` file exists with correct credentials

## Testing the Deployment

1. **Test Public Form**: Navigate to your deployed URL
2. **Test Complaint Submission**: Fill out the form and upload an image
3. **Test Admin Login**: Click "Admin Login" and use your credentials
4. **Test Admin Dashboard**: Verify complaints appear in the dashboard

## Database Management

### View all complaints
```bash
npx wrangler d1 execute complaints_db --remote --command "SELECT * FROM complaints;"
```

### Clear all test data
```bash
npx wrangler d1 execute complaints_db --remote --command "DELETE FROM complaints;"
```

### View table schema
```bash
npx wrangler d1 execute complaints_db --remote --command "PRAGMA table_info(complaints);"
```
