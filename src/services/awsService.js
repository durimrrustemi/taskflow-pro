const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const nodemailer = require('nodemailer');
const { SES } = require('aws-sdk');
require('dotenv').config();

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize AWS services
const s3 = new AWS.S3();
const ses = new AWS.SES();

class AWSService {
  /**
   * S3 File Upload Configuration
   */
  static getS3UploadConfig() {
    const upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET || 'taskflow-pro-uploads',
        acl: 'public-read',
        key: function (req, file, cb) {
          const userId = req.user ? req.user.id : 'anonymous';
          const timestamp = Date.now();
          const filename = `${userId}/${timestamp}-${file.originalname}`;
          cb(null, filename);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, {
            fieldName: file.fieldname,
            uploadedBy: req.user ? req.user.id : 'anonymous',
            uploadedAt: new Date().toISOString()
          });
        }
      }),
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf,doc,docx,txt').split(',');
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        
        if (allowedTypes.includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error(`File type .${fileExtension} is not allowed`), false);
        }
      }
    });

    return upload;
  }

  /**
   * Upload file to S3
   */
  static async uploadToS3(file, bucketName, key) {
    try {
      const params = {
        Bucket: bucketName || process.env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };

      const result = await s3.upload(params).promise();
      return {
        success: true,
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFromS3(bucketName, key) {
    try {
      const params = {
        Bucket: bucketName || process.env.AWS_S3_BUCKET,
        Key: key
      };

      await s3.deleteObject(params).promise();
      return { success: true };
    } catch (error) {
      console.error('S3 delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate signed URL for private file access
   */
  static async generateSignedUrl(bucketName, key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: bucketName || process.env.AWS_S3_BUCKET,
        Key: key,
        Expires: expiresIn
      };

      const url = await s3.getSignedUrlPromise('getObject', params);
      return {
        success: true,
        url: url,
        expiresIn: expiresIn
      };
    } catch (error) {
      console.error('S3 signed URL error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List files in S3 bucket
   */
  static async listFiles(bucketName, prefix = '', maxKeys = 100) {
    try {
      const params = {
        Bucket: bucketName || process.env.AWS_S3_BUCKET,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await s3.listObjectsV2(params).promise();
      return {
        success: true,
        files: result.Contents.map(file => ({
          key: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          etag: file.ETag
        })),
        count: result.KeyCount
      };
    } catch (error) {
      console.error('S3 list files error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Email Service using AWS SES
   */
  static async sendEmail({ to, subject, html, text, from }) {
    try {
      const params = {
        Source: from || process.env.EMAIL_FROM,
        Destination: {
          ToAddresses: Array.isArray(to) ? to : [to]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: html ? {
              Data: html,
              Charset: 'UTF-8'
            } : undefined,
            Text: text ? {
              Data: text,
              Charset: 'UTF-8'
            } : undefined
          }
        }
      };

      const result = await ses.sendEmail(params).promise();
      return {
        success: true,
        messageId: result.MessageId
      };
    } catch (error) {
      console.error('SES send email error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Welcome to TaskFlow Pro!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to TaskFlow Pro</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TaskFlow Pro!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for joining TaskFlow Pro. We're excited to help you manage your projects and tasks more efficiently.</p>
            <p>Here's what you can do with TaskFlow Pro:</p>
            <ul>
              <li>Create and manage projects</li>
              <li>Assign tasks to team members</li>
              <li>Track progress in real-time</li>
              <li>Collaborate with your team</li>
            </ul>
            <p style="text-align: center;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">Get Started</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The TaskFlow Pro Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html
    });
  }

  /**
   * Send task notification email
   */
  static async sendTaskNotificationEmail(userEmail, taskTitle, projectName, notificationType) {
    const subject = `TaskFlow Pro: ${notificationType} - ${taskTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Task Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .task-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TaskFlow Pro Notification</h1>
          </div>
          <div class="content">
            <h2>Task ${notificationType}</h2>
            <div class="task-info">
              <h3>${taskTitle}</h3>
              <p><strong>Project:</strong> ${projectName}</p>
              <p><strong>Type:</strong> ${notificationType}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p>Click the link below to view the task:</p>
            <p style="text-align: center;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">View Task</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html
    });
  }

  /**
   * Get SES sending statistics
   */
  static async getSESStats() {
    try {
      const params = {
        StartDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        EndDate: new Date()
      };

      const result = await ses.getSendStatistics().promise();
      return {
        success: true,
        stats: result.SendDataPoints
      };
    } catch (error) {
      console.error('SES stats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify email address for SES
   */
  static async verifyEmailAddress(email) {
    try {
      const params = {
        EmailAddress: email
      };

      await ses.verifyEmailIdentity(params).promise();
      return {
        success: true,
        message: 'Verification email sent'
      };
    } catch (error) {
      console.error('SES verify email error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get CloudWatch metrics (example)
   */
  static async getCloudWatchMetrics(metricName, namespace, dimensions) {
    try {
      const cloudwatch = new AWS.CloudWatch();
      
      const params = {
        Namespace: namespace || 'TaskFlowPro',
        MetricName: metricName,
        Dimensions: dimensions || [],
        StartTime: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        EndTime: new Date(),
        Period: 300, // 5 minutes
        Statistics: ['Average', 'Sum', 'Maximum', 'Minimum']
      };

      const result = await cloudwatch.getMetricStatistics(params).promise();
      return {
        success: true,
        metrics: result.Datapoints
      };
    } catch (error) {
      console.error('CloudWatch metrics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AWSService;
