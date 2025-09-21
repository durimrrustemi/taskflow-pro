const redisClient = require('../config/redis');

class CacheManager {
  /**
   * Set cache with expiration
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  static async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  static async get(key) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete cache key
   * @param {string} key - Cache key
   */
  static async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple cache keys
   * @param {Array} keys - Array of cache keys
   */
  static async delMultiple(keys) {
    try {
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete multiple error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  static async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set cache if not exists
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  static async setIfNotExists(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      const result = await redisClient.setnx(key, serializedValue);
      if (result === 1) {
        await redisClient.expire(key, ttl);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cache setnx error:', error);
      return false;
    }
  }

  /**
   * Increment counter
   * @param {string} key - Cache key
   * @param {number} increment - Increment value
   */
  static async increment(key, increment = 1) {
    try {
      return await redisClient.incrby(key, increment);
    } catch (error) {
      console.error('Cache increment error:', error);
      return null;
    }
  }

  /**
   * Get cache with fallback function
   * @param {string} key - Cache key
   * @param {Function} fallback - Function to call if cache miss
   * @param {number} ttl - Time to live in seconds
   */
  static async getOrSet(key, fallback, ttl = 3600) {
    try {
      let value = await this.get(key);
      
      if (value === null) {
        value = await fallback();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      }
      
      return value;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      // Fallback to calling the function directly
      return await fallback();
    }
  }

  /**
   * Cache user sessions
   */
  static async setUserSession(userId, sessionData, ttl = 86400) { // 24 hours
    return await this.set(`session:${userId}`, sessionData, ttl);
  }

  static async getUserSession(userId) {
    return await this.get(`session:${userId}`);
  }

  static async deleteUserSession(userId) {
    return await this.del(`session:${userId}`);
  }

  /**
   * Cache API responses
   */
  static async setApiResponse(endpoint, params, response, ttl = 1800) { // 30 minutes
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return await this.set(key, response, ttl);
  }

  static async getApiResponse(endpoint, params) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return await this.get(key);
  }

  /**
   * Cache project data
   */
  static async setProjectCache(projectId, projectData, ttl = 3600) {
    return await this.set(`project:${projectId}`, projectData, ttl);
  }

  static async getProjectCache(projectId) {
    return await this.get(`project:${projectId}`);
  }

  static async invalidateProjectCache(projectId) {
    const keys = [
      `project:${projectId}`,
      `project:${projectId}:tasks`,
      `project:${projectId}:members`,
      `project:${projectId}:stats`
    ];
    return await this.delMultiple(keys);
  }

  /**
   * Cache user data
   */
  static async setUserCache(userId, userData, ttl = 3600) {
    return await this.set(`user:${userId}`, userData, ttl);
  }

  static async getUserCache(userId) {
    return await this.get(`user:${userId}`);
  }

  static async invalidateUserCache(userId) {
    const keys = [
      `user:${userId}`,
      `user:${userId}:projects`,
      `user:${userId}:tasks`,
      `session:${userId}`
    ];
    return await this.delMultiple(keys);
  }

  /**
   * Rate limiting helpers
   */
  static async checkRateLimit(key, limit, window) {
    try {
      const current = await redisClient.incr(key);
      
      if (current === 1) {
        await redisClient.expire(key, window);
      }
      
      return {
        count: current,
        limit: limit,
        remaining: Math.max(0, limit - current),
        resetTime: await redisClient.ttl(key)
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { count: 0, limit, remaining: limit, resetTime: 0 };
    }
  }
}

module.exports = CacheManager;
