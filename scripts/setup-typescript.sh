#!/bin/bash

# Navigate to frontend directory
cd frontend

# Install TypeScript and related dependencies
npm install --save-dev typescript @types/react @types/react-dom @types/node @types/markdown-it @types/vega @types/vega-lite

# Create tsconfig.json if it doesn't exist
if [ ! -f tsconfig.json ]; then
  echo '{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowJs": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}' > tsconfig.json
fi

# Create tsconfig.node.json if it doesn't exist
if [ ! -f tsconfig.node.json ]; then
  echo '{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}' > tsconfig.node.json
fi

# Update package.json scripts
if ! grep -q '"typecheck"' package.json; then
  # Add typecheck script before the existing scripts closing brace
  sed -i '' '/"scripts": {/a\
    "typecheck": "tsc --noEmit",
' package.json
fi

# Navigate back to root directory
cd ..

# Install TypeScript in backend
cd backend
npm install --save-dev typescript @types/node @types/express

# Create tsconfig.json for backend if it doesn't exist
if [ ! -f tsconfig.json ]; then
  echo '{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}' > tsconfig.json
fi

# Update package.json scripts for backend
if ! grep -q '"typecheck"' package.json; then
  # Add typecheck script before the existing scripts closing brace
  sed -i '' '/"scripts": {/a\
    "typecheck": "tsc --noEmit",
' package.json
fi

echo "TypeScript setup complete! You can now run 'npm run typecheck' in either frontend or backend directory to check types." 