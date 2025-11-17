# Players CSV Guide

## File: `players-by-team.csv`

This CSV file is organized team-wise to make it easy to fill in player information.

## How to Use

1. **Open the file**: `scripts/players-by-team.csv`
2. **Fill in player details** for each team section
3. **Remove comment lines** (lines starting with `#`) before importing, OR the import script will automatically skip them
4. **Import to database**: Run `npm run import-players scripts/players-by-team.csv`

## CSV Format

Each row should follow this format:
```
teamId,name,role,battingStyle,bowlingStyle,isAbroadPlayer,photoUrl
```

### Column Definitions

| Column | Required | Description | Example Values |
|--------|----------|-------------|----------------|
| `teamId` | ✅ Yes | Team short code | `ktg`, `pka`, `brk`, `chr`, `jnb`, `lml`, `kry`, `spr` |
| `name` | ✅ Yes | Player full name | `Sandeep Lamichhane`, `Rohit Paudel` |
| `role` | ✅ Yes | Player role | `batter`, `bowler`, `allrounder`, `wicketkeeper` |
| `battingStyle` | ✅ Yes | Batting style | `Right-hand bat`, `Left-hand bat` |
| `bowlingStyle` | ⚠️ Optional | Bowling style (leave empty if doesn't bowl) | `Right-arm fast`, `Left-arm orthodox`, `Right-arm legbreak` |
| `isAbroadPlayer` | ✅ Yes | Is foreign player | `true`, `false` |
| `photoUrl` | ⚠️ Optional | URL to player photo | Leave empty if not available |

## Team Codes

| Code | Team Name |
|------|-----------|
| `ktg` | Kathmandu Gorkhas |
| `pka` | Pokhara Avengers |
| `brk` | Biratnagar Kings |
| `chr` | Chitwan Rhinos |
| `jnb` | Janakpur Bolts |
| `lml` | Lumbini Lions |
| `kry` | Karnali Yaks |
| `spr` | Sagarmatha Pride |

## Role Types

- **`batter`**: Pure batsman (doesn't bowl)
- **`bowler`**: Pure bowler (rarely bats)
- **`allrounder`**: Bats and bowls
- **`wicketkeeper`**: Wicket-keeper (may also bat/bowl)

## Bowling Style Examples

- `Right-arm fast`
- `Right-arm fast medium`
- `Right-arm medium`
- `Left-arm fast`
- `Left-arm fast medium`
- `Left-arm medium`
- `Right-arm offbreak`
- `Left-arm orthodox`
- `Right-arm legbreak`
- `Left-arm legbreak`

## Example Row

```
ktg,Sandeep Lamichhane,bowler,Right-hand bat,Right-arm legbreak,false,https://example.com/photo.jpg
```

## Import Command

```bash
# Import from the team-wise CSV file
npm run import-players scripts/players-by-team.csv

# Or use the default template
npm run import-players
```

## Notes

- The import script will **automatically skip comment lines** (starting with `#`)
- The import script will **delete all existing players** before importing new ones
- Empty rows are automatically skipped
- Player IDs are auto-generated as: `{teamId}-player-{number}`

