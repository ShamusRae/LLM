module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'backend/server.js',
      watch: ['backend'],
      env: {
        NODE_ENV: 'development',
        PORT: process.env.BACKEND_PORT || 3001,
      },
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'run dev',
      cwd: 'frontend',
      watch: ['frontend'],
      env: {
        NODE_ENV: 'development',
        VITE_API_PORT: process.env.BACKEND_PORT || 3001,
        VITE_WRAPPER_PORT: process.env.WRAPPER_PORT || 3002,
        FRONTEND_PORT: process.env.FRONTEND_PORT || 5173,
      },
    },
    {
      name: 'avatar-wrapper',
      script: 'modules/avatar_predictive_wrapper_rd_agent/server.js',
      watch: ['modules/avatar_predictive_wrapper_rd_agent'],
      env: {
        NODE_ENV: 'development',
        PORT: process.env.WRAPPER_PORT || 3002,
      },
    },
  ],
}; 