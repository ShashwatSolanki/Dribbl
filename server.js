import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import cors from "cors";
import fs from "fs";
import http from "http";
import https from "https";

/* Native Node.js WebSocket implementation */
import WebSocket, { WebSocketServer } from "ws";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3001);
const saltRounds = 10;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({ origin: clientOrigin, credentials: true }));

const db = new pg.Client({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "dribble_db",
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT || 5432),
});

/*
 * HTTP is used for local development by default.
 * To enable HTTPS, provide both SSL_KEY_PATH and SSL_CERT_PATH.
 * Keep the key outside the repository and never commit it.
 */
const keyPath = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;

if (Boolean(keyPath) !== Boolean(certPath)) {
  throw new Error("Set both SSL_KEY_PATH and SSL_CERT_PATH to enable HTTPS.");
}

const server = keyPath && certPath
  ? https.createServer(
      {
        key: fs.readFileSync(keyPath, "utf8"),
        cert: fs.readFileSync(certPath, "utf8"),
      },
      app
    )
  : http.createServer(app);

const wss = new WebSocketServer({ server });
const activeConnections = new Map();

wss.on("connection", (ws) => {
  let currentUser = null;

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log("Received:", data);

      if (data.type === "login" && data.payload?.username) {
        currentUser = data.payload.username;
        activeConnections.set(currentUser, ws);
        console.log(`🔗 ${currentUser} connected`);
      }

      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (err) {
      console.error("Invalid WS message:", err);
    }
  });

  ws.on("close", () => {
    if (currentUser && activeConnections.get(currentUser) === ws) {
      activeConnections.delete(currentUser);
      console.log(`❌ ${currentUser} disconnected`);
    }
  });

  ws.send(JSON.stringify({ type: "info", payload: "Welcome to WebSocket chat!" }));
});

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Username, email and password are required" });
  }

  try {
    const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, saltRounds);
    await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hashed]
    );

    res.status(200).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      user: { username: user.username, email: user.email },
    });

    const wsClient = activeConnections.get(username);
    if (wsClient) {
      wsClient.send(JSON.stringify({ type: "login", payload: { username } }));
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/logout", (req, res) => {
  const { username } = req.body;
  const wsClient = activeConnections.get(username);

  if (wsClient) {
    wsClient.close();
    activeConnections.delete(username);
    res.status(200).json({ message: "Logout successful" });
  } else {
    res.status(400).json({ message: "User not logged in" });
  }
});

db.connect()
  .then(() => {
    server.listen(port, host, () => {
      const protocol = keyPath && certPath ? "https" : "http";
      console.log(`Server running at ${protocol}://${host}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Could not connect to PostgreSQL:", err.message);
    process.exit(1);
  });
