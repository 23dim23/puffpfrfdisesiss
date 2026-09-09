# Security Specification - Firestore Security Rules

This specification defines the security invariants and testing scenarios for the Laser Tag Arena application's Firestore database.

## 1. Data Invariants

1. **Sections (`/sections/{sectionId}`)**:
   - Anyone can read sections (`allow read: if true`).
   - Only the bootstrapped admin (`karpenkoov32@gmail.com`) can write or update section details.
   - Immutable field: `id` cannot be modified once created.

2. **Services (`/services/{serviceId}`)**:
   - Anyone can read services (`allow read: if true`).
   - Only the bootstrapped admin (`karpenkoov32@gmail.com`) can create, update, or delete services.
   - Required fields on creation: `id`, `category`, `name`, `description`, `price`.
   - Immutable field: `id` cannot be modified.

3. **Reviews (`/reviews/{reviewId}`)**:
   - Anyone can read reviews (`allow read: if true`).
   - Users can create a review if they specify valid fields and a matching author name.
   - However, to prevent spam, reviews have length constraints: `text.size() <= 1000`, `author.size() <= 100`.
   - Admin can delete or update any review.

4. **Contacts (`/config/contacts`)**:
   - Anyone can read contact info.
   - Only the bootstrapped admin (`karpenkoov32@gmail.com`) can write or update contact info.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious scenarios must be strictly prevented by `firestore.rules`:

1. **Anonymous or unauthenticated user trying to modify a section's text.** (PERMISSION_DENIED)
2. **Authenticated non-admin user trying to toggle `isActive` on a section.** (PERMISSION_DENIED)
3. **Admin trying to overwrite a section's `id` with a different value on update.** (PERMISSION_DENIED)
4. **Unauthenticated user trying to create a new service.** (PERMISSION_DENIED)
5. **Authenticated non-admin trying to delete an existing service.** (PERMISSION_DENIED)
6. **Malicious user trying to create a service with a missing required field (e.g., missing `price`).** (PERMISSION_DENIED)
7. **Malicious user trying to inject a 2MB payload into a review text.** (PERMISSION_DENIED)
8. **Malicious user trying to inject an invalid `rating` value (e.g., rating = 15 or -1) in reviews.** (PERMISSION_DENIED)
9. **Malicious user trying to set a random string as the `source` of a review (e.g., source = "hacked").** (PERMISSION_DENIED)
10. **Unauthenticated user trying to change the telephone number in `/config/contacts`.** (PERMISSION_DENIED)
11. **Authenticated non-admin trying to update `/config/contacts` with an excessively long telephone number.** (PERMISSION_DENIED)
12. **Malicious user attempting to inject junk/malformed IDs as document keys to trigger denial of wallet.** (PERMISSION_DENIED)

---

## 3. Firestore Rules draft

Let's proceed to define our robust `firestore.rules`.
