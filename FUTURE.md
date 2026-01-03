# Future Enhancements

This document tracks future feature ideas and improvements for Vörsight.

## Logging & Monitoring

### Selective Log Centralization
**Priority**: Medium  
**Status**: Proposed

Implement selective server-side log centralization to enable remote debugging without overwhelming the server with log data.

**Approach**:
- Add filtered Serilog sink that sends only Warning level and above to server
- Keep Debug/Info logs local only (3-day retention)
- Benefits:
  - Remote debugging without physical/remote access
  - Correlate client and server logs
  - Alert on error patterns across fleet
  - Historical analysis even if local logs deleted
- Considerations:
  - Privacy: Logs may contain sensitive paths/usernames
  - Storage: Need server-side log retention policy
  - Bandwidth: Only critical events to minimize overhead

**Related**: Already centralizing audit events and session summaries successfully.

## [Add future sections as needed]
