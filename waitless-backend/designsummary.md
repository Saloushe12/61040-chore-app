# Design Summary: WaitLess App

**Team: Guangdong Tigers**  
Jonathan Zhao, Dylan Yu, Stephen Lee, Anna Kaganov

## Overall Design Overview

WaitLess is a real-time urban nightlife location-based consumer information system that crowdsources wait times, crowd density, and venue atmosphere data. It addresses two interconnected problems: users' inability to make informed decisions about where to go, and venues' difficulty managing operations without real-time capacity data.

### How Concepts Work Together

Seven core concepts integrate to create an information ecosystem:

**Foundation**: `User` (patrons and venue_operators with minimal identity) and `Venue` (locations with operator-controllable profiles and real-time status) enable both self-reported and crowdsourced data.

**Data Collection**: `WaitReport` and `VibeReport` capture real-time data with geofence verification. Wait reports combine check-in with wait time submission; vibe reports use structured categories (crowd density, noise level, energy level, music tags) to replace subjective descriptors.

**Discovery & Engagement**: `VenueEvent` enables event discovery (trivia nights, live music, sports). `AlertSubscription` provides in-browser notifications when venue conditions match preferences.

**Analysis**: `VenueStatsSnapshot` captures periodic aggregates (every 15 minutes) enabling peak time forecasting through bucket averaging. Six sync operations aggregate geofence-verified reports for users while operators see only aggregated statistics, protecting privacy.

**Integration Cycle**: Users discover venues → contribute verified reports → aggregated data feeds back into discovery/alerts → historical snapshots enable predictions → operators receive insights. This ensures usefulness with minimal users while increasing value as contributions grow.

## Addressing Ethics Concerns

The design addresses three ethical concerns:

**Privacy**: No reputation scores stored (full anonymity/pseudonyms allowed); location data stored only for geofence verification; only aggregated snapshots retained long-term; operators see aggregated statistics only, never raw user data.

**Cultural Sensitivity**: Users can submit reports anonymously (pseudonyms allowed); location blurring/generalization possible (implementation deferred); all reporting is voluntary and opt-in.

**Values Alignment**: Privacy through minimal data collection and aggregated views; community through crowdsourced contributions and transparent history; informed decision-making through live wait times, structured vibe reports, and historical patterns.

**Additional Safeguards**: Structured categories (predefined options) reduce harmful descriptors; geofence verification prevents spoofing; no user movement tracking (only basic `lastActiveAt` analytics).

## Unclear Issues

Several implementation details require clarification:

1. **Reputation vs. Anonymity**: Development plan mentions reputation weighting, but concept design states "No reputation score stored." How to balance data quality with privacy without persistent identity?


2. **Spam Prevention**: Technical enforcement of "one report per user per venue per night" constraint; prevention of multi-account spamming; moderation systems; reconciliation of venue overrides with user reports.

3. **Peak Forecasting**: Time bucket specifications, required historical snapshots for forecasts, confidence thresholds, and day-of-week pattern incorporation.

4. **Location Privacy Controls**: Implementation status of location blurring feature; technical approach that maintains geofence verification; granularity options (exact/neighborhood/city).

5. **Data Aggregation**: Methods for aggregating wait times (mean/median/weighted); combining vibe reports; time windows for "current" metrics; resolution of conflicting reports.

6. **Operator Claiming**: Verification process for operators claiming venues; handling of fraudulent operators; status of unclaimed venues.

7. **Alert Implementation**: Polling frequency; app-open requirements; alert condition evaluation mechanisms.

8. **Data Retention**: Storage duration for individual reports vs. snapshots; user deletion capabilities.

9. **Heatmap Specifications**: Grid cell size; activity score calculation method; real-time vs. snapshotted updates.

## Conclusion

The WaitLess design presents a privacy-conscious approach to solving real-time nightlife information challenges. Core concepts integrate well to benefit both patrons and venue operators, with explicit focus on privacy, anonymity, and ethical data handling. However, several implementation details remain unresolved, particularly around reputation/anonymity balance, geofence specifications, spam prevention, and data aggregation methods. These clarifications will be critical for implementation to ensure ethical principles are effectively realized.

