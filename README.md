# Lottie Multi-Player Sync

A React application for synchronizing multiple Lottie animation players with frame-perfect precision. Built with XState for robust state management and designed to scale from single-user demos to enterprise deployments.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation & Development

```bash
# Clone and install
git clone <repository-url>
cd lottie-sync-app
npm install

# Start development server
npm run dev
# Opens at http://localhost:5173

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

### Using the Application

1. **Upload Lottie files** - Drag & drop `.lottie` or `.json` files
2. **Add players** - Click "Add Player" to create DotLottie instances
3. **Select animation** - Choose a file from the uploaded list
4. **Control playback** - Use global controls to sync all players
5. **Monitor performance** - View real-time sync metrics

**🌐 Live Demo**: [https://lottie-sync-ek1r14w6g-avinash-dangis-projects.vercel.app/](https://lottie-sync-ek1r14w6g-avinash-dangis-projects.vercel.app/)

## 🏗️ Architecture Overview

This application uses a **hierarchical state machine architecture** with XState to manage complex synchronization across multiple animation players.

### Key Components

- **Enhanced Application Machine** - Main orchestrator
- **Sync Machine** - Animation loading and synchronization
- **Player Machine** - Individual player lifecycle management
- **React Components** - UI presentation layer

### Current Capabilities

- ✅ **1-10 players** synchronized at 60fps
- ✅ **Basic error recovery** with retry logic
- ✅ **Memory management** with proper cleanup
- ✅ **Performance monitoring** via console logging

## 📚 Technical Documentation

**Complete technical documentation for recruiting teams and engineers:**

**[docs/TECHNICAL_OVERVIEW.md](./docs/TECHNICAL_OVERVIEW.md)**

This comprehensive document covers:

- **Architecture Overview** - XState-based state machine architecture with 3 active machines
- **State Machine Diagrams** - Visual mermaid diagrams for all state machines
- **Scaling Strategy** - Detailed roadmap for scaling from 10 to 200+ players
- **Performance Analysis** - Current bottlenecks, tradeoffs, and optimization strategies
- **Implementation Details** - Master-slave synchronization, error recovery, resource management
- **Migration Roadmap** - Phase-by-phase scaling implementation plan

### Key Technical Highlights

- **Current Capacity**: 10 synchronized Lottie players with 60fps frame-perfect sync
- **Architecture**: Hierarchical state machines with master-slave synchronization
- **Performance**: <20ms sync latency (up to 5 players), degrades to ~50ms at 10 players
- **Scaling Potential**: Roadmap to 200+ players through Web Workers and distributed architecture

## 🔧 Technical Stack

**Core Technologies**

- React 19 + TypeScript + Vite
- XState 5 (state management)
- Tailwind CSS (styling)
- @lottiefiles/dotlottie-web (player)

**Development Tools**

- Vitest (testing)
- ESLint + Prettier (code quality)
- TypeScript strict mode

## 📈 Performance Characteristics

**Current Implementation**

- **Player Limit**: 10 players (can be extended)
- **Sync Latency**: 16.67ms (60fps) with throttling
- **Memory Usage**: ~10-50MB per player
- **Error Recovery**: Basic retry logic (max 3 attempts)

**Known Limitations**

- No adaptive performance optimization
- Console-based logging (not production-ready)
- Dual app architecture (App.tsx vs AppSync.tsx)
- Fixed sync thresholds

## 🛣️ Roadmap

### Immediate (1-2 weeks)

- Remove 10-player hard limit
- Add structured logging
- Consolidate app architecture

### Short-term (1-2 months)

- Implement adaptive sync throttling
- Add comprehensive error recovery
- Web Worker integration for 25-50 players

### Long-term (3-6 months)

- Distributed architecture for 50-200 players
- Network synchronization
- Enterprise monitoring and analytics

_See [Technical Overview](./docs/TECHNICAL_OVERVIEW.md) for detailed technical roadmap._

## 🤝 Contributing

1. Read the [Technical Overview](./docs/TECHNICAL_OVERVIEW.md) for architecture and development patterns
2. Follow existing code patterns and state machine conventions
3. Add tests for new functionality
4. Update documentation for architectural changes

## 📄 License

MIT License - See LICENSE file for details.

---

**Need Help?**

- **All technical questions** → [docs/TECHNICAL_OVERVIEW.md](./docs/TECHNICAL_OVERVIEW.md)
