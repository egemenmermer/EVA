# EVA - Ethical Virtual Assistant Frontend

Frontend application for the EVA ethical AI project.

## New Dependencies for Admin Analytics

The admin analytics dashboard uses the following visualization libraries:

- **chart.js**: JavaScript charting library that supports various chart types
- **react-chartjs-2**: React components for Chart.js

These dependencies must be installed in both development and production environments.

### Installation

```bash
# Install dependencies
npm install chart.js react-chartjs-2 --save
```

### Docker Deployment

The Chart.js dependencies are included in the package.json and will be automatically installed during the Docker build process.

## Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build
```

## Admin Analytics Features

The admin analytics dashboard provides:
- Overview of practice session metrics
- Visualization of manager type distribution
- Average score by manager type
- Detailed session logs
- Export capabilities for reports

## Project Structure

- `src/components/` - Reusable UI components
- `src/pages/` - Page components for different routes
- `src/services/` - API services and data fetching
- `src/styles/` - CSS and styling files

## Technologies

- React
- TypeScript
- Material UI
- React Query
- React Router
