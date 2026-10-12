const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { verifyToken } = require("../middleware/auth");

router.use(verifyToken);

router.post("/", ticketController.createTicket);
router.get("/", ticketController.getTickets);

module.exports = router;
