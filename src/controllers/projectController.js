const { Project, ProjectMember, Task, User } = require('../models');
const CacheManager = require('../utils/cache');
const { QueueManager } = require('../services/queueManager');
const logger = require('../utils/logger');

class ProjectController {
  /**
   * Create a new project
   */
  static async createProject(req, res) {
    try {
      const userId = req.user.id;
      const { name, description, color, isPublic, startDate, endDate } = req.body;

      // Create project
      const project = await Project.create({
        name,
        description,
        color,
        isPublic: isPublic || false,
        startDate,
        endDate
      });

      // Add creator as owner
      await ProjectMember.create({
        projectId: project.id,
        userId,
        role: 'owner'
      });

      // Add project to cache
      await CacheManager.setProjectCache(project.id, project.toJSON());

      // Send notifications to team members if any
      await QueueManager.addInAppNotificationJob(
        userId,
        'project_created',
        `You created a new project: ${project.name}`,
        { projectId: project.id }
      );

      logger.info('Project created', { projectId: project.id, userId });

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project: project.toJSON() }
      });
    } catch (error) {
      logger.logError(error, { action: 'create_project' });
      res.status(500).json({
        success: false,
        message: 'Failed to create project',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get all projects for user
   */
  static async getProjects(req, res) {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      // Try cache first
      const cacheKey = `user:${userId}:projects:${status || 'all'}:${page}`;
      const cachedProjects = await CacheManager.get(cacheKey);
      
      if (cachedProjects) {
        return res.json({
          success: true,
          data: cachedProjects
        });
      }

      // Build query
      const whereClause = status ? { status } : {};
      const offset = (page - 1) * limit;

      const projects = await Project.findAndCountAll({
        where: whereClause,
        include: [
          {
            association: 'members',
            where: { userId },
            required: true,
            attributes: ['role', 'joinedAt']
          },
          {
            association: 'tasks',
            attributes: ['id', 'status'],
            limit: 5
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      const result = {
        projects: projects.rows.map(project => project.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(projects.count / limit),
          totalItems: projects.count,
          itemsPerPage: parseInt(limit)
        }
      };

      // Cache the result
      await CacheManager.set(cacheKey, result, 1800); // 30 minutes

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.logError(error, { action: 'get_projects' });
      res.status(500).json({
        success: false,
        message: 'Failed to get projects'
      });
    }
  }

  /**
   * Get project by ID
   */
  static async getProject(req, res) {
    try {
      const { projectId } = req.params;

      // Try cache first
      const cachedProject = await CacheManager.getProjectCache(projectId);
      if (cachedProject) {
        return res.json({
          success: true,
          data: { project: cachedProject }
        });
      }

      const project = await Project.findByPk(projectId, {
        include: [
          {
            association: 'members',
            include: [
              {
                association: 'user',
                attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
              }
            ]
          },
          {
            association: 'tasks',
            include: [
              {
                association: 'assignee',
                attributes: ['id', 'firstName', 'lastName', 'avatar']
              },
              {
                association: 'creator',
                attributes: ['id', 'firstName', 'lastName', 'avatar']
              }
            ],
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Cache the result
      await CacheManager.setProjectCache(projectId, project.toJSON());

      res.json({
        success: true,
        data: { project: project.toJSON() }
      });
    } catch (error) {
      logger.logError(error, { action: 'get_project' });
      res.status(500).json({
        success: false,
        message: 'Failed to get project'
      });
    }
  }

  /**
   * Update project
   */
  static async updateProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Update project
      await project.update(updates);

      // Invalidate cache
      await CacheManager.invalidateProjectCache(projectId);

      // Notify team members
      const members = await ProjectMember.findAll({
        where: { projectId },
        include: [{ association: 'user' }]
      });

      for (const member of members) {
        if (member.userId !== userId) {
          await QueueManager.addInAppNotificationJob(
            member.userId,
            'project_updated',
            `Project "${project.name}" has been updated`,
            { projectId }
          );
        }
      }

      logger.info('Project updated', { projectId, userId });

      res.json({
        success: true,
        message: 'Project updated successfully',
        data: { project: project.toJSON() }
      });
    } catch (error) {
      logger.logError(error, { action: 'update_project' });
      res.status(500).json({
        success: false,
        message: 'Failed to update project'
      });
    }
  }

  /**
   * Delete project
   */
  static async deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check if user is owner
      const membership = await ProjectMember.findOne({
        where: { projectId, userId, role: 'owner' }
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Only project owners can delete projects'
        });
      }

      // Delete project (cascade will handle related records)
      await project.destroy();

      // Invalidate cache
      await CacheManager.invalidateProjectCache(projectId);

      logger.info('Project deleted', { projectId, userId });

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      logger.logError(error, { action: 'delete_project' });
      res.status(500).json({
        success: false,
        message: 'Failed to delete project'
      });
    }
  }

  /**
   * Add member to project
   */
  static async addMember(req, res) {
    try {
      const { projectId } = req.params;
      const { userId, role = 'member' } = req.body;
      const currentUserId = req.user.id;

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is already a member
      const existingMembership = await ProjectMember.findOne({
        where: { projectId, userId }
      });

      if (existingMembership) {
        return res.status(409).json({
          success: false,
          message: 'User is already a member of this project'
        });
      }

      // Add member
      const membership = await ProjectMember.create({
        projectId,
        userId,
        role
      });

      // Get project details for notification
      const project = await Project.findByPk(projectId);

      // Notify the new member
      await QueueManager.addInAppNotificationJob(
        userId,
        'project_invitation',
        `You have been added to project "${project.name}"`,
        { projectId, role }
      );

      // Invalidate cache
      await CacheManager.invalidateProjectCache(projectId);

      logger.info('Project member added', { projectId, userId, addedBy: currentUserId });

      res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: { membership: membership.toJSON() }
      });
    } catch (error) {
      logger.logError(error, { action: 'add_member' });
      res.status(500).json({
        success: false,
        message: 'Failed to add member'
      });
    }
  }

  /**
   * Remove member from project
   */
  static async removeMember(req, res) {
    try {
      const { projectId, userId } = req.params;
      const currentUserId = req.user.id;

      // Find membership
      const membership = await ProjectMember.findOne({
        where: { projectId, userId }
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Member not found in project'
        });
      }

      // Check if trying to remove owner
      if (membership.role === 'owner') {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove project owner'
        });
      }

      // Remove member
      await membership.destroy();

      // Get project details for notification
      const project = await Project.findByPk(projectId);

      // Notify the removed member
      await QueueManager.addInAppNotificationJob(
        userId,
        'project_removal',
        `You have been removed from project "${project.name}"`,
        { projectId }
      );

      // Invalidate cache
      await CacheManager.invalidateProjectCache(projectId);

      logger.info('Project member removed', { projectId, userId, removedBy: currentUserId });

      res.json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      logger.logError(error, { action: 'remove_member' });
      res.status(500).json({
        success: false,
        message: 'Failed to remove member'
      });
    }
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(req, res) {
    try {
      const { projectId } = req.params;

      // Try cache first
      const cacheKey = `project:${projectId}:stats`;
      const cachedStats = await CacheManager.get(cacheKey);
      
      if (cachedStats) {
        return res.json({
          success: true,
          data: cachedStats
        });
      }

      // Get task statistics
      const taskStats = await Task.findAll({
        where: { projectId },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      // Get member count
      const memberCount = await ProjectMember.count({
        where: { projectId }
      });

      // Get completion rate
      const totalTasks = await Task.count({ where: { projectId } });
      const completedTasks = await Task.count({ 
        where: { projectId, status: 'done' } 
      });
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const stats = {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: Math.round(completionRate * 100) / 100
        },
        members: memberCount,
        statusBreakdown: taskStats.reduce((acc, stat) => {
          acc[stat.status] = parseInt(stat.dataValues.count);
          return acc;
        }, {})
      };

      // Cache the result
      await CacheManager.set(cacheKey, stats, 1800); // 30 minutes

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.logError(error, { action: 'get_project_stats' });
      res.status(500).json({
        success: false,
        message: 'Failed to get project statistics'
      });
    }
  }
}

module.exports = ProjectController;
