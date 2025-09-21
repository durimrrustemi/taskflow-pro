const { sequelize } = require('../config/database');
const User = require('./User')(sequelize);
const Project = require('./Project')(sequelize);
const Task = require('./Task')(sequelize);
const Comment = require('./Comment')(sequelize);
const ProjectMember = require('./ProjectMember')(sequelize);

// Define associations
User.belongsToMany(Project, {
  through: ProjectMember,
  foreignKey: 'userId',
  as: 'projects'
});

Project.belongsToMany(User, {
  through: ProjectMember,
  foreignKey: 'projectId',
  as: 'members'
});

// Project associations
Project.hasMany(Task, {
  foreignKey: 'projectId',
  as: 'tasks'
});

Task.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project'
});

// User task associations
User.hasMany(Task, {
  foreignKey: 'assignedTo',
  as: 'assignedTasks'
});

Task.belongsTo(User, {
  foreignKey: 'assignedTo',
  as: 'assignee'
});

User.hasMany(Task, {
  foreignKey: 'createdBy',
  as: 'createdTasks'
});

Task.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// Comment associations
Task.hasMany(Comment, {
  foreignKey: 'taskId',
  as: 'comments'
});

Comment.belongsTo(Task, {
  foreignKey: 'taskId',
  as: 'task'
});

User.hasMany(Comment, {
  foreignKey: 'userId',
  as: 'comments'
});

Comment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
});

// Project member associations
ProjectMember.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

ProjectMember.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project'
});

const models = {
  sequelize,
  User,
  Project,
  Task,
  Comment,
  ProjectMember
};

module.exports = models;
