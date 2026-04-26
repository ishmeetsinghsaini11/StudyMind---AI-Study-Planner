# StudyMind - AI Study Planner

A full-stack AI-powered study planner application built with React, Node.js, Express, SQLite, and the Groq API.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS (port 5173)
- **Backend**: Node.js + Express (port 5000)
- **Database**: SQLite with sqlite3
- **AI API**: Groq API for study plan generation
- **HTTP Client**: Axios

## Project Structure

```
studymind/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Tailwind CSS
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── server/                # Express backend
    ├── index.js           # Express server
    ├── package.json
    └── .env               # Environment variables
```

## Setup Instructions

### 1. Install Server Dependencies

Navigate to the server folder and install dependencies:

```bash
cd server
npm install
```

**Note**: The project uses `sqlite3` instead of `better-sqlite3` to avoid native compilation issues on Windows.

### 2. Configure GROQ API Key

Edit the `server/.env` file and replace `your_groq_key_here` with your actual Groq API key:

```env
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

To get a Groq API key, visit: https://console.groq.com/

### 3. Install Client Dependencies

Navigate to the client folder and install dependencies:

```bash
cd client
npm install
```

### 4. Run the Server

In the server folder:

```bash
npm start
```

The server will run on http://localhost:5000

### 5. Run the Client

In the client folder (in a new terminal):

```bash
npm run dev
```

The client will run on http://localhost:5173

## Features

- **Create Study Plans**: Manually create study plans with title, subject, goal, and duration
- **AI-Generated Plans**: Use Groq AI to automatically generate detailed study plans with daily tasks
- **Track Progress**: Mark tasks as completed and track your study progress
- **Manage Plans**: View, update, and delete study plans
- **Persistent Storage**: All data stored in SQLite database

## API Endpoints

### Health Check
- `GET /api/health` - Check if server is running

### Study Plans
- `GET /api/plans` - Get all study plans
- `GET /api/plans/:id` - Get a specific plan with tasks
- `POST /api/plans` - Create a new study plan
- `PUT /api/plans/:id` - Update a study plan
- `DELETE /api/plans/:id` - Delete a study plan

### Tasks
- `POST /api/plans/:id/tasks` - Add tasks to a plan
- `PUT /api/tasks/:id` - Update task completion status

### AI Generation
- `POST /api/generate-plan` - Generate a study plan using AI

## Troubleshooting

### Server won't start
- Ensure all server dependencies are installed: `cd server && npm install`
- Check that port 5000 is not in use
- Verify your GROQ_API_KEY is set in server/.env

### Client won't start
- Ensure all client dependencies are installed: `cd client && npm install`
- Check that port 5173 is not in use

### AI generation fails
- Verify your GROQ_API_KEY is valid and has credits
- Check the server console for error messages

### Database errors
- The SQLite database file (studymind.db) will be created automatically in the server folder
- If you encounter database issues, delete the .db file and restart the server

## License

ISC
