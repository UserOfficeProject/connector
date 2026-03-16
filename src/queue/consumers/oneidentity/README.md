# One Identity Visit Access Management

## Functional Specification

### Purpose
The handler manages site and system access in One Identity based on visit creation and deletion events for science users.

### Process Overview
- When a visit is created, both site access and system access are provisioned in One Identity
- When a visit is deleted, both site access and system access are cancelled in One Identity
- Only science users (users with `CCC_EmployeeSubType === ESSSCIENCEUSER`) are processed

### Access Types
- **Site Access**: Physical access to facility for the exact visit duration
- **System Access**: Digital access to systems, extends beyond the visit end date by a configurable number of days (default: 30)

### Key Relationships
- System access is linked to site access via `CustomProperty04` which stores the site access UID
- Both access types are identified by specific roles in `PersonWantsOrgRole` enum
- Proposal's short code is stored in `CustomProperty04` of the system access record

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

### System Access Duration
- Extends beyond visit by `ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS` (default: 30 days)

### Access Creation
- Site access matches exact visit dates
- System access starts from the visit start date and extends beyond the visit end date by a configurable number of days (default: 30)
- System access links to site access via `CustomProperty04`

### Access Cancellation
- System access cancellation depends on finding the parent site access first
- Both must be cancelled

### Error Handling
- Proper error messages when person or access records are not found
- Always performs logout in finally block to ensure clean session management

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