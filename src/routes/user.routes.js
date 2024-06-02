const express = require("express");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.post("/add-team", userController.addTeam);
router.get("/process-result", userController.processResult);
router.get("/team-result", userController.teamResult);

module.exports = router;
