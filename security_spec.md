# Security Specification for Workflow Brain

## 1. Data Invariants
- Each workflow, node, link, version, queue resource, and queue link belongs directly to a single User ID (`userId`).
- No user can read, create, update, or delete another user's resources.
- Document IDs must conform to a standardized structure to prevent value injection and resource exhaustion attacks.

## 2. The "Dirty Dozen" Malicious Payloads
Here are 12 specific payloads attempting to break identity, integrity, or state boundaries:
1. **Unauthenticated Read**: Attempt to list any user's workflows without a valid auth token.
2. **Identity Spoofing on Create**: Create a workflow under owner `user_A` while authenticated as `user_B`.
3. **Data Pollution/Poisoning**: Injecting massive arrays/objects or extremely long strings (>128 chars) onto ID paths.
4. **Foreign Node Linkage**: Link two nodes belonging to different users or workflows.
5. **Cross-User Modification**: Attempt to edit/rename a workflow belonging to another user.
6. **Cross-User Deletion**: Attempt to delete another user's active node.
7. **Bypassing Owner Guard**: Read all workflows using an insecure blanket get.
8. **Malicious Empty Schema Injection**: Creating workflows without necessary schema keys.
9. **Tampering with audit trails**: Arbitrarily altering historical version entries.
10. **Orphaned Writes**: Inserting a link between nodes that do not exist under user paths.
11. **Malicious Queue Resource override**: Modifying trusted queue sources belonging to another user.
12. **Self-Appointed Roles**: Setting unverified admin flags under current user contexts.

## 3. Test Cases Configuration
Valid users are strictly allowed to manage their own workflows. Adversarial payloads will always result in `PERMISSION_DENIED`.
