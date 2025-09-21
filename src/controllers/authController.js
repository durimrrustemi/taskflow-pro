const { User } = require('../models');
const JWTUtils = require('../utils/jwt');
const CacheManager = require('../utils/cache');
const { QueueManager } = require('../services/queueManager');
const logger = require('../utils/logger');
const redisClient = require('../config/redis');

class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName
      });

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(user);

      // Cache user session
      await CacheManager.setUserSession(user.id, {
        user: user.toJSON(),
        loginTime: new Date()
      });

      // Add welcome email to queue
      await QueueManager.addWelcomeEmailJob(user.email, `${user.firstName} ${user.lastName}`);

      // Add welcome notification
      await QueueManager.addInAppNotificationJob(
        user.id,
        'welcome',
        `Welcome to TaskFlow Pro, ${user.firstName}!`
      );

      logger.logAuthentication(user.id, 'register', true, { email });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          ...tokens
        }
      });
    } catch (error) {
      logger.logError(error, { action: 'register' });
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Login user
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        logger.logAuthentication(null, 'login', false, { email, reason: 'user_not_found' });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        logger.logAuthentication(user.id, 'login', false, { email, reason: 'account_inactive' });
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        logger.logAuthentication(user.id, 'login', false, { email, reason: 'invalid_password' });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      await user.update({ lastLoginAt: new Date() });

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(user);

      // Cache user session
      await CacheManager.setUserSession(user.id, {
        user: user.toJSON(),
        loginTime: new Date()
      });

      // Cache user data
      await CacheManager.setUserCache(user.id, user.toJSON());

      logger.logAuthentication(user.id, 'login', true, { email });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          ...tokens
        }
      });
    } catch (error) {
      logger.logError(error, { action: 'login' });
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // Verify refresh token
      const decoded = JWTUtils.verifyRefreshToken(refreshToken);

      // Get user from database
      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const tokens = JWTUtils.generateTokenPair(user);

      logger.logAuthentication(user.id, 'refresh_token', true);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens
      });
    } catch (error) {
      logger.logError(error, { action: 'refresh_token' });
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req, res) {
    try {
      const token = req.token;
      const userId = req.user.id;

      // Blacklist the token
      const tokenExpiration = JWTUtils.getTokenExpiration(token);
      const ttl = Math.floor((tokenExpiration.getTime() - Date.now()) / 1000);
      
      if (ttl > 0) {
        await redisClient.setex(`blacklist:${token}`, ttl, 'true');
      }

      // Clear user session and cache
      await CacheManager.deleteUserSession(userId);
      await CacheManager.invalidateUserCache(userId);

      logger.logAuthentication(userId, 'logout', true);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.logError(error, { action: 'logout' });
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req, res) {
    try {
      const user = req.user;

      // Try to get from cache first
      const cachedUser = await CacheManager.getUserCache(user.id);
      if (cachedUser) {
        return res.json({
          success: true,
          data: { user: cachedUser }
        });
      }

      // Get fresh data from database
      const freshUser = await User.findByPk(user.id, {
        include: [
          {
            association: 'projects',
            through: { attributes: ['role'] }
          }
        ]
      });

      // Cache the result
      await CacheManager.setUserCache(user.id, freshUser.toJSON());

      res.json({
        success: true,
        data: { user: freshUser.toJSON() }
      });
    } catch (error) {
      logger.logError(error, { action: 'get_profile' });
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, avatar } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update user
      await user.update({
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        avatar: avatar || user.avatar
      });

      // Invalidate cache
      await CacheManager.invalidateUserCache(userId);

      logger.logAuthentication(userId, 'update_profile', true);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: user.toJSON() }
      });
    } catch (error) {
      logger.logError(error, { action: 'update_profile' });
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Validate current password
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      await user.update({ password: newPassword });

      // Invalidate all user sessions
      await CacheManager.invalidateUserCache(userId);

      logger.logAuthentication(userId, 'change_password', true);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.logError(error, { action: 'change_password' });
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }
}

module.exports = AuthController;
