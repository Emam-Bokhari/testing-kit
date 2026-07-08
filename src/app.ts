import express, { Application } from "express";
import projectRoutes from "./routes/project.routes";
import reportRoutes from "./routes/report.routes";
import { errorHandler } from "./utils/errors";

const app: Application = express();

app.use(express.json());

app.use("/projects", projectRoutes);
app.use("/reports", reportRoutes);

app.use(errorHandler);

export default app;
