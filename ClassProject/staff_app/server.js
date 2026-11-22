const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors()); 
app.use(express.json()); 
app.get("/api/staff", (req, res) => {
res.status(200).json({
message: "Staff data received successfully",
staff: ["Aman", "Simran", "Rahul"]
});
});
app.post("/api/contact", (req, res) => {
const { name, email } = req.body;
if (!name || !email) {
return res.status(400).json({
message: "Name and email are required"
});
}
console.log("Contact received:", req.body);
return res.status(200).json({
message: "Contact information received",
name,
email
});
});
app.listen(3007, () => {
console.log("Backend running on port 3007");
});

