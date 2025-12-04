# SprintSync Development Commands

## Essential Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Code formatting
npm run format
npm run format:check

# Linting
npm run lint
```

## Development Workflow
1. **Setup**: Run `npm install` to install dependencies
2. **Development**: Use `npm run dev` to start the development server on localhost:3000
3. **Code Quality**: Run `npm run type-check` before committing
4. **Formatting**: Use `npm run format` to format code with Prettier
5. **Testing**: Build project with `npm run build` to verify production readiness

## Code Quality Commands
- **Type Checking**: `tsc --noEmit` - TypeScript compilation without emitting files
- **Linting**: `next lint` - ESLint with Next.js configuration
- **Formatting**: `prettier --write .` - Format all files with Prettier
- **Format Check**: `prettier --check .` - Check formatting without changing files

## Git Commands
```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "description"

# Push changes
git push

# Pull latest changes
git pull
```

## System Commands (Linux)
```bash
# List directory contents
ls -la

# Change directory
cd <directory>

# Find files
find . -name "*.tsx" -type f

# Search in files
grep -r "pattern" src/

# Remove node_modules
rm -rf node_modules

# Clean install
rm -rf node_modules package-lock.json && npm install
```