const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validation middleware for task creation and updates
 */
const validateTask = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title must not exceed 255 characters'
    }),
    description: Joi.string().max(2000).optional().allow('').messages({
      'string.max': 'Description must not exceed 2000 characters'
    }),
    projectId: Joi.string().uuid().required().messages({
      'string.guid': 'Project ID must be a valid UUID',
      'any.required': 'Project ID is required'
    }),
    assignedTo: Joi.string().uuid().optional().allow(null).messages({
      'string.guid': 'Assigned user ID must be a valid UUID'
    }),
    status: Joi.string().valid('todo', 'in_progress', 'review', 'done').optional().messages({
      'any.only': 'Status must be one of: todo, in_progress, review, done'
    }),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional().messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),
    dueDate: Joi.date().iso().optional().allow(null).messages({
      'date.format': 'Due date must be a valid ISO date'
    }),
    estimatedHours: Joi.number().min(0).max(999.99).precision(2).optional().allow(null).messages({
      'number.min': 'Estimated hours must be 0 or greater',
      'number.max': 'Estimated hours must not exceed 999.99',
      'number.precision': 'Estimated hours can have at most 2 decimal places'
    }),
    actualHours: Joi.number().min(0).max(999.99).precision(2).optional().allow(null).messages({
      'number.min': 'Actual hours must be 0 or greater',
      'number.max': 'Actual hours must not exceed 999.99',
      'number.precision': 'Actual hours can have at most 2 decimal places'
    }),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional().messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.max': 'Each tag must not exceed 50 characters'
    })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn(`Validation error for task: ${errorMessages.join(', ')}`);
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errorMessages
    });
  }

  // Sanitize and set validated data
  req.body = value;
  next();
};

/**
 * Validation middleware for query parameters
 */
const validateQueryParams = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).max(1000).optional().messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
      'number.max': 'Page must not exceed 1000'
    }),
    limit: Joi.number().integer().min(1).max(100).optional().messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    }),
    status: Joi.string().valid('todo', 'in_progress', 'review', 'done').optional().messages({
      'any.only': 'Status must be one of: todo, in_progress, review, done'
    }),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional().messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),
    projectId: Joi.string().uuid().optional().messages({
      'string.guid': 'Project ID must be a valid UUID'
    }),
    assignedTo: Joi.string().uuid().optional().messages({
      'string.guid': 'Assigned user ID must be a valid UUID'
    }),
    search: Joi.string().max(100).optional().messages({
      'string.max': 'Search term must not exceed 100 characters'
    }),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'dueDate', 'priority', 'title').optional().messages({
      'any.only': 'Sort field must be one of: createdAt, updatedAt, dueDate, priority, title'
    }),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional().messages({
      'any.only': 'Sort order must be ASC or DESC'
    }),
    dueDateFrom: Joi.date().iso().optional().messages({
      'date.format': 'Due date from must be a valid ISO date'
    }),
    dueDateTo: Joi.date().iso().optional().messages({
      'date.format': 'Due date to must be a valid ISO date'
    })
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn(`Query validation error: ${errorMessages.join(', ')}`);
    
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: errorMessages
    });
  }

  // Set validated query parameters
  req.query = value;
  next();
};

/**
 * Validation middleware for task assignment
 */
const validateTaskAssignment = (req, res, next) => {
  const schema = Joi.object({
    assignedTo: Joi.string().uuid().required().messages({
      'string.guid': 'Assigned user ID must be a valid UUID',
      'any.required': 'Assigned user ID is required'
    })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn(`Task assignment validation error: ${errorMessages.join(', ')}`);
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errorMessages
    });
  }

  req.body = value;
  next();
};

/**
 * Validation middleware for task status update
 */
const validateTaskStatus = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid('todo', 'in_progress', 'review', 'done').required().messages({
      'any.only': 'Status must be one of: todo, in_progress, review, done',
      'any.required': 'Status is required'
    })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn(`Task status validation error: ${errorMessages.join(', ')}`);
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errorMessages
    });
  }

  req.body = value;
  next();
};

/**
 * Validation middleware for partial task updates
 */
const validatePartialTaskUpdate = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).optional().messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title must not exceed 255 characters'
    }),
    description: Joi.string().max(2000).optional().allow('').messages({
      'string.max': 'Description must not exceed 2000 characters'
    }),
    status: Joi.string().valid('todo', 'in_progress', 'review', 'done').optional().messages({
      'any.only': 'Status must be one of: todo, in_progress, review, done'
    }),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional().messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),
    assignedTo: Joi.string().uuid().optional().allow(null).messages({
      'string.guid': 'Assigned user ID must be a valid UUID'
    }),
    dueDate: Joi.date().iso().optional().allow(null).messages({
      'date.format': 'Due date must be a valid ISO date'
    }),
    estimatedHours: Joi.number().min(0).max(999.99).precision(2).optional().allow(null).messages({
      'number.min': 'Estimated hours must be 0 or greater',
      'number.max': 'Estimated hours must not exceed 999.99',
      'number.precision': 'Estimated hours can have at most 2 decimal places'
    }),
    actualHours: Joi.number().min(0).max(999.99).precision(2).optional().allow(null).messages({
      'number.min': 'Actual hours must be 0 or greater',
      'number.max': 'Actual hours must not exceed 999.99',
      'number.precision': 'Actual hours can have at most 2 decimal places'
    }),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional().messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.max': 'Each tag must not exceed 50 characters'
    })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn(`Partial update validation error: ${errorMessages.join(', ')}`);
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errorMessages
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validateTask,
  validateQueryParams,
  validateTaskAssignment,
  validateTaskStatus,
  validatePartialTaskUpdate
};
