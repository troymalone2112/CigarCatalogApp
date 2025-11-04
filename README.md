# 🚬 Cigar Catalog App

An AI-powered mobile app for cigar enthusiasts to identify, catalog, and track their cigar experiences using ChatGPT for recognition and Perplexity for detailed information retrieval.

## 🌟 Features

### 📸 AI-Powered Cigar Recognition

- Take photos of cigars for instant identification
- ChatGPT analyzes images to identify brand, line, and specific cigars
- Perplexity API fetches detailed cigar information in real-time
- High-confidence recognition with alternative suggestions

### 📦 Digital Humidor Management

- Track your cigar inventory with quantities and locations
- Add cigars directly from recognition results
- Sort and filter by brand, quantity, or purchase date
- Visual inventory cards with cigar details

### 📖 Smoking Journal

- Record detailed smoking experiences
- Rate cigars on multiple dimensions (construction, draw, flavor, complexity)
- Add personal notes, settings, and pairings
- Photo documentation of smoking sessions

### 🎯 Personalized Recommendations

- AI analyzes your preferences and journal entries
- Suggests new cigars based on your taste profile
- Match confidence scores with detailed explanations
- Discover cigars you'll love

## 🛠 Technology Stack

- **Frontend**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation 6
- **Storage**: AsyncStorage for local data persistence
- **Camera**: Expo Camera for photo capture
- **AI Services**:
  - OpenAI ChatGPT API for image recognition
  - Perplexity API for cigar data retrieval
- **Icons**: Expo Vector Icons

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for development)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CigarCatalogApp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:

   ```
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   EXPO_PUBLIC_PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

4. **Start the development server**

   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 🔑 API Keys Setup

### OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Add to your `.env` file

### Perplexity API Key

1. Visit [Perplexity AI](https://www.perplexity.ai/)
2. Sign up for API access
3. Generate an API key
4. Add to your `.env` file

## 📱 App Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # App screens
│   ├── HomeScreen.tsx
│   ├── CigarRecognitionScreen.tsx
│   ├── InventoryScreen.tsx
│   ├── JournalScreen.tsx
│   └── ...
├── services/           # API services
│   └── apiService.ts
├── storage/            # Local storage utilities
│   └── storageService.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── utils/              # Utility functions
```

## 🎨 Design System

The app uses a warm, tobacco-inspired color palette:

- Primary: `#8B4513` (Saddle Brown)
- Secondary: `#A0522D` (Sienna)
- Accent: `#D2B48C` (Tan)
- Background: `#f8f9fa` (Light Gray)

## 📊 Data Models

### Cigar

- Brand, line, name, size
- Tobacco details (wrapper, filler, binder, origins)
- Strength level and flavor profile
- Smoking experience by thirds

### Inventory Item

- Cigar reference
- Quantity and location
- Purchase information
- Personal notes

### Journal Entry

- Cigar reference
- Multi-dimensional ratings
- Personal notes and context
- Date and setting information

## 🔒 Privacy & Data

- All data stored locally on device
- No personal information sent to third parties
- API calls only include cigar images and search queries
- Users maintain full control of their data

## 🚧 Development Status

### ✅ Completed

- [x] Project setup and navigation
- [x] Camera integration
- [x] ChatGPT API integration
- [x] Perplexity API integration
- [x] Local storage system
- [x] Core UI screens
- [x] Inventory management

### 🚧 In Progress

- [ ] Journal entry forms
- [ ] Detailed cigar information screens
- [ ] Recommendation engine
- [ ] Settings and preferences

### 📋 Planned Features

- [ ] Data export/import
- [ ] Offline mode
- [ ] Social sharing
- [ ] Advanced search and filters
- [ ] Cigar collection statistics
- [ ] Wishlist functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for ChatGPT API
- Perplexity AI for search capabilities
- Expo team for excellent development tools
- React Native community for comprehensive documentation

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Happy Smoking! 🚬**
