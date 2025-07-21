const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');

// Get all teams
router.get('/', teamController.getAllTeams);

// Create a new team
router.post('/', teamController.createTeam);

// Get a team by ID
router.get('/:id', teamController.getTeamById);

// Update a team
router.put('/:id', teamController.updateTeam);

// Delete a team
router.delete('/:id', teamController.deleteTeam);

// Generate an image for a team
router.post('/generate-image', teamController.generateTeamImage);

// Generate a plan for a team
router.post('/generate-plan', teamController.generateTeamPlan);

// Start a team chat
router.post('/:teamId/start-chat', teamController.startTeamChat);

module.exports = router; 