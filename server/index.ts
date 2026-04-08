import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import riotRouter from "./routes/riot";
import liveRouter from "./routes/live";
import recommendRouter from "./routes/recommend";
import buildRouter from "./routes/build";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Riot Tracker backend running");
});

app.use("/api/riot", riotRouter);
app.use("/api/live", liveRouter);
app.use("/api/recommend", recommendRouter);
app.use("/api/build", buildRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
