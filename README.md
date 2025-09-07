# Multi-Player Lottie Synchronization Tool

A sophisticated single-page application for synchronizing multiple Lottie animation players with advanced state management, scalable architecture, and real-world performance optimizations.

## 🚀 Features

### Core Functionality
- **Multi-Player Support**: DotLottie, LottieWeb, and Skottie (with CanvasKit) players
- **Synchronized Playback**: Frame-perfect synchronization across all players
- **Dual Sync Modes**: Global synchronization or individual player control
- **File Format Support**: Both .lottie and .json Lottie files
- **Drag & Drop Upload**: Intuitive file management with validation
- **Real-time Controls**: Play, pause, stop, seek, speed control, and loop toggle

### Advanced Architecture
- **XState Actor Model**: Hierarchical state machines for complex state management
- **Performance Monitoring**: Frame rate tracking, sync latency measurement, drift detection
- **Error Resilience**: Comprehensive error boundaries with graceful degradation
- **Memory Optimization**: Proper cleanup and disposal of player instances
- **Scalable Design**: Architecture supports 10+ concurrent players

## 🛠️ Technical Stack

- **Frontend**: React 19 + TypeScript + Vite
- **State Management**: XState 5 with React integration
- **Styling**: Tailwind CSS with custom design system
- **Player Libraries**: @lottiefiles/dotlottie-web, lottie-web
- **File Handling**: react-dropzone with validation
- **Testing**: Vitest + Testing Library + jsdom
- **Development**: ESLint, Prettier, TypeScript strict mode

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run linting
npm run lint
```

## 🏗️ Project Structure

```
src/
├── components/          # React UI components
├── hooks/              # Custom React hooks
├── machines/           # XState machine definitions
├── services/           # Player integrations and sync services
├── types/             # TypeScript definitions
└── styles/            # Tailwind configurations
```

## 🎯 Usage

### Basic Usage
1. **Upload Files**: Drag and drop .lottie or .json files into the upload area
2. **Add Players**: Click "Add Player" and select player type (DotLottie, LottieWeb, Skottie)
3. **Select Animation**: Choose a file from the uploaded files list
4. **Control Playback**: Use global controls to synchronize all players

### Advanced Features
- **Sync Modes**: Toggle between "Global Sync" and "Individual" control modes
- **Performance Monitoring**: View real-time frame rate and sync metrics
- **Error Recovery**: Automatic retry for failed player initialization
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🔧 Architecture Deep Dive

### XState Machine Architecture

The application uses a sophisticated hierarchical state machine architecture with separate actors for each concern:

- **Application Machine**: Global state and file uploads
- **Player Machines**: Individual player lifecycle management
- **Sync Coordinator**: Master/slave synchronization with drift correction
- **File Manager**: Validation, processing, and storage

### Performance Optimizations

1. **Frame Rate Adaptation**: 60fps target, degrades to 30fps under load
2. **Batch Updates**: Minimizes React re-renders
3. **Memory Management**: Proper cleanup and disposal
4. **Lazy Loading**: Players initialized on demand
5. **Sync Threshold**: Configurable drift tolerance (16.67ms)

## 🧪 Testing & Development

- **Unit Tests**: Components and services
- **Integration Tests**: State machine transitions  
- **Performance Tests**: Sync accuracy benchmarks
- **Development Server**: http://localhost:5173/

## 📈 Performance Benchmarks

- **Sync Accuracy**: <16ms drift between players
- **Memory Usage**: <50MB for 4 concurrent players
- **Bundle Size**: ~400KB gzipped
- **Startup Time**: <2s to interactive

## 🔮 Architecture Decisions

See [CHANGELOG.md](./CHANGELOG.md) for detailed architectural decisions, trade-offs, and implementation rationale.

## 📜 License

MIT License - See LICENSE file for details.
