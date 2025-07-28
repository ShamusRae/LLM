-- Consulting Platform Database Schema
-- Replaces localStorage with professional data architecture

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types for better data integrity
CREATE TYPE project_status AS ENUM ('initiated', 'executing', 'quality_review', 'completed', 'failed', 'cancelled');
CREATE TYPE module_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'failed');
CREATE TYPE specialist_type AS ENUM ('research', 'strategy', 'technical', 'creative', 'financial', 'legal');
CREATE TYPE urgency_level AS ENUM ('low', 'normal', 'high', 'critical');

-- Clients table for multi-tenancy
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    organization VARCHAR(255),
    tier VARCHAR(50) DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Main projects table
CREATE TABLE consulting_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    query TEXT NOT NULL,
    context TEXT,
    status project_status DEFAULT 'initiated',
    
    -- Project metadata
    timeframe VARCHAR(100),
    budget VARCHAR(100),
    urgency urgency_level DEFAULT 'normal',
    expected_deliverables TEXT[],
    
    -- Requirements and analysis
    requirements JSONB,
    feasibility_analysis JSONB,
    
    -- Execution tracking
    estimated_completion TIMESTAMP,
    actual_completion TIMESTAMP,
    execution_start TIMESTAMP,
    
    -- Quality metrics
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    client_satisfaction DECIMAL(3,2),
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES clients(id)
);

-- Work modules - the individual tasks within a project
CREATE TABLE work_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES consulting_projects(id) ON DELETE CASCADE,
    
    -- Module definition
    module_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    specialist_type specialist_type,
    
    -- Execution details
    status module_status DEFAULT 'pending',
    assigned_to VARCHAR(255),
    estimated_hours INTEGER DEFAULT 2,
    actual_hours INTEGER,
    
    -- Dependencies
    dependencies UUID[],
    
    -- Results
    deliverables JSONB,
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- Timestamps
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project progress tracking for real-time updates
CREATE TABLE project_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES consulting_projects(id) ON DELETE CASCADE,
    
    -- Progress details
    phase VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Agent/system info
    agent_name VARCHAR(100),
    agent_role VARCHAR(100),
    
    -- Additional data
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Final reports and deliverables
CREATE TABLE project_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES consulting_projects(id) ON DELETE CASCADE,
    
    -- Report content
    executive_summary TEXT,
    key_findings TEXT[],
    recommendations JSONB,
    implementation_roadmap JSONB,
    risk_mitigation TEXT[],
    success_metrics TEXT[],
    
    -- Report metadata
    generated_at TIMESTAMP DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    quality_score DECIMAL(3,2),
    
    -- Deliverables
    deliverables JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_client ON consulting_projects(client_id);
CREATE INDEX idx_projects_status ON consulting_projects(status);
CREATE INDEX idx_projects_created ON consulting_projects(created_at DESC);
CREATE INDEX idx_modules_project ON work_modules(project_id);
CREATE INDEX idx_modules_status ON work_modules(status);
CREATE INDEX idx_progress_project ON project_progress(project_id);
CREATE INDEX idx_progress_created ON project_progress(created_at DESC);
CREATE INDEX idx_reports_project ON project_reports(project_id);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON consulting_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON work_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development
INSERT INTO clients (name, email, organization) VALUES 
('Demo Client', 'demo@example.com', 'Demo Organization'); 