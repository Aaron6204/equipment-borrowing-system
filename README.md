# School Equipment Borrowing System

Final project for CTADWEBL (Advanced Web Programming), National University Clark, A.Y. 2026-2027.

```
equipment-borrowing-system/
├── backend/     Express REST API and MongoDB (repository: equipment-borrowing-server)
└── frontend/    React, TypeScript, and Tailwind CSS (repository: equipment-borrowing-client)
```

The two folders are separate Git repositories, as the project brief requires
a client repository and a server repository.

## Run it

Open two terminals.

```bash
# Terminal 1
cd backend
npm install
npm run seed     # first time only, loads the sample data
npm run dev
```

```bash
# Terminal 2
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

The backend needs a `.env` file. Copy `backend/.env.example` to `backend/.env`
and fill in your MongoDB Atlas connection string.
