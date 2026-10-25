# ZX STORE — Zero-Trust Firestore Security Specification

## 1. Data Invariants

1. **Identity & PII Isolation (`/users/{userId}`)**:
   - Every user profile document ID `{userId}` MUST strictly match `data.uid` and `request.auth.uid` on creation.
   - Read (`get`) access to `/users/{userId}` (which contains PII: `email`, `phone`) is strictly restricted to the document owner (`request.auth.uid == userId`) or the verified exclusive administrator (`isAdmin()`).
   - Collection `list` on `/users` is restricted exclusively to the verified exclusive admin (`isSuperAdmin()`) with zero `get()`/`exists()` calls inside `list`.
   - On self-registration, `walletBalance` MUST equal `0`, `role` MUST equal `'user'` (unless `isSuperAdmin()`), and `lastTxId` MUST equal `'init'`.
   - `phone` is immutable once non-empty (`existing().phone == '' || incoming().phone == existing().phone`).

2. **Exclusive Admin & Privilege Escalation Prevention (`/admins/{adminId}`)**:
   - Auth custom claims are never trusted; administrator privileges belong exclusively to `paknep1414k@gmail.com` with `email_verified == true`.
   - All other accounts are strictly regular users (`role == 'user'`), and `/admins/{adminId}` writes are completely locked (`allow create, update, delete: if false;`).

3. **Catalog Integrity (`/products/{productId}`, `/packages/{packageId}`)**:
   - Public storefront queries (`list`, `get`) are permitted ONLY when `resource.data.active == true` (or when `isSuperAdmin()`/`isAdmin()`).
   - Only the verified administrator (`isAdmin()`) can create, update, or delete products and packages.
   - Every package creation MUST verify `exists(/products/$(incoming().productId))` to prevent orphaned packages.

4. **Manual-Verification Wallet & Atomic Order Ledger (`/orders/{orderId}`, `/transactions/{txId}`, `/users/{userId}`)**:
   - Regular users can NEVER increase their own `walletBalance` directly or via self-verified transactions (Fonepay/instant self-credit is strictly forbidden).
   - Users loading funds via the eSewa Merchant QR MUST submit a `/transactions/{txId}` document with `type == 'topup'`, `gateway == 'eSewa_QR'`, `status == 'pending'`, and `amountNpr >= 10`. Wallet balance only increases when `isAdmin()` verifies and approves the request in an atomic batch.
   - User-initiated `walletBalance` updates are strictly restricted to decreases (`incoming().walletBalance < existing().walletBalance`) paired atomically with a `purchase` transaction and an `orders` document.
   - Creating an order in `/orders/{orderId}` requires `status == 'Pending'`, verified user ownership (`userId == request.auth.uid`), existing `/users/{userId}`, `/products/{productId}`, and `/packages/{packageId}`, AND atomic creation of the corresponding purchase transaction `existsAfter(/transactions/$(incoming().txId))`.
   - Terminal State Locking: Once an order reaches `'Successful'` or `'Cancelled'` (or a transaction reaches `'verified'` or `'rejected'`), non-admins can never modify it, and status transitions are strictly controlled by `isAdmin()`.
   - Temporal Integrity: Every `createdAt` (on create) and `updatedAt` (on create/update) MUST equal `request.time`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Self-Assigned Admin Role on Registration**:
   `POST /users/attacker_1`: `{ "uid": "attacker_1", "fullName": "Attacker", "email": "evil@test.com", "phone": "9800000000", "role": "admin", "walletBalance": 0, "lastTxId": "init", "createdAt": "SERVER_TIME", "updatedAt": "SERVER_TIME" }` -> **PERMISSION_DENIED**
2. **Payload 2 — Free Wallet Money on Registration**:
   `POST /users/attacker_1`: `{ "uid": "attacker_1", "fullName": "Attacker", "email": "evil@test.com", "phone": "9800000000", "role": "user", "walletBalance": 50000, "lastTxId": "init", "createdAt": "SERVER_TIME", "updatedAt": "SERVER_TIME" }` -> **PERMISSION_DENIED**
3. **Payload 3 — Self-Credited Instant Wallet Balance Inflation**:
   `PATCH /users/attacker_1`: `{ "walletBalance": 1000, "lastTxId": "tx_fake", "updatedAt": "SERVER_TIME" }` (even with a batch transaction) -> **PERMISSION_DENIED** (users can only decrease balance on purchases)
4. **Payload 4 — Pre-Verified eSewa QR Top-Up Injection**:
   `POST /transactions/tx_self_verify`: `{ ..., "type": "topup", "gateway": "eSewa_QR", "amountNpr": 1000, "status": "verified" }` -> **PERMISSION_DENIED** (`status` must be `'pending'`)
5. **Payload 5 — Shadow Field Injection on Profile Update**:
   `PATCH /users/user_1`: `{ "fullName": "Valid Name", "isVerifiedMerchant": true, "updatedAt": "SERVER_TIME" }` -> **PERMISSION_DENIED**
6. **Payload 6 — PII Scrape by Non-Owner**:
   `GET /users/victim_uid` as `attacker_1` -> **PERMISSION_DENIED**
7. **Payload 7 — Unverified Admin Email Spoof**:
   `POST /products/hack_game` with token `{ email: "paknep1414k@gmail.com", email_verified: false }` -> **PERMISSION_DENIED**
8. **Payload 8 — ID Poisoning / Resource Exhaustion**:
   `POST /orders/bad$id!with/slashes` or `targetAccount` with 5,000 characters -> **PERMISSION_DENIED**
9. **Payload 9 — Orphaned Package Creation**:
   `POST /packages/pkg_orphan` (as admin) referencing non-existent `productId: "missing_game_999"` -> **PERMISSION_DENIED**
10. **Payload 10 — Order Creation with Pre-Marked `'Successful'` Status or Without Wallet Deduction**:
    `POST /orders/ord_free`: `{ ..., "status": "Successful", "priceNpr": 500 }` (or missing atomic `/transactions/{txId}`) -> **PERMISSION_DENIED**
11. **Payload 11 — Order Cross-Tenant Query Scrape**:
    `LIST /orders` without `where('userId', '==', request.auth.uid)` by non-admin -> **PERMISSION_DENIED**
12. **Payload 12 — Sub-Minimum eSewa Top-Up (< Rs. 10) or Forged Timestamp**:
    `POST /transactions/tx_tiny`: `{ ..., "type": "topup", "gateway": "eSewa_QR", "amountNpr": 5, "status": "pending" }` -> **PERMISSION_DENIED**
