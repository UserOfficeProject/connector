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