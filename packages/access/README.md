# Family and teacher access

Every relationship starts with an empty `permissions` object. The profile owner must opt into each field independently. API handlers must call `canViewRelationship` or `visibleSnapshot` before returning a field; UI toggles are not an authorization boundary.

The current scaffold uses explicit local demo identities because authentication persistence is not provisioned yet. Replace those IDs with the authenticated session subject when the User store is connected.
