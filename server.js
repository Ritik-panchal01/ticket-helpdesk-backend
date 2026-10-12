const express = require("express");
const cors = require("cors");
const pool = require("./db/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// 1. Register Route
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    if (userExists.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "User already exists with this email!" });
    }

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, password],
    );

    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// 2. Login Route
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password!" });
    }

    if (user.rows[0].password !== password) {
      return res.status(400).json({ error: "Invalid email or password!" });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// 3. Get All Tickets Route (Admin)
app.get("/api/tickets", async (req, res) => {
  try {
    const allTickets = await pool.query(
      "SELECT * FROM tickets ORDER BY id DESC",
    );
    res.json(allTickets.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// 4. Get User Specific Tickets Route
app.get("/api/tickets/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const userTickets = await pool.query(
      "SELECT * FROM tickets WHERE email = $1 ORDER BY id DESC",
      [email],
    );
    res.json(userTickets.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch user tickets" });
  }
});

// 5. Submit Ticket Route
app.post("/api/tickets", async (req, res) => {
  try {
    const { name, email, phone, title, priority, description } = req.body;

    const newTicket = await pool.query(
      "INSERT INTO tickets (name, email, phone, title, priority, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [name, email, phone, title, priority, description],
    );

    res.status(201).json(newTicket.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to submit ticket" });
  }
});

// 6. Update Ticket Status Route (Mark as Resolved / Reopen)
app.put("/api/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateTicket = await pool.query(
      "UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );

    res.json(updateTicket.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to update ticket status" });
  }
});

app.listen(PORT, () =>
  console.log(`Helpdesk API running on http://localhost:${PORT}`),
);
