# Security Specification & Threat Model

This document outlines the security specifications and testing payloads (the "Dirty Dozen") to harden the Firebase Firestore security rules for the MediMind AI application.

## 1. Data Invariants

1.  **Strict Owner Isolation**: A user's profile, medications, mood history, vaccination logs, medical reports, and health history can *only* be read, created, updated, or deleted by that exact user (matching `request.auth.uid == userId`).
2.  **No Blanket Access**: There are no blanket read/write permissions for signed-in users. All collection list/get queries must be restricted to the owner's UID.
3.  **Data Sanitization & Limits**: 
    *   No IDs can exceed 128 characters or contain special characters that allow path traversal (validated via `isValidId()`).
    *   Field values must match their structural boundaries (e.g., medication name must be `<= 100` characters, dosage `<= 50` characters).
    *   Timestamps must match server time or be strictly validated.
4.  **No Self-Escalation**: Users cannot declare themselves admins or modify roles.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious payloads/requests designed to break the application's rules. Our rules *must* deny all of these.

### Threat Group A: Identity Spoofing & Cross-Tenant Access
1.  **Payload 1 (Cross-User Read)**: User `attacker_uid` attempts to read user profile `/users/victim_uid`.
2.  **Payload 2 (Cross-User Write)**: User `attacker_uid` attempts to write a medication to `/users/victim_uid/medications/med1`.
3.  **Payload 3 (Cross-User Delete)**: User `attacker_uid` attempts to delete a report in `/users/victim_uid/reports/rep1`.
4.  **Payload 4 (Fake Owner Spoofing)**: Attacker attempts to create `/users/attacker_uid` but passes `uid: "victim_uid"` in the payload body.

### Threat Group B: Field Injection & Shadow Fields (The "Ghost" Fields)
5.  **Payload 5 (Ghost Field in Profile)**: Attacker attempts to write a user profile with an unauthorized `isAdmin: true` field.
6.  **Payload 6 (Shadow Fields in Medication)**: Attacker writes a medication payload containing extra metadata fields like `{ id: "med1", name: "Aspirin", frequency: "daily", systemApproved: true }`.

### Threat Group C: Size Flooding & ID Poisoning
7.  **Payload 7 (Denial of Wallet Flooding)**: Attacker attempts to write a medication with a name containing a 10MB string.
8.  **Payload 8 (Path ID Poisoning)**: Attacker attempts to create a document with ID `../../bad_path/exploit` to corrupt database paths.

### Threat Group D: Temporal & Input Type Breaches
9.  **Payload 9 (Future Timestamp Manipulation)**: Attacker writes a report with a custom future timestamp `1893456000000` (Year 2030) instead of current server time.
10. **Payload 10 (Invalid Enum Values)**: Attacker attempts to write a MoodEntry with `mood: "ecstatic"` (not in allowed enums).
11. **Payload 11 (Pattern Breakage)**: Attacker writes a medication with `time: "99:99"` or `"9:00 PM"` instead of the required `HH:MM` format.
12. **Payload 12 (Blanket List Query)**: Attacker attempts to perform `getDocs(collection(db, "users"))` without filtering by their own user ID, aiming to scrape all user profiles.

---

## 3. The Test Plan & Verification

We will build the secure rules in `firestore.rules` and run the ESLint security rules plugin on them. All standard CRUD operations from the client will be intercepted and checked.
