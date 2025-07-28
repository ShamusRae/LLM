'use strict';

const { Pool } = require('pg');
const Redis = require('redis');

/**
 * ConsultingDatabase - Professional database layer for consulting platform
 * Handles PostgreSQL operations and Redis caching
 */
class ConsultingDatabase {
  constructor(config = {}) {
    // PostgreSQL configuration
    this.pgConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'consulting_platform',
      user: process.env.DB_USER || process.env.USER,
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    // Redis configuration for caching
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0
    };

    this.pool = null;
    this.redis = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connections
   */
  async initialize() {
    try {
      // Initialize PostgreSQL pool
      this.pool = new Pool(this.pgConfig);
      
      // Test connection
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connected successfully');
      client.release();

      // Initialize Redis (optional, graceful fallback)
      try {
        this.redis = Redis.createClient(this.redisConfig);
        await this.redis.connect();
        console.log('✅ Redis connected successfully');
      } catch (redisError) {
        console.warn('⚠️ Redis connection failed, continuing without caching:', redisError.message);
        this.redis = null;
      }

      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Create a new consulting project
   */
  async createProject(projectData) {
    if (!this.pool) {
      throw new Error('Database not initialized. Pool is null.');
    }
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert project
      const projectQuery = `
        INSERT INTO consulting_projects (
          client_id, title, query, context, timeframe, budget, urgency,
          expected_deliverables, requirements, feasibility_analysis
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      // Fix: Ensure proper type handling and null value conversion
      const clientId = projectData.clientId || (await this.getOrCreateDemoClient(client)).id;
      const title = (projectData.title || projectData.query.substring(0, 100)) + 
        (projectData.query.length > 100 ? '...' : '');
      
      const projectValues = [
        clientId,
        title,
        projectData.query || '',
        projectData.context || '',
        projectData.timeframe || null, // Proper null instead of string "null"
        projectData.budget || null,   // Proper null instead of string "null"  
        projectData.urgency || 'normal',
        Array.isArray(projectData.expectedDeliverables) ? 
          projectData.expectedDeliverables : [],
        JSON.stringify(projectData.requirements || {}),
        JSON.stringify(projectData.feasibilityAnalysis || {})
      ];

      const projectResult = await client.query(projectQuery, projectValues);
      const project = projectResult.rows[0];

      // Insert work modules if provided
      if (projectData.workModules && projectData.workModules.length > 0) {
        for (const module of projectData.workModules) {
          const moduleQuery = `
            INSERT INTO work_modules (
              project_id, module_type, title, description, specialist_type,
              estimated_hours, dependencies
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          
          // Fix: Ensure proper type conversions for database insertion
          const estimatedHours = module.estimatedHours ? 
            Math.round(parseFloat(module.estimatedHours)) : 2; // Convert to integer
          
          const title = module.title || 
            (module.description ? module.description.substring(0, 250) + '...' : 'Untitled Module');
          
          // Fix: Dependencies should be PostgreSQL array, not JSON
          // Filter out non-UUID dependencies (module planning uses string IDs)
          const dependencies = Array.isArray(module.dependencies) ? 
            module.dependencies.filter(dep => {
              // Check if it's a valid UUID format
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              return dep && dep !== 'null' && uuidRegex.test(dep);
            }) : [];
          
          await client.query(moduleQuery, [
            project.id,
            module.type || 'analysis',
            title,
            module.description || '',
            module.specialist || 'general',
            estimatedHours, // Now guaranteed to be integer
            dependencies // PostgreSQL will handle array conversion
          ]);
        }
      }

      await client.query('COMMIT');
      
      // Clear cache
      if (this.redis) {
        await this.redis.del(`projects:client:${project.client_id}`);
      }

      return project;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get project by ID with all related data
   */
  async getProject(projectId) {
    const cacheKey = `project:${projectId}`;
    
    // Try cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        console.warn('Cache read error:', cacheError.message);
      }
    }

    // Query database
    const query = `
      SELECT 
        p.*,
        array_agg(
          json_build_object(
            'id', wm.id,
            'type', wm.module_type,
            'title', wm.title,
            'description', wm.description,
            'specialist', wm.specialist_type,
            'status', wm.status,
            'estimatedHours', wm.estimated_hours,
            'actualHours', wm.actual_hours,
            'qualityScore', wm.quality_score,
            'deliverables', wm.deliverables,
            'dependencies', wm.dependencies
          )
        ) FILTER (WHERE wm.id IS NOT NULL) as work_modules
      FROM consulting_projects p
      LEFT JOIN work_modules wm ON p.id = wm.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await this.pool.query(query, [projectId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Project ${projectId} not found`);
    }

    const project = result.rows[0];
    
    // Cache the result
    if (this.redis) {
      try {
        await this.redis.setEx(cacheKey, 300, JSON.stringify(project)); // 5 minute cache
      } catch (cacheError) {
        console.warn('Cache write error:', cacheError.message);
      }
    }

    return project;
  }

  /**
   * Update project status and metrics
   */
  async updateProject(projectId, updates) {
    const client = await this.pool.connect();
    try {
      const setClause = [];
      const values = [];
      let paramCount = 1;

      // Build dynamic UPDATE query
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'status' || key === 'quality_score' || key === 'execution_start' || key === 'actual_completion') {
          setClause.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (setClause.length === 0) {
        return null; // Nothing to update
      }

      const query = `
        UPDATE consulting_projects 
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;
      values.push(projectId);

      const result = await client.query(query, values);
      
      // Clear caches
      if (this.redis && result.rows.length > 0) {
        const project = result.rows[0];
        await this.redis.del(`project:${projectId}`);
        await this.redis.del(`projects:client:${project.client_id}`);
      }

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Add progress update for real-time tracking
   */
  async addProgressUpdate(projectId, progressData) {
    const query = `
      INSERT INTO project_progress (
        project_id, phase, message, progress_percentage, 
        agent_name, agent_role, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      projectId,
      progressData.phase,
      progressData.message,
      progressData.progress || 0,
      progressData.agent || null,
      progressData.role || null,
      JSON.stringify(progressData.metadata || {})
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get progress updates for a project
   */
  async getProgressUpdates(projectId, limit = 50) {
    const query = `
      SELECT * FROM project_progress 
      WHERE project_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    const result = await this.pool.query(query, [projectId, limit]);
    return result.rows.reverse(); // Return in chronological order
  }

  /**
   * Save final report
   */
  async saveProjectReport(projectId, reportData) {
    const query = `
      INSERT INTO project_reports (
        project_id, executive_summary, key_findings, recommendations,
        implementation_roadmap, risk_mitigation, success_metrics,
        quality_score, deliverables
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      projectId,
      reportData.executiveSummary || '',
      reportData.keyFindings || [],
      JSON.stringify(reportData.recommendations || {}),
      JSON.stringify(reportData.implementationRoadmap || {}),
      reportData.riskMitigation || [],
      reportData.successMetrics || [],
      reportData.qualityScore || 0,
      JSON.stringify(reportData.deliverables || [])
    ];

    const result = await this.pool.query(query, values);
    
    // Clear project cache
    if (this.redis) {
      await this.redis.del(`project:${projectId}`);
    }

    return result.rows[0];
  }

  /**
   * Get all projects for a client
   */
  async getClientProjects(clientId, limit = 100) {
    const cacheKey = `projects:client:${clientId}`;
    
    // Try cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        console.warn('Cache read error:', cacheError.message);
      }
    }

    const query = `
      SELECT p.*, pr.executive_summary, pr.quality_score as report_quality_score
      FROM consulting_projects p
      LEFT JOIN project_reports pr ON p.id = pr.project_id
      WHERE p.client_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [clientId, limit]);
    
    // Cache the result
    if (this.redis) {
      try {
        await this.redis.setEx(cacheKey, 180, JSON.stringify(result.rows)); // 3 minute cache
      } catch (cacheError) {
        console.warn('Cache write error:', cacheError.message);
      }
    }

    return result.rows;
  }

  /**
   * Get or create demo client for development
   */
  async getOrCreateDemoClient(client = null) {
    const shouldReleaseClient = !client;
    if (!client) {
      client = await this.pool.connect();
    }

    try {
      // Try to find existing demo client
      let result = await client.query(
        "SELECT * FROM clients WHERE email = 'demo@example.com'"
      );

      if (result.rows.length === 0) {
        // Create demo client
        result = await client.query(
          "INSERT INTO clients (name, email, organization) VALUES ('Demo Client', 'demo@example.com', 'Demo Organization') RETURNING *"
        );
      }

      return result.rows[0];
    } finally {
      if (shouldReleaseClient) {
        client.release();
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.pool.query('SELECT 1');
      
      const redisHealthy = this.redis ? await this.redis.ping() === 'PONG' : false;
      
      return {
        postgresql: true,
        redis: redisHealthy,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  /**
   * Close connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
    }
    if (this.redis) {
      await this.redis.quit();
    }
    console.log('🔌 Database connections closed');
  }
}

module.exports = ConsultingDatabase; 