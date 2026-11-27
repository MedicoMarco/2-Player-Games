# Relay Null: Station Council

Standalone 2.5D browser social-deduction game integrated into Play2Gether. Internal paths keep the original development codename sector-09 to avoid unnecessary migration.

## Release status
- Local mode: beta, 3 maps, 4–12 simulated participants, 6 task types, configurable difficulty, original procedural graphics and sound.
- Online mode: experimental, private confirmed-friend lobbies, at least 2 human players, bots fill remaining places. Requires deployed and tested Firebase rules. The host is authoritative and trusted; no competitive anti-cheat or host migration. Round data is ephemeral and no account statistics are recorded yet.
- Browser/PWA caching: assets included in the service-worker cache.
- Tests: run `node sector-09/regression.test.cjs`. This checks JS parsing, movement, bot task progress, vote outcomes and the structure of role-isolation rules. It is not a Firebase Emulator or end-to-end browser test.

## Before enabling online for general use
1. Back up the currently deployed Realtime Database rules and compare them to firebase/database.rules.json. Test the additive sector09Lobbies, sector09Rounds and sector09Invites rules in the Firebase Emulator before deployment.
2. With separate test accounts, verify lobby creation, mutual friendship and block checks, invitation expiry, role privacy, access denial for nonmembers, movement, votes, disconnects and cleanup.
3. Verify cleanup of abandoned rooms, rounds and invitations, including account deletion. A disconnected host ends the room; guests can resume while their seat and the host remain available. Do not rely on this as a guaranteed retention policy.
4. Review privacy notice, legal basis, actual retention/deletion, and the existing privacy policy before public online activation. The game uses existing account identifiers, names and short-lived game data in Firebase; sound and color preferences are local.
5. Test current desktop/mobile browsers, portrait/landscape layout, touch, audio permissions and service-worker updates.

## Originality
No assets, characters, level layouts, names, sounds or source code from Among Us were imported. The game uses a distinct robot/research-station theme and an independent title. Genre inspiration is not an official affiliation or license. A preliminary name search found existing games named Sector 09; the public title was changed. This is not a trademark clearance or legal opinion; confirm title availability and rights before a broader commercial release.

Reference: https://www.innersloth.com/fan-creation-policy/
