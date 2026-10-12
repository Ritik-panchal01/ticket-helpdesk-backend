const db = require("../db/db");

const pickNextStaff = async (client) => {
  const trackerRes = await client.query(
    "SELECT last_staff_id FROM ticket_assignment_tracker WHERE id = 1 FOR UPDATE",
  );
  const lastStaffId = trackerRes.rows[0]?.last_staff_id;

  const staffRes = await client.query(
    "SELECT id FROM users WHERE role = 'staff' AND is_available = TRUE ORDER BY id ASC",
  );
  const activeStaff = staffRes.rows;

  if (activeStaff.length === 0) return null;

  let nextStaff = null;
  if (!lastStaffId) {
    nextStaff = activeStaff[0];
  } else {
    nextStaff = activeStaff.find((s) => s.id > lastStaffId) || activeStaff[0];
  }

  await client.query(
    "UPDATE ticket_assignment_tracker SET last_staff_id = $1 WHERE id = 1",
    [nextStaff.id],
  );

  return nextStaff.id;
};

exports.createTicket = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { title, description, priority, category } = req.body;
    const customerId = req.user.id;

    const assignedStaffId = await pickNextStaff(client);

    const insertQuery = `
      INSERT INTO tickets (title, description, priority, category, created_by, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await client.query(insertQuery, [
      title,
      description,
      priority || "Medium",
      category,
      customerId,
      assignedStaffId,
    ]);

    const ticket = result.rows[0];

    await client.query(
      "INSERT INTO ticket_logs (ticket_id, action, performed_by) VALUES ($1, $2, $3)",
      [
        ticket.id,
        `Ticket created and assigned to staff ID: ${assignedStaffId || "Unassigned"}`,
        customerId,
      ],
    );

    await client.query("COMMIT");
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

exports.getTickets = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let query =
      "SELECT t.*, u.name as customer_name, s.name as staff_name FROM tickets t LEFT JOIN users u ON t.created_by = u.id LEFT JOIN users s ON t.assigned_to = s.id";
    const params = [];

    if (role === "customer") {
      query += " WHERE t.created_by = $1";
      params.push(id);
    } else if (role === "staff") {
      query += " WHERE t.assigned_to = $1";
      params.push(id);
    }

    query += " ORDER BY t.created_at DESC";
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};
