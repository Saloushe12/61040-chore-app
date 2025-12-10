Summary of Design Changes Since Original Proposal
Architecture shift: Moved from Mongoose to a concept-based architecture using the raw MongoDB driver. This aligns the implementation with the concept design and simplifies the data layer.
Enhanced user roles: Added explicit role selection (patron vs. venue operator) during registration, enabling clearer permission boundaries and operator workflows.
Expanded event creation: Patrons can create events, not just operators, improving discovery and filling gaps in venue-provided information.
Anonymous reporting: Implemented anonymous reporting with optional display names, addressing privacy concerns earlier than planned.
Spam prevention refinement: Changed from "one report per venue per night" to "one report per venue per 3 hours" to allow multiple visits while still preventing spam.
Venue management enhancements: Added operating hours display and editing, and venue profile editing for operators, improving venue information completeness.
Tag-based filtering: Added frontend tag filtering for venues, enabling discovery by category (bar, club, live music, etc.).
Heatmap completion: Fully implemented the heatmap visualization (backend was done; frontend integration completed).
Alert delivery simplification: Confirmed in-browser notifications only (no push notifications), reducing complexity while maintaining functionality.
Forecasting implementation: Implemented peak time forecasting using historical snapshots with day-of-week patterns, as specified in the concept design.
Removed reputation system: Aligned with the concept design's "no reputation score stored" principle, prioritizing privacy over reputation weighting mentioned in the development plan.