# One Identity Visit Access Management

## Functional Specification

### Purpose
The handler manages site and system access in One Identity based on visit creation, update and deletion events for science users.

### Process Overview
- When a visit is created, both site access and system access are provisioned in One Identity
- When a visit is updated, each access period is reconciled independently and missing active access records are created
- When a visit is deleted, both site access and system access are cancelled in One Identity
- Only science users (users with `CCC_EmployeeSubType === ESSSCIENCEUSER`) are processed

### Access Types
- **Site Access**: Physical access to facility for the exact visit duration
- **System Access**: Digital access to systems starting at the current time when provisioned, extending beyond the visit end date by a configurable number of days (default: 30)

### Key Relationships
- Both site and system access store the visit ID in `CustomProperty04`
- Both access types are identified by specific roles in `PersonWantsOrgRole` enum

## Process Flow Chart

```
┌─────────────────────────┐
│ Visit Event Received    │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ Login to One Identity   │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ Get Person from ID      │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
< Is Science User?        >──No──┐
└──────────┬──────────────┘      │
           Yes                   │
           ↓                     │
┌─────────────────────────┐      │
< Event Type?             >      │
└──────────┬──────────────┘      │
           │                     │
  ┌────────┴────────┐            │
  ↓                 ↓            │
┌─────────────┐ ┌───────────────┐│
│VISIT_CREATED│ │VISIT_DELETED  ││
└──────┬──────┘ └───────┬───────┘│
       │                │        │
       ↓                ↓        │
┌─────────────┐ ┌───────────────┐│
│Create Site  │ │Find Site      ││
│Access       │ │Access         ││
└──────┬──────┘ └───────┬───────┘│
       │                │        │
       ↓                ↓        │
┌─────────────┐ ┌───────────────┐│
│Create System│ │Cancel Site    ││
│Access       │ │Access         ││
└──────┬──────┘ └───────┬───────┘│
       │                │        │
       │                ↓        │
       │       ┌───────────────┐ │
       │       │Find System    │ │
       │       │Access via     │ │
       │       │CustomProperty4│ │
       │       └───────┬───────┘ │
       │               │         │
       │               ↓         │
       │       ┌───────────────┐ │
       │       │Cancel System  │ │
       │       │Access         │ │
       │       └───────┬───────┘ │
       │               │         │
       │               │         │
       └───────┐       │         │
               │       │         │
               │       │         │
               ↓       ↓         │
┌─────────────────────────┐      │
│ Logout from One Identity│◄─────┘
└─────────────────────────┘
```

## Key Implementation Details

### Timezone Configuration
- Set `TZ=Europe/Stockholm` in the dedicated OIM connector service/container environment before starting Node, or in its `.env` file

### System Access Duration
- Extends beyond visit by `ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS` (default: 30 days)

### Access Creation
- Site access starts at local midnight on the visit start date and ends at local midnight after the visit end date, covering both visit days in full
- System access starts at the current instant when provisioned, serialized as a UTC ISO timestamp without rounding to midnight; it ends at local midnight after the visit end date plus the configured calendar-day extension (default: 30)
- Site and system access share the visit ID in `CustomProperty04`

### Access Updates
- Access records are matched by role and visit ID in `CustomProperty04`; both `Aborted` and `Unsubscribed` records are excluded
- Site access is updated only when its local-day start or end boundary differs from the visit's required validity
- System access is updated only when its expiry differs from local midnight after the visit end date plus the configured calendar-day extension; its start is set to the current instant when that update is processed
- The system start time is not compared against the current time; a correct existing system expiry preserves the original start, even if site access needs updating
- Missing active site or system access is created independently, without recreating the other access
- Both access periods must match before all access writes are skipped, allowing retries to repair system access after a successful site write followed by a failed system write

### Daily Allowance Synchronization
- Allowance eligibility requires both `request_daily_allowance` and `daily_allowance_is_approved` to be boolean `true`
- Visit creation upserts an eligible allowance; otherwise it skips allowance synchronization
- Visit updates treat the current registration answers as the authoritative state: upsert an eligible allowance, otherwise issue an idempotent delete by visitor and visit ID, even when visit dates are unchanged
- Missing answers or missing approval/request values are treated as ineligible on updates; the previous allowance state is not required
- Visit deletion always issues an idempotent allowance delete regardless of the current answers, before cancelling visit access
- Approved PEJ allowance upserts send the visit's local start and end calendar dates as `YYYY-MM-DD`, on both visit creation and update
- PEJ's `GuestValidityFrom` and `GuestValidityTo` are inclusive and cover the full day in the organization's configured timezone; do not add a day to the allowance end date
- With `TZ=Europe/Stockholm`, a visit on 28–29 October 2026 has allowance validity `2026-10-28` through `2026-10-29`. Site access starts at `2026-10-27T23:00:00.000Z` and ends at `2026-10-29T23:00:00.000Z` (30 October at Swedish midnight)
- Allowance deletion continues to send empty date parameters

### Access Cancellation
- Site and system access are matched independently by role and visit ID
- All matching access records are cancelled, except those already `Aborted` or `Unsubscribed`
- Missing or already-cancelled access is treated as successful cleanup, so retries can finish partial deletions
- Actual API cancellation failures still propagate for retry

### Error Handling
- Proper error messages when person or access records are not found
- Always performs logout in finally block to ensure clean session management
- HTTP error logs include the request method, base URL and path, plus the response status, headers and full body (without request credentials)

---

## One Identity Proposal and Member Sync

### Purpose
The handler synchronizes proposal information and its members (proposer, co-proposers and data access users) with One Identity. This ensures that proposals and their associated personnel are accurately represented and connected in One Identity.

### Process Overview
- Triggered by `PROPOSAL_ACCEPTED` and `PROPOSAL_UPDATED` events.
- **Login**: Establishes a session with One Identity.
- **Proposal Retrieval/Creation**:
    - For both event types, it first attempts to retrieve the proposal (`ESet`) from One Identity using the proposal data.
    - If `PROPOSAL_ACCEPTED` event:
        - If the proposal does not exist, it creates the proposal in One Identity.
        - If creation fails, an error is thrown.
    - If `PROPOSAL_UPDATED` event:
        - If the proposal does not exist, the process logs this information and concludes, as there's no existing record to update.
- **User Synchronization**:
    - Collects all unique user OIDC sub identifiers from the proposal message (proposer, members and data access users).
    - Retrieves the corresponding `UID_Person` for these users from One Identity.
    - Logs an error if any users from the proposal message are not found in One Identity.
- **Connection Management**:
    - Fetches all existing `PersonHasESET` connections for the identified proposal (`UID_ESet`).
    - **Remove Old Connections**:
        - Identifies connections in One Identity for persons who are no longer part of the current proposal members/dataAccessUsers list.
        - Before removing a connection, it checks if the person has "site access" to the proposal (e.g., as a visitor).
        - If the person has site access, their connection to the proposal is *not* removed.
        - Otherwise, the outdated connection is removed.
    - **Add New Connections**:
        - Identifies persons in the current proposal members/dataAccessUsers list who are not yet connected to the proposal in One Identity.
        - Creates new `PersonHasESET` connections for these persons.
- **Logout**: Ensures logout from One Identity in a `finally` block, regardless of success or failure.

### Key Relationships
- **Proposals**: Mapped to `ESet` objects in One Identity.
- **Users**: (Proposers, members) are `Person` objects in One Identity, identified via their OIDC sub.
- **Connections**: The link between a `Person` and an `ESet` is represented by a `PersonHasESET` record.

### Process Flow Chart

```
┌─────────────────────────┐
│ Proposal Event Received │
│ (ACCEPTED/UPDATED)      │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ Login to One Identity   │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ Get Proposal (ESet)     │
│ from One Identity       │
└──────────┬──────────────┘
           │
┌──────────┴──────────┐
│ Event Type?         │
└────┬───────────┬────┘
     ↓           ↓
PROPOSAL_ACCEPTED  PROPOSAL_UPDATED
     │           │
┌────┴────────┐  │  ┌──────────────────────────┐
│ ESet Exists?│  No │ ESet Exists?             ├─No─┐
└──────┬───No─┘  │  └──────────┬───────────────┘    │
      Yes        │             Yes                  │
      │          │             │      ┌──────────────────────────┐
      │  ┌───────┴─────────┐   │      │ Log "Proposal not found  │
      │  │ Create ESet in  │   │      │ for update", Logout & Exit│
      │  │ One Identity    │   │      └──────────────────────────┘
      │  └───────┬─────────┘   │
      │          ↓             │
      │  ┌───────┴─────────┐   │
      │  │ ESet Created?   ├─No─┼───►Error: Creation Failed, Logout
      │  └───────┬─────────┘   │
      Yes        Yes           │
      └──────────┼─────────────┘
                 ↓
┌─────────────────────────────────┐
│ Get UIDs for all proposal users │
│ (proposer & members) via OIDC sub│
└────────────────┬────────────────┘
                 ↓
┌─────────────────────────────────┐
│ All users found in One Identity?├─No─►Log Error: Users Missing
└────────────────┬────────────────┘
                 Yes
                 ↓
┌─────────────────────────────────┐
│ Get existing PersonHasESET      │
│ connections for the ESet        │
└────────────────┬────────────────┘
                 │
┌────────────────┴────────────────┐
│ For each existing connection:   │
│ - Is person still in proposal?  │
│   No ─► Has person site access? │
│         No ─► Remove Connection │
└────────────────┬────────────────┘
                 ↓
┌─────────────────────────────────┐
│ For each user in current proposal:│
│ - Not already connected?        │
│   Yes ─► Add Connection         │
└────────────────┬────────────────┘
                 ↓
┌─────────────────────────────────┐
│ Log "Connections updated"       │
└────────────────┬────────────────┘
                 ↓
┌─────────────────────────────────┐
│ Logout from One Identity        │
└─────────────────────────────────┘
```

### Key Implementation Details
- **User Identification**: Users are primarily identified by their `oidcSub` from the proposal message, which is used to look up their `UID_Person` in One Identity.
- **Proposal Identification**: The proposal itself is identified in One Identity using its `shortCode` and other details from the `ProposalMessageData`.
- **Conditional Connection Removal**: A crucial feature is that connections for users no longer in the proposal are only removed if those users do not also have separate site access to that proposal. This prevents inadvertently revoking access for individuals like visitors who might be associated with a proposal through a different mechanism (site access).
- **Idempotency for `PROPOSAL_ACCEPTED`**: If a `PROPOSAL_ACCEPTED` event is processed for a proposal that already exists in One Identity (e.g., due to a retry), the system does not attempt to re-create it but proceeds to synchronize the member connections.
- **Handling `PROPOSAL_UPDATED` for Non-existent Proposals**: If a `PROPOSAL_UPDATED` event is received for a proposal that isn't found in One Identity, the handler logs this and exits gracefully, as there's no record to update.

### Error Handling
- **Proposal Creation Failure**: If creating a new proposal (`ESet`) in One Identity fails during a `PROPOSAL_ACCEPTED` event, an error is thrown, and the process is halted.
- **User Not Found**: If any users listed in the proposal message (proposer or members) cannot be found in One Identity, an error is logged. The process continues with the users that were found.
- **Logout Guarantee**: The One Identity session is always closed in a `finally` block, ensuring resources are released even if errors occur during the synchronization process.
