import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
// Routes
import userRoutes from "./routes/user.routes";
import groupRoutes from "./routes/goup.routes";
import expenseRoutes from "./routes/expense.routes";
import balanceRoutes from "./routes/balance.route";
import settlementRoutes from "./routes/settlement.routes";

dotenv.config();

const app = express();

/* -------------------- Middleware -------------------- */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
/* -------------------- Health Check -------------------- */

app.get("/", (_req, res) => {
  res.send("Expense Sharing API is running 🚀");
});

/* -------------------- API Routes -------------------- */

app.use("/users", userRoutes);
app.use("/groups", groupRoutes);
app.use("/expenses", expenseRoutes);
app.use("/balances", balanceRoutes);
app.use("/settlements", settlementRoutes);

/* -------------------- 404 Handler -------------------- */

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
