const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectMember = sequelize.define('ProjectMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
      defaultValue: 'member'
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'project_members',
    timestamps: false
  });

  return ProjectMember;
};
