# Factory Empire

- Preserve existing local and Firebase player saves when changing this game. Keep player-specific storage keys and existing item and machine identifiers compatible.
- Migrate supported older saves without resetting progress, factories, inventory, or unlocks. Keep the original save available before replacing it and protect unsupported save formats from being overwritten.
- Test save changes with representative older saves and a save/load round trip. Resets require an explicit in-game player action.
