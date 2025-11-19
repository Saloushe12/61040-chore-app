# concept: User
## purpose
identify patrons and venue operators
## principle
every user has a role and may optionally share location information
## state
### a set of Users with
- id  
- role (patron | venue_operator)  
- displayName (optional)  
- homeArea (optional)  
- createdAt  
- lastActiveAt  
## actions
### register(displayName, role): (userId)
effect: creates a new User
### updateProfile(userId, displayName?, homeArea?)
effect: updates optional profile info
## notes
- No reputation score is stored.  
- Users may submit reports without persistent identity; pseudonyms allowed.  
- Location is never stored beyond what is needed for geofence verification.  

# concept: Venue
## purpose
represent nightlife locations and their operational status
## principle
a venue’s profile and status reflect accurate, operator-controllable information
## state
### a set of Venues with
- id  
- name  
- location (lat, lon)  
- address  
- hours  
- tags  
- currentStatus (open | closed | door_hold)  
- staticAttributes (cover charge, accessibility, minAge, etc.)  
- operatorUserId (optional)
## actions
### createVenue(name, location, address, hours, tags, staticAttributes): (venueId)
effect: registers a new venue
### claimVenue(venueId, operatorUserId)
requires: operatorUserId is a User with role = venue_operator  
effect: assigns control of a venue to an operator
### updateVenueProfile(venueId, fieldsToUpdate)
effect: updates basic venue metadata
### updateVenueStatus(venueId, status)
effect: sets currentStatus for real-time operational control
## notes
- Operator assignment is optional; venues may exist unclaimed.  
- Only aggregated location data is exposed to patrons.  

# concept: VenueEvent
## purpose
describe events occurring at a venue
## principle
venue events help users discover specific activities that shape venue atmosphere
## state
### a set of VenueEvents with
- id  
- venueId  
- title  
- description  
- startTime  
- endTime  
- tags  
- createdBy  
- status (scheduled | cancelled | in_progress)
## actions
### createVenueEvent(venueId, title, description, timeRange, tags): (eventId)
effect: creates a new event
### updateVenueEvent(eventId, fieldsToUpdate)
effect: edits event details
### cancelVenueEvent(eventId)
effect: marks an event as cancelled
### markEventInProgress(eventId)
effect: marks an event as currently active
## notes
- Event tags support filtering.  
- User-created and operator-created events share the same format.  

# concept: WaitReport
## purpose
provide crowdsourced wait times and check-in confirmations
## principle
each user may report wait time once per visit; the system aggregates reports
## state
### a set of WaitReports with
- id  
- venueId  
- userId  
- reportedWaitMinutes  
- createdAt  
- source (user | venue_override)  
- geofenceVerified (bool)
## actions
### submitWaitReport(userId, venueId, reportedWaitMinutes, geofenceVerified): (reportId)
effect: creates a new wait time report
### submitVenueWaitOverride(operatorUserId, venueId, waitMinutes): (reportId)
effect: allows operator to override or supplement wait time
## notes
- This replaces the old “presence” and “wait” concepts: check-in and wait submission happen together.  
- Geofence verification uses W3C Geolocation API distance checks.  
- Only one wait report per user per venue per night; this constraint is enforced elsewhere.  

# concept: VibeReport
## purpose
capture structured, frequently updated atmosphere data
## principle
vibe is dynamic and may be updated many times during a visit
## state
### a set of VibeReports with
- id  
- venueId  
- userId  
- crowdDensity (low | medium | high)  
- noiseLevel (chill | moderate | loud)  
- energyLevel (low | medium | hype)  
- musicTags  
- createdAt  
- geofenceVerified (bool)
## actions
### submitVibeReport(userId, venueId, fields, geofenceVerified): (reportId)
effect: creates a new vibe report
## notes
- Structured categories reduce subjective or harmful descriptors.  
- Geofencing must be confirmed before accepting vibe reports.  

# concept: AlertSubscription
## purpose
allow users to receive notifications when venue conditions change
## principle
alerts notify users when relevant conditions (wait, vibe, events) match preferences
## state
### a set of AlertSubscriptions with
- id  
- userId  
- venueId  
- condition (waitBelowMinutes?, crowdDensityIn?, eventTag?)  
- createdAt  
- active
## actions
### createAlertSubscription(userId, venueId, condition): (subscriptionId)
effect: creates an alert subscription
### updateAlertSubscription(subscriptionId, condition)
effect: changes alert criteria
### deactivateAlertSubscription(subscriptionId)
effect: disables a subscription
### triggerAlertsForVenue(venueId, newAggregates)
system action  
effect: identifies subscriptions whose conditions are met
## notes
- Notification delivery uses simple in-browser audio + visual pop-ups.  
- No push notifications; no background service worker required.  

# concept: VenueStatsSnapshot
## purpose
retain periodic aggregate stats for historical analysis and forecasting
## principle
snapshots give venues and users insight into typical patterns and peaks
## state
### a set of VenueStatsSnapshots with
- id  
- venueId  
- timestamp  
- avgReportedWait  
- avgCrowdDensity  
- reportCount  
- derivedPeakScore
## actions
### recordStatsSnapshot(venueId, aggregates): (snapshotId)
effect: saves current aggregated values
### recomputePeakScores(venueId)
effect: processes historical snapshots into predicted peak times
## notes
- Stored at coarse granularity (e.g., every 15 minutes).  
- Forecasting is simple: rolling averages or bucket analysis.  

# sync: NearbyVenuesSync
## when
Request.getNearbyVenues(userLocation)  
## then
returns venues with aggregated wait, vibe, and event information  
## notes
- Aggregations incorporate only geofence-verified reports.  

# sync: VenueDetailSync
## when
Request.getVenueDetail(venueId)  
## then
returns venue profile, live metrics, events, historical snapshots  
## notes
- Report lists are anonymized and batched.  

# sync: EventFilterSync
## when
Request.filterByEvent(eventTag, timeRange)  
## then
returns venues and events matching the tag  
## notes
- Useful for “what’s happening tonight?” scenarios.  

# sync: HeatmapSync
## when
Request.getHeatmap(areaBounds)  
## then
returns activity scores per grid cell  
## notes
- Heatmaps derived from geofence-verified WaitReports and VibeReports only.  
- Helps avoid spoofed “fake crowded areas.”  

# sync: UserAlertsSync
## when
Request.getUserAlerts(userId)  
## then
returns user’s alert subscriptions  
## notes
- Used to render the alerts UI.  

# sync: PeakForecastSync
## when
Request.getPeakForecast(venueId)  
## then
returns predicted peak hours based on VenueStatsSnapshots  
## notes
- Forecasting uses simple bucket averaging.  

# sync: VenueDashboardSync
## when
Request.getVenueDashboard(operatorUserId)  
## then
returns managed venues with live stats and events  
## notes
- Operators see only aggregated reports; no raw user data.  

# sync: UserContributionHistorySync
## when
Request.getContributionHistory(userId)  
## then
returns user’s WaitReports and VibeReports  
## notes
- Reinforces transparency and user trust.

