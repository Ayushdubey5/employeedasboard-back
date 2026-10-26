const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/tasks', (req, res) => {
  try {
    // Simulate occasional API delay
    const delay = Math.random() * 500;

    setTimeout(() => {
      // Simulate occasional failure (10% chance) for demonstration
      if (Math.random() < 0.1) {
        return res.status(503).json({
          error: 'CRM Service temporarily unavailable',
          message: 'The CRM API is experiencing intermittent issues.',
        });
      }

      const dataPath = path.join(__dirname, '..', 'data', 'crmTasks.json');
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const tasks = JSON.parse(rawData);

      res.json({
        success: true,
        source: 'CRM',
        count: tasks.length,
        data: tasks,
      });
    }, delay);
  } catch (error) {
    console.error('CRM API Error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch CRM tasks.',
    });
  }
});

module.exports = router;