-- Initialize TaskFlow Pro Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (handled by POSTGRES_DB environment variable)
-- CREATE DATABASE taskflow_pro;

-- Connect to the database
\c taskflow_pro;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
        CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
    END IF;
END $$;

-- Create indexes for better performance
-- These will be created by Sequelize, but we can add custom ones here

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Insert sample data (optional)
-- This can be used for development/testing

-- Sample admin user (password: admin123)
-- INSERT INTO users (id, email, password, first_name, last_name, role, is_active, created_at, updated_at)
-- VALUES (
--     uuid_generate_v4(),
--     'admin@taskflowpro.com',
--     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4Lq5qKqKqK', -- hashed 'admin123'
--     'Admin',
--     'User',
--     'admin',
--     true,
--     CURRENT_TIMESTAMP,
--     CURRENT_TIMESTAMP
-- );

-- Create views for project statistics and user activity
-- These will be created after tables are created by Sequelize migrations
-- We'll create them conditionally to avoid errors during initial setup

DO $$
BEGIN
    -- Only create views if the required tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        -- Create a view for project statistics
        EXECUTE 'CREATE OR REPLACE VIEW project_stats AS
        SELECT 
            p.id as project_id,
            p.name as project_name,
            COUNT(DISTINCT pm.user_id) as member_count,
            COUNT(DISTINCT t.id) as total_tasks,
            COUNT(DISTINCT CASE WHEN t.status = ''done'' THEN t.id END) as completed_tasks,
            ROUND(
                CASE 
                    WHEN COUNT(DISTINCT t.id) > 0 
                    THEN (COUNT(DISTINCT CASE WHEN t.status = ''done'' THEN t.id END)::float / COUNT(DISTINCT t.id)) * 100
                    ELSE 0
                END, 2
            ) as completion_rate
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN tasks t ON p.id = t.project_id
        GROUP BY p.id, p.name';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Create a view for user activity
        EXECUTE 'CREATE OR REPLACE VIEW user_activity AS
        SELECT 
            u.id as user_id,
            u.email,
            u.first_name,
            u.last_name,
            COUNT(DISTINCT p.id) as project_count,
            COUNT(DISTINCT t.id) as task_count,
            COUNT(DISTINCT CASE WHEN t.assigned_to = u.id THEN t.id END) as assigned_tasks,
            COUNT(DISTINCT CASE WHEN t.created_by = u.id THEN t.id END) as created_tasks,
            u.last_login_at,
            u.created_at
        FROM users u
        LEFT JOIN project_members pm ON u.id = pm.user_id
        LEFT JOIN projects p ON pm.project_id = p.id
        LEFT JOIN tasks t ON p.id = t.project_id
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.last_login_at, u.created_at';
    END IF;
END $$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE taskflow_pro TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Create a backup user (optional)
-- CREATE USER taskflow_backup WITH PASSWORD 'backup_password';
-- GRANT CONNECT ON DATABASE taskflow_pro TO taskflow_backup;
-- GRANT USAGE ON SCHEMA public TO taskflow_backup;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO taskflow_backup;
