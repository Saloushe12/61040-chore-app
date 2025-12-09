# Development Plan

**Team: Guangdong Tigers**  
Jonathan Zhao, Dylan Yu, Stephen Lee, Anna Kaganov

## Feature Delivery Timeline

### Alpha Checkpoint

**Features**:
- Basic user authentication (login/signup)
- Simple venue list view with location data
- Basic wait time reporting (user input)
- Simple data persistence (database setup)
- Basic map view showing venue locations

### Beta Checkpoint

**Features**:
- Real-time feed of wait time updates (Socket.io WebSocket integration)
- Venue profiles with location, hours, and current metrics (wait times, crowd density, vibe levels)
- Crowd density reporting (via VibeReport with low/medium/high levels)
- Vibe level reporting (noise: chill/moderate/loud, energy: low/medium/hype, music tags)
- Filter venues by basic categories (tags filtering)
- Push notification infrastructure (alert subscriptions with conditions for wait times, crowd density, and events)
- Heat map visualization (backend implemented in src-new architecture, frontend integration pending)
- User profile and contribution history (report history tracking)
- Geofence verification for report authenticity (100m radius)
- Peak time forecasting (basic algorithm with historical data)
- Event filtering and venue events display (create, update, cancel events)
- Suggested venues (closest + trending venues based on activity)
- Data aggregation (30-minute time windows for metrics)
- Real-time venue updates via WebSocket (status changes, new reports)
- Venue creation and management
- Venue status updates

### User Testing

**Features**:
- Push alerts for wait time changes (enhancement of notification infrastructure)
- Anonymous reporting option
- Location privacy controls
- Performance optimization
- Bug fixes from testing

### Full Demo

**Features**:
- All features polished and working
- Improved peak forecast with historical data
- Advanced filtering options
- Enhanced heat map with activity data
- UI/UX refinements
- Demo presentation materials


### Project Report

**Features**:
- Technical documentation
- User testing results and analysis
- Architecture diagrams
- Deployment guide
- Reflection on development process

## Team Member Responsibilities

### Jonathan Zhao
- **Primary Focus**: Real-time systems, notifications, authentication
- **Key Tasks**:
  - User authentication and authorization system
  - Real-time update infrastructure (WebSockets/polling)
  - Push notification service integration
  - Backend API development for notifications

### Dylan Yu
- **Primary Focus**: Database design, data analytics, filtering
- **Key Tasks**:
  - Database schema design and optimization
  - Data persistence layer
  - Venue profile management system
  - Peak time prediction algorithm development
  - Event filtering and search functionality

### Stephen Lee
- **Primary Focus**: Maps, visualization, privacy features
- **Key Tasks**:
  - Map integration (Google Maps)
  - Heat map visualization
  - Location services and geocoding
  - Privacy controls (location blurring, anonymization)
  - Performance optimization for maps

### Anna Kaganov
- **Primary Focus**: User interface, user experience, testing
- **Key Tasks**:
  - UI/UX design and implementation
  - Wait time reporting interfaces
  - User profile management UI
  - Real-time feed display
  - User testing coordination and analysis
  - Bug tracking and QA

## Key Risks and Mitigation Strategies

### Risk 1: Real-Time Data Accuracy and Spam Prevention
**Risk**: Users may submit false wait times or spam reports, making the app unreliable.

**Mitigation**:
- Implement reputation system where frequent accurate reporters gain more weight
- Require location verification when submitting reports
- Use voting/consensus mechanism where multiple reports at similar times validate each other
- Add time-based decay to reports (older reports less relevant)
- Implement rate limiting on submissions per user

**Fallback Option**: 
- If spam becomes unmanageable, switch to venue-verified data only or require minimum reputation score before reports are visible
- Implement manual moderation queue for suspicious reports

### Risk 2: Real-Time Infrastructure Complexity
**Risk**: Building real-time update system with WebSockets may be technically challenging within timeline.

**Mitigation**:
- Start with simple polling mechanism first (refresh every 30 seconds)
- Use established real-time service rather than building from scratch
- Prioritize basic real-time feed in Beta, enhance in later stages

**Fallback Option**:
- Use polling instead of WebSockets if real-time infrastructure proves too complex
- Accept slightly delayed updates (30-60 second refresh) if full real-time is not feasible

### Risk 3: Peak Prediction Algorithm Accuracy
**Risk**: Historical pattern analysis for peak time prediction may not be accurate enough or require extensive data.

**Mitigation**:
- Start with simple heuristics (day of week, time of day)
- Use publicly available data (Google Popular Times if accessible) as baseline
- Implement basic pattern matching on collected data with clear confidence thresholds
- Document that accuracy improves as more data is collected

**Fallback Option**:
- Remove peak prediction feature if algorithm proves unreliable
- Replace with simpler "typical busy times" based on venue-provided information
- Show current status more prominently than predictions

### Risk 4: Map API Costs and Rate Limits
**Risk**: Google Maps APIs may have usage limits or costs that exceed budget.

**Mitigation**:
- Research free tier limits for map services early
- Implement caching for map tiles and venue locations
- Use open-source mapping alternatives if available
- Optimize map rendering to minimize API calls
- Monitor API usage throughout development

**Fallback Option**:
- Switch to alternative mapping library
- Use static map images instead of interactive maps if necessary
- Limit map features to essential functionality only

### Risk 5: Insufficient User Data for Meaningful Insights
**Risk**: New app may lack enough users to provide useful real-time data and patterns.

**Mitigation**:
- Allow venues to submit their own data as primary source
- Seed app with sample/demo data for testing and demo purposes
- Design features to be useful even with minimal user base (venue-verified data)
- Implement features that work well with even 1-2 reports per venue

**Fallback Option**:
- Focus demo on venue-verified data model
- Use simulated data to demonstrate full features during presentation
- Emphasize potential value when user base grows
