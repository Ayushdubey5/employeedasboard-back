const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Internal function to fetch CRM tasks
function fetchCRMTasks() {
  return new Promise((resolve, reject) => {
    try {
      const dataPath = path.join(__dirname, '..', 'data', 'crmTasks.json');
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const tasks = JSON.parse(rawData);
      resolve(tasks);
    } catch (error) {
      reject(new Error('CRM API temporarily unavailable'));
    }
  });
}

// Internal function to fetch Helpdesk tasks
function fetchHelpdeskTasks() {
  return new Promise((resolve, reject) => {
    try {
      const dataPath = path.join(__dirname, '..', 'data', 'helpdeskTasks.json');
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const tasks = JSON.parse(rawData);
      resolve(tasks);
    } catch (error) {
      reject(new Error('Helpdesk API temporarily unavailable'));
    }
  });
}

// Normalize CRM task to unified format
function normalizeCRMTask(task) {
  return {
    id: task.id,
    title: task.title,
    employeeName: task.assignedTo,
    status: task.status,
    priorityLevel: task.priority,
    dueDate: task.dueDate,
    source: task.sourceApp,
    redirectUrl: task.sourceUrl,
  };
}

// Normalize Helpdesk task to unified format
function normalizeHelpdeskTask(task) {
  // Map Helpdesk urgency to unified priority
  const urgencyToPriorityMap = {
    Critical: 'High',
    Moderate: 'Medium',
    Low: 'Low',
  };

  // Map Helpdesk status to unified status
  const statusMap = {
    Open: 'Pending',
    'In Progress': 'In Progress',
    Resolved: 'Completed',
  };

  return {
    id: task.id,
    title: task.title,
    employeeName: task.assignedTo,
    status: statusMap[task.status] || task.status,
    priorityLevel: urgencyToPriorityMap[task.urgency] || task.urgency,
    originalUrgency: task.urgency, // Keep original for reference
    dueDate: task.dueDate,
    source: task.sourceApp,
    redirectUrl: task.sourceUrl,
  };
}

// Priority weight mapping
function getPriorityWeight(priority) {
  const weights = {
    High: 3,
    Critical: 3,
    Medium: 2,
    Moderate: 2,
    Low: 1,
  };
  return weights[priority] || 0;
}

// Sort tasks by deadline (ascending) then by priority weight (descending)
function sortTasksByPriority(tasks) {
  return tasks.sort((a, b) => {
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);

    // Primary: sort by due date ascending
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }

    // Secondary: sort by priority weight descending
    const weightA = getPriorityWeight(a.priorityLevel);
    const weightB = getPriorityWeight(b.priorityLevel);
    return weightB - weightA;
  });
}

// Aggregated tasks endpoint
router.get('/', async (req, res) => {
  const warnings = [];
  let allTasks = [];

  try {
    const results = await Promise.allSettled([
      fetchCRMTasks(),
      fetchHelpdeskTasks(),
    ]);

    // Process CRM results
    if (results[0].status === 'fulfilled') {
      const normalizedCRM = results[0].value.map(normalizeCRMTask);
      allTasks = allTasks.concat(normalizedCRM);
    } else {
      warnings.push(`CRM API: ${results[0].reason.message}`);
    }

    // Process Helpdesk results
    if (results[1].status === 'fulfilled') {
      const normalizedHD = results[1].value.map(normalizeHelpdeskTask);
      allTasks = allTasks.concat(normalizedHD);
    } else {
      warnings.push(`Helpdesk API: ${results[1].reason.message}`);
    }

    // Sort tasks
    const sortedTasks = sortTasksByPriority(allTasks);

    // Calculate metrics
    const now = new Date();
    const metrics = {
      totalTasks: sortedTasks.length,
      pendingTasks: sortedTasks.filter((t) => t.status === 'Pending').length,
      inProgressTasks: sortedTasks.filter((t) => t.status === 'In Progress').length,
      completedTasks: sortedTasks.filter((t) => t.status === 'Completed').length,
      highPriorityTasks: sortedTasks.filter((t) => t.priorityLevel === 'High').length,
      overdueTasks: sortedTasks.filter(
        (t) => new Date(t.dueDate) < now && t.status !== 'Completed'
      ).length,
    };

    // Extract unique employees
    const employees = [...new Set(sortedTasks.map((t) => t.employeeName))].sort();

    res.json({
      success: true,
      tasks: sortedTasks,
      metrics,
      employees,
      warnings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Task Aggregation Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to aggregate tasks',
      message: error.message,
      tasks: [],
      warnings: ['Complete API failure - please try again later'],
    });
  }
});

module.exports = router;