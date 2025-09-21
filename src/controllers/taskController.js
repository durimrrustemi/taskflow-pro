const { Task, User, Project, Comment } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const queueManager = require('../services/queueManager');

/**
 * @swagger
 * components:
 *   responses:
 *     BadRequest:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Unauthorized:
 *       description: Unauthorized
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     InternalServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * Get all tasks with pagination and filtering
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     summary: Get all tasks with pagination and filtering
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 */
const getAllTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      projectId,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      dueDateFrom,
      dueDateTo
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (priority) {
      whereClause.priority = priority;
    }
    
    if (projectId) {
      whereClause.projectId = projectId;
    }
    
    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (dueDateFrom || dueDateTo) {
      whereClause.dueDate = {};
      if (dueDateFrom) {
        whereClause.dueDate[Op.gte] = new Date(dueDateFrom);
      }
      if (dueDateTo) {
        whereClause.dueDate[Op.lte] = new Date(dueDateTo);
      }
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Get total count
    const totalItems = await Task.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / limitInt);

    // Get tasks with pagination
    const tasks = await Task.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'color']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: limitInt,
      offset: offset
    });

    // Add background job to update task statistics
    await queueManager.addJob('updateTaskStats', {
      projectId: projectId || null,
      userId: req.user.id
    });

    const pagination = {
      currentPage: parseInt(page),
      totalPages,
      totalItems,
      itemsPerPage: limitInt,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    };

    res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: {
        tasks: tasks.rows,
        pagination
      }
    });

  } catch (error) {
    logger.error('Error getting tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single task by ID
 */
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'color', 'description']
        },
        {
          model: Comment,
          as: 'comments',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Add background job to track task view
    await queueManager.addJob('trackTaskView', {
      taskId: id,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Task retrieved successfully',
      data: task
    });

  } catch (error) {
    logger.error('Error getting task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new task
 */
const createTask = async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user.id
    };

    const task = await Task.create(taskData);

    // Get the created task with associations
    const createdTask = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    // Add background jobs
    await queueManager.addJob('sendTaskNotification', {
      taskId: task.id,
      type: 'task_created',
      assignedTo: task.assignedTo,
      createdBy: req.user.id
    });

    await queueManager.addJob('updateProjectStats', {
      projectId: task.projectId
    });

    logger.info(`Task created: ${task.id} by user: ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: createdTask
    });

  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a task completely (PUT)
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.update(updateData);

    // Get updated task with associations
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    // Add background job for notifications
    await queueManager.addJob('sendTaskNotification', {
      taskId: id,
      type: 'task_updated',
      assignedTo: task.assignedTo,
      updatedBy: req.user.id
    });

    logger.info(`Task updated: ${id} by user: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });

  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Partially update a task (PATCH)
 */
const partialUpdateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only update provided fields
    const allowedFields = [
      'title', 'description', 'status', 'priority', 'assignedTo',
      'dueDate', 'estimatedHours', 'actualHours', 'tags'
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    await task.update(filteredData);

    // Get updated task with associations
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    // Add background job for notifications
    await queueManager.addJob('sendTaskNotification', {
      taskId: id,
      type: 'task_updated',
      assignedTo: task.assignedTo,
      updatedBy: req.user.id
    });

    logger.info(`Task partially updated: ${id} by user: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });

  } catch (error) {
    logger.error('Error partially updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a task
 */
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.destroy();

    // Add background job for cleanup
    await queueManager.addJob('cleanupTaskData', {
      taskId: id,
      deletedBy: req.user.id
    });

    logger.info(`Task deleted: ${id} by user: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Assign task to a user
 */
const assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.update({ assignedTo });

    // Get updated task with associations
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    // Add background job for assignment notification
    await queueManager.addJob('sendTaskNotification', {
      taskId: id,
      type: 'task_assigned',
      assignedTo: assignedTo,
      assignedBy: req.user.id
    });

    logger.info(`Task assigned: ${id} to user: ${assignedTo} by user: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Task assigned successfully',
      data: updatedTask
    });

  } catch (error) {
    logger.error('Error assigning task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update task status
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const updateData = { status };
    
    // If marking as done, set completedAt
    if (status === 'done' && task.status !== 'done') {
      updateData.completedAt = new Date();
    }
    
    // If changing from done to another status, clear completedAt
    if (status !== 'done' && task.status === 'done') {
      updateData.completedAt = null;
    }

    await task.update(updateData);

    // Get updated task with associations
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    // Add background jobs
    await queueManager.addJob('sendTaskNotification', {
      taskId: id,
      type: 'task_status_changed',
      assignedTo: task.assignedTo,
      updatedBy: req.user.id,
      newStatus: status
    });

    await queueManager.addJob('updateProjectStats', {
      projectId: task.projectId
    });

    logger.info(`Task status updated: ${id} to ${status} by user: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: updatedTask
    });

  } catch (error) {
    logger.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  partialUpdateTask,
  deleteTask,
  assignTask,
  updateTaskStatus
};
