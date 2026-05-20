# Security Specification: Resume Intelligence Engine

## Data Invariants
- An analysis must belong to a specific user (`userId`).
- Users can only read and write their own data.
- User IDs must be valid alphanumeric strings.
- Timestamps must be strictly enforced using server time.

## The Dirty Dozen (Attacker Payloads)
1. **Identity Theft**: User A tries to read User B's analysis at `/analyses/B_ANALYSIS_ID`.
2. **Analysis Spoofing**: User A tries to write an analysis with `userId: "UserB"` to access it as User B.
3. **Ghost Field Injection**: User A adds `isAdmin: true` to their user document.
4. **ID Poisoning**: User A uses a 2MB string as an `analysisId`.
5. **Timestamp Manipulation**: User A sets `createdAt` to "2020-01-01" to bypass sorting.
6. **Orphaned Writes**: User A tries to create an analysis without a valid matching user record.
7. **Cross-User Updates**: User A tries to update User B's competency feedback.
8. **Shadow Keys**: User A adds `hiddenMetadata: "malicious"` to an analysis during update.
9. **Role Escalation**: User A tries to change their `role` in an analysis they don't own.
10. **Resource Exhaustion**: Sending an array of 100,000 dummy candidates.
11. **Bulk Deletion**: Attempting to list and delete all analyses in the collection.
12. **PII Leak**: An unauthenticated user tries to fetch `/users/{anyId}`.

## Test Runner (Logic Verification)
These cases will be verified in `firestore.rules`.
