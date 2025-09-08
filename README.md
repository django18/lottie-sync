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

**Hosting URL**: _[Will be added when deployed]_

## 🏗️ Architecture Overview

This application uses a **hierarchical state machine architecture** with XState to manage complex synchronization across multiple animation players.

### Key Components

- **Enhanced Application Machine** - Main orchestrator
- **Sync Machine** - Animation loading and synchronization
- **Player Machine** - Individual player lifecycle management
- **React Components** - UI presentation layer

### Current Capabilities

- ✅ **1-4 players** synchronized at 60fps
- ✅ **Basic error recovery** with retry logic
- ✅ **Memory management** with proper cleanup
- ✅ **Performance monitoring** via console logging

## 📚 Documentation

### For Different Roles

**🏗️ Architects & Senior Developers**

- **[Architecture Decision Record](./docs/ARCHITECTURE.md)** - Complete design rationale and technical decisions
- **[Scaling Strategies](./docs/SCALING_STRATEGIES.md)** - How to scale from 10 to 200+ players

**👨‍💻 Developers**

- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Practical patterns, testing, and best practices
- **[Technical Reference](./docs/STATE_MACHINE_REFERENCE.md)** - Detailed state machine documentation

**👨‍💼 Product Managers**

- **[Current State & Improvements](./docs/CURRENT_STATE_AND_IMPROVEMENTS.md)** - Honest assessment and roadmap

**🧪 QA Engineers**

- **[Technical Reference](./docs/STATE_MACHINE_REFERENCE.md)** - Event flows and testing scenarios

### Quick Navigation

- **Getting Started**: This README + [Developer Guide](./docs/DEVELOPER_GUIDE.md)
- **Understanding Architecture**: [Architecture Decisions](./docs/ARCHITECTURE.md)
- **Implementation Details**: [Technical Reference](./docs/STATE_MACHINE_REFERENCE.md)
- **Scaling Plans**: [Scaling Strategies](./docs/SCALING_STRATEGIES.md)
- **Current Limitations**: [State & Improvements](./docs/CURRENT_STATE_AND_IMPROVEMENTS.md)

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

_See [Scaling Strategies](./docs/SCALING_STRATEGIES.md) for detailed technical roadmap._

## 🤝 Contributing

1. Read the [Developer Guide](./docs/DEVELOPER_GUIDE.md) for development patterns
2. Check [Architecture Decisions](./docs/ARCHITECTURE.md) to understand design choices
3. Follow existing code patterns and state machine conventions
4. Add tests for new functionality
5. Update documentation for architectural changes

## 📄 License

MIT License - See LICENSE file for details.

---

**Need Help?**

- Architecture questions → [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Development help → [DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)
- Performance concerns → [SCALING_STRATEGIES.md](./docs/SCALING_STRATEGIES.md)
- Current limitations → [CURRENT_STATE_AND_IMPROVEMENTS.md](./docs/CURRENT_STATE_AND_IMPROVEMENTS.md)
