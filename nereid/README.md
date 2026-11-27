# Abyss Protocol (working title)
Original 2D social-deduction game for Play2Gether. Underwater station N-17, autonomous maintenance units, original procedural vector artwork, no copied assets, characters, audio, names or map from existing games. Title is a working title; no trademark clearance has been performed.

## Play
4–10 players including bots. In practice, start with six participants. Online: sign in, create room, share the code or invite an existing friend; host chooses participant target, assignment count, discussion duration and one/two glitches. Unfilled seats become bots. Technicians complete station assignments. Glitches mimic them, create fictional system alerts, use maintenance tunnels and deactivate nearby robots. Report inactive units or call an emergency meeting at the atrium. Vote or skip. Ties isolate nobody. Inactive units can finish assignments and observe. Technician victory: all assignments done or no active glitch; glitch victory: parity or expired pressure alert.

## Network and release
Uses existing Firebase room, private hands, invite, expiry, block and moderated game-chat paths. Host simulates movement and validates actions; public snapshots omit secret roles until the result. Private hands are read by the assigned account only. Host is trusted and must remain online. Public positional data is not cheat-proof. Firebase rules must be deployed from firebase/database.rules.json by the project administrator before the new room type works online. Local training does not require new rules. No new dependency or paid backend. Host departure closes the room.

## Verification
node nereid.test.cjs
Run the full existing Factory Empire/save checks too. Test a real two-browser login, room join, invitations, roles, meeting, disconnect, cache and touch controls after deploying Firebase rules.

## Version 2
Four distinct assignment interfaces, animated room equipment, wall-limited vision, private bot witness evidence, fewer guest movement writes and host rematches. No new Firebase paths. Real multiplayer and browser visual checks are still required.


## Version 3
Two connected eastern station rooms, 10 rooms total and 9 assignment consoles. Six task types including spectral analysis and nutrient dosing. Redesigned lobby with ten slots, host settings and friend status. Optional next-task navigation, area label, repair markers on map, original synthesized ambient sound and alerts. Host task count supports 2–5. No new Firebase paths or rules required; all participants should reload to the current version before joining.


## Version 4
Walkable synchronized online preparation deck, four shell styles, optional readiness indicators and optional analyst/systemwart specialties. Station diagnostic console returns aggregate room counts only for a few seconds, never names/roles. Analyst can request a scan remotely; systemwart extends a fictional pressure alert once by 12 seconds. These roles remain on the technician team and are private until the end. A round token rejects old inputs. **Deploy the updated Firebase database rules before using synchronized lobby movement.** The rules allow only room participants to update their own bounded lobby state while in the lobby; the host can clear it. Readiness is advisory, not a start requirement. Real browser and two-account verification still required.


## Version 5
Eight minigames at eleven stations, anonymous vote totals after voting ends, animated results, directional robot details, host-confirmed task feedback, support bot alert response and stopped snapshot traffic after final upload. Hangar pointer mapping handles letterboxing. Existing v4 Firebase rules required. Visual and live online testing remain outstanding.


## Version 6 — Abyss Protocol
Display title changed; internal ID nereid is unchanged for room compatibility. No trademark clearance. Meeting overlay mounts once per meeting; countdown, vote status and notes update without replacing its buttons or focus. Result screens use stable keys. Lobby preserves the live canvas and uses crew/settings/friends tabs, with controls and room code visible separately. New layered station hull, cross-connections, deck lighting, room details and a redesigned animated preparation deck. Existing Firebase rules unchanged. Browser and real multiplayer verification remain required.
