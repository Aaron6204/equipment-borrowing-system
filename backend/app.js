// Entry point of the backend: configuration, mounting, and starting the server.
// The logic lives in controllers/, and the URLs are listed in routes/.
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const logger = require("./middleware/logger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const categoryRoutes = require("./routes/categoryRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const borrowerRoutes = require("./routes/borrowerRoutes");
const borrowingRoutes = require("./routes/borrowingRoutes");
const fineRoutes = require("./routes/fineRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");
const authRoutes = require("./routes/authRoutes");
const requireAuth = require("./middleware/requireAuth");
const userRoutes = require("./routes/userRoutes");
const app = express();
connectDB();

// CORS: which frontend addresses may call this API.
// CLIENT_URL may hold several addresses separated by commas, or * for any address
// (useful when opening the site from a phone on the same Wi-Fi).
const allowedOrigins = (process.env.CLIENT_URL || "*")
  .split(",")
  .map((address) => address.trim());

// 1. Global middleware (runs before every route)
app.use(cors({ origin: allowedOrigins.includes("*") ? "*" : allowedOrigins }));
app.use(express.json());
app.use(logger);

// 2. Routes
app.get("/", (req, res) => {
  res.json({ message: "School Equipment Borrowing System API is running" });
});
app.use("/api/auth", authRoutes);
app.use("/api/categories", requireAuth, categoryRoutes);
app.use("/api/equipment", requireAuth, equipmentRoutes);
app.use("/api/borrowers", requireAuth, borrowerRoutes);
app.use("/api/borrowings", requireAuth, borrowingRoutes);
app.use("/api/fines", requireAuth, fineRoutes);
app.use("/api/statistics", requireAuth, statisticsRoutes); 
app.use("/api/users", requireAuth, userRoutes);

// 3. 404 catch-all (only reached when no route matched)
app.use(notFound);

// 4. Error handler (must be registered last).
// Express 5 sends any error thrown inside an async controller here automatically.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
