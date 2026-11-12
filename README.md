# EchoScan - Echo Scan Management System

A modern Echo Scan management software built with React Vite frontend and FastAPI backend, similar to SonoCare.

## Features

- **Patient Demographics**: Complete patient registration and management system
- **Referral Doctor Management**: Track doctors and hospitals who refer patients
- **Echo Scan Recording**: Comprehensive echo scan documentation with:
  - Adult Echo
  - Fetal Echo
  - Pediatric Echo
- **Visit Management**: Track patient visits and history
- **Dashboard**: Overview of statistics and quick actions
- **Search**: Powerful search functionality for patients and scans

## Tech Stack

### Frontend
- React 18 with Vite
- Tailwind CSS for styling
- React Router for navigation
- Lucide React for icons
- Axios for API calls

### Backend
- FastAPI (Python)
- MongoDB for database
- Motor for async MongoDB operations

## Project Structure

```
echo/
├── backend/
│   ├── main.py              # FastAPI application and routes
│   ├── database.py          # MongoDB connection and setup
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
│
└── frontend/
    ├── package.json         # Node.js dependencies
    ├── vite.config.js       # Vite configuration
    ├── tailwind.config.js   # Tailwind CSS configuration
    ├── postcss.config.js    # PostCSS configuration
    ├── index.html           # HTML entry point
    └── src/
        ├── main.jsx         # React entry point
        ├── App.jsx          # Main app component with routes
        ├── style.css        # Global styles
        ├── api/             # API service modules
        │   ├── axios.js
        │   ├── patientService.js
        │   ├── referralDoctorService.js
        │   └── scanService.js
        ├── components/      # Reusable components
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   └── Header.jsx
        └── pages/           # Page components
            ├── Dashboard.jsx
            ├── NewPatient.jsx
            ├── Patients.jsx
            ├── EditPatient.jsx
            ├── ReferralDoctors.jsx
            ├── NewReferralDoctor.jsx
            ├── Visits.jsx
            ├── EchoScan.jsx
            └── Search.jsx
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Ensure MongoDB is running on your system

6. Update the `.env` file if needed (default MongoDB URL is `mongodb://localhost:27017`)

7. Start the FastAPI server:
```bash
python main.py
```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. Open your browser and go to `http://localhost:3000`
2. You'll see the Dashboard with statistics
3. Use the sidebar to navigate between different modules:
   - **Dashboard**: View statistics and quick actions
   - **Patients**: Manage patient records
   - **New Patient**: Register a new patient
   - **Search**: Search for patients and view their scan history
   - **Referral Doctors**: Manage referral doctor records
   - **Visits**: Track patient visits
   - **Echo Scan**: Record and manage echo scans

## Key Features from Reference Mockup

All fields from the reference images have been implemented:

### Patient Demographics Screen
- Patient ID, Salutation, First/Middle/Last name
- Age, DOB, Gender, Marital status, Ethnic origin
- Complete address (Street, Taluk, Area, P.O., Zip, Country, State, District/City)
- Contact information (Phone1, Phone2, Mobile, Fax, Email)
- Aadhaar number, Family doctor

### Referral Doctor Screen
- Doctor/Hospital type selection
- Complete doctor/hospital information
- Speciality, Qualification, Designation
- Full address and contact details
- Set as default and Inactive options

### Echo Scan Screen
- Multiple scan types (Adult, Fetal, Pediatric)
- Detailed General details form
- 4-Chamber details with all parameters
- Outflow tract details
- Additional observations
- Image management interface
- Print options (Biometry, Doppler, Percentile bar, etc.)

## API Endpoints

### Patients
- GET `/api/patients` - Get all patients
- POST `/api/patients` - Create new patient
- GET `/api/patients/{id}` - Get patient by ID
- PUT `/api/patients/{id}` - Update patient
- DELETE `/api/patients/{id}` - Delete patient
- POST `/api/patients/{id}/visits` - Add visit to patient
- GET `/api/patients/{id}/visits` - Get patient visits

### Referral Doctors
- GET `/api/referral-doctors` - Get all referral doctors
- POST `/api/referral-doctors` - Create new referral doctor
- GET `/api/referral-doctors/{id}` - Get referral doctor by ID
- PUT `/api/referral-doctors/{id}` - Update referral doctor
- DELETE `/api/referral-doctors/{id}` - Delete referral doctor

### Scans
- GET `/api/scans` - Get all scans
- POST `/api/scans` - Create new scan
- GET `/api/scans/{id}` - Get scan by ID
- PUT `/api/scans/{id}` - Update scan
- DELETE `/api/scans/{id}` - Delete scan
- GET `/api/scans/patient/{patient_id}` - Get scans by patient

### Dashboard
- GET `/api/dashboard/stats` - Get dashboard statistics

## Notes

- This is a modern implementation inspired by SonoCare but with a clean, contemporary UI
- All essential fields from the reference mockup are included
- The application uses MongoDB for flexible data storage
- The UI is built with Tailwind CSS for a professional, modern look
- Type safety is ensured through proper form validation

## Future Enhancements

- User authentication and authorization
- Report generation and PDF export
- Image upload and management for scans
- Advanced analytics and reporting
- Multi-user support with role-based access
- QR code generation for patients
- Backup and restore functionality

## License

© 2024 EchoScan. All rights reserved.

## Deploy to Render (Separate Frontend & Backend)

The repository is configured to deploy frontend and backend as two independent services on Render:
1. **Backend Web Service**: FastAPI running on Python runtime with SQLite database (and optional persistent disk).
2. **Frontend Static Site**: React Vite SPA on Render's global CDN (Free tier) with automatic SPA routing rewrites.

### Method 1: Using Render Blueprint (Automatic Setup)
1. Push this repository to GitHub.
2. In Render, select **New +** → **Blueprint**.
3. Select your repository `echo-ai` and branch `main`.
4. Render detects `render.yaml` and provisions both services:
   - `echoai-backend`: Web Service for the API.
   - `echoai-frontend`: Static Site with `VITE_API_URL` automatically linked to the backend host.
5. Click **Apply**.

---

### Method 2: Manual Dashboard Setup (Free / Standard)

#### Step 1: Deploy Backend (Web Service)
1. In Render, click **New +** → **Web Service**.
2. Connect your repository `PulimuruganThangaraman/echo-ai`.
3. Set the following options:
   - **Name**: `echoai-backend` (or your choice)
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
4. *(Optional - for persistent data)*: Under **Disks**, add a disk mounted at `/var/data` (requires Starter plan), and add environment variables:
   - `DB_PATH`: `/var/data/echo.db`
   - `UPLOADS_DIR`: `/var/data/uploads`
5. Click **Create Web Service**. Note your backend URL (e.g., `https://echoai-backend.onrender.com`).

#### Step 2: Deploy Frontend (Static Site)
1. In Render, click **New +** → **Static Site**.
2. Connect your repository `PulimuruganThangaraman/echo-ai`.
3. Set the following options:
   - **Name**: `echoai-frontend` (or your choice)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add an Environment Variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://echoai-backend.onrender.com` (your backend URL from Step 1)
5. Add a Rewrite Rule (under **Redirects/Rewrites**):
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
6. Click **Create Static Site**.
