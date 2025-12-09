# User Testing Report - WaitLess App

## Participant Observations

### Participant 1

He got through login and the list view without issues, quickly picking out three venues. Things fell apart when they switched to map view though—the map was just empty. They sat there for a few seconds looking confused, then started zooming around trying to figure out where everything went. Eventually they zoomed out and found the markers, but it wasn't obvious that zoom level was the problem.He expected the map to show the same venues they just saw in the list, but the interface didn't make it clear that zoom affects what's visible.

Later, when looking at venue details, he seemed skeptical about the wait times. In the debrief they said: "I saw '15 minutes' but I didn't know if that was from 5 minutes ago or an hour ago." The app shows wait times but no timestamps, so there's no way to tell how fresh the data is. He wanted to trust the numbers but couldn't without knowing when they were last updated. He did like the vibe categories, as the structured options for crowd density and noise level made sense to them.

### Participant 2

He breezed through the first few tasks but hit a wall when trying to submit a wait time report. They kept looking around the venue detail page for a "Report Wait Time" button. After about 45 seconds of scanning, they finally found it tucked away somewhere less obvious.

The bigger problem was the geofence verification. He filled out the wait time form and hit submit, then got hit with a location verification error. They were confused because they were looking at the venue's page, so they assumed the app knew they were there. In the debrief: "I thought since I could see the venue's page, the app knew I was there." The app never explained that you need to actually be within 100 meters, and the error message didn't help either. He got frustrated and gave up on reporting until we stepped in to explain.

He was really good at comparing venues and making decisions once they had the info. They liked the peak time forecast but said it was hard to find and should be easier to find when planning.


## Flaws and Opportunities for Improvement

### 1. Map View Zoom Level and Venue Visibility

Venues disappear or become invisible at certain zoom levels in map view, creating confusion when users switch from list view expecting to see the same venues.

- Add a zoom indicator or hint when venues are clustered: "Zoom in to see individual venues" or "X venues in this area"
- Implement a "Fit to Venues" button that automatically adjusts zoom to show all venues from the current list view
- Consider showing venue count badges on map clusters that match the list view count
- Add a brief onboarding tooltip on first map view explaining zoom behavior

### 2. Missing Context for Real-Time Data

Wait times and other metrics are displayed without timestamps, causing users to question data freshness and reliability.

- Add "Last updated: X minutes ago" labels next to each metric
- Use color coding or visual indicators (e.g., green for 5 min, yellow for 5-15 min, gray for 15 min) to signal data freshness
- Consider showing the number of recent reports contributing to the metric (e.g., "Based on 3 reports in the last 30 minutes")
- Add a "Data Freshness" indicator in the venue detail header

### 3. Reporting Feature Discoverability

Users struggle to locate the reporting functionality on venue detail pages, spending significant time searching for how to submit wait time or vibe reports.

- Add prominent "Report Wait Time" and "Report Vibe" buttons in the venue detail header or as floating action buttons
- Use visual hierarchy to make reporting actions stand out (larger buttons, contrasting colors)
- Consider a tab-based layout with "Overview" and "Report" tabs, making reporting equally accessible
- Add a brief onboarding prompt on first venue detail view: "Help others by reporting wait times and vibe"

### 4. Geofence Verification
Users don't understand that physical proximity is required for reporting, leading to confusion and frustration when location verification fails.

- Add a clear explanation before the reporting form: "You must be within 100 meters of this venue to submit a report. We'll verify your location when you submit."
- Show a location status indicator: "You're 250m away - get closer to report" or "You're at this venue - ready to report"
- Improve error messages to be educational: "Location verification failed. You need to be within 100 meters of [Venue Name] to submit a report. This helps ensure accurate, real-time data."
- Consider a "Check Location" button that users can click before filling out the form to verify proximity

