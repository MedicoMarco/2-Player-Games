# Nereidenprotokoll
Original 2D social-deduction game for Play2Gether. Underwater station N-17, autonomous maintenance units, original procedural vector artwork, no copied assets, characters, audio, names or map from existing games. Title is a working title; no trademark clearance has been performed.

## Play
4–10 players including bots. In practice, start with six participants. Online: sign in, create room, share the code or invite an existing friend; host chooses participant target, assignment count, discussion duration and one/two glitches. Unfilled seats become bots. Technicians complete station assignments. Glitches mimic them, create fictional system alerts, use maintenance tunnels and deactivate nearby robots. Report inactive units or call an emergency meeting at the atrium. Vote or skip. Ties isolate nobody. Inactive units can finish assignments and observe. Technician victory: all assignments done or no active glitch; glitch victory: parity or expired pressure alert.

## Network and release
Uses existing Firebase room, private hands, invite, expiry, block and moderated game-chat paths. Host simulates movement and validates actions; public snapshots omit secret roles until the result. Private hands are read by the assigned account only. Host is trusted and must remain online. Public positional data is not cheat-proof. Firebase rules must be deployed from firebase/database.rules.json by the project administrator before the new room type works online. Local training does not require new rules. No new dependency or paid backend. Host departure closes the room.

## Verification
node nereid.test.cjs
Run the full existing Factory Empire/save checks too. Test a real two-browser login, room join, invitations, roles, meeting, disconnect, cache and touch controls after deploying Firebase rules.