# How to Insert Match 1 Predictions

This guide explains how to use the `insert-match1-predictions` script to add or update predictions for Match 1 for users who signed up after the deadline.

## Prerequisites

1. Make sure you have your Firebase credentials set up in `.env.local`
2. Ensure Match 1 exists in the database
3. Have the user's email address or user ID ready

## Step-by-Step Usage

### 1. Run the Script

```bash
npm run insert-match1-predictions
```

### 2. Enter User Information

The script will prompt you for:
```
Enter user email or user ID: 
```

**Options:**
- Enter the user's email address (e.g., `user@example.com`)
- Or enter the user's user ID (Firebase UID)

**Example:**
```
Enter user email or user ID: john.doe@example.com
```

### 3. If Prediction Exists

If a prediction already exists for this user:
- The script will automatically create a backup
- You'll see: `💾 Backup saved to: scripts/backups/prediction-backup-...`
- The script will proceed to update the prediction

### 4. Enter Winner Prediction

The script will show:
```
1. Winner (Required):
   A. Team A Name
   B. Team B Name
   Enter A or B: 
```

**Example:**
```
Enter A or B: A
```

### 5. Enter Player of the Match (POM)

The script will display all available players from both teams:
```
📋 Available Players:

  Team A Name:
    1. Player Name (Role)
    2. Another Player (Role)
    ...

  Team B Name:
    1. Player Name (Role)
    ...
```

Then prompt:
```
2. Player of the Match (enter player name): 
```

**Example:**
```
2. Player of the Match (enter player name): Virat Kohli
```

**Note:** You can enter a partial name - the script will try to match it (fuzzy matching).

### 6. Enter First Innings Predictions

The script will ask for predictions for both scenarios:

#### If Team A bats first:
```
3. First Innings Predictions:
   Score Categories: A (<130), B (131-145), C (146-160), D (161-175), E (176-190), F (191+)
   If Team A bats first - Score Category (A-F, or skip): 
   If Team A bats first - Wickets (0-10, or skip): 
```

#### If Team B bats first:
```
   If Team B bats first - Score Category (A-F, or skip): 
   If Team B bats first - Wickets (0-10, or skip): 
```

**Examples:**
```
If Team A bats first - Score Category (A-F, or skip): C
If Team A bats first - Wickets (0-10, or skip): 3
If Team B bats first - Score Category (A-F, or skip): D
If Team B bats first - Wickets (0-10, or skip): 5
```

**Note:** You can skip any field by pressing Enter (leave empty).

### 7. Confirmation

After entering all data, the script will:
- Save/update the prediction
- Show a summary
- Display the backup location (if updating)

**Example Output:**
```
✅ Prediction inserted successfully!
   Prediction ID: user123_match-1
   Winner: Team A Name
   POM: Virat Kohli
   Team A: C / 3 wickets
   Team B: D / 5 wickets
   Submitted At: 1/15/2025, 8:30:00 AM (6.5 hours before match start)

💾 Backup available at: scripts/backups/prediction-backup-user123_match-1-2025-01-15T10-30-00.json
   To restore: npm run restore-prediction prediction-backup-user123_match-1-2025-01-15T10-30-00.json
```

## Complete Example Session

```
$ npm run insert-match1-predictions

🎯 Insert Match 1 Prediction for User
============================================================
✅ Tournament: NPL 2025

✅ Match 1: Kathmandu Gorkhas vs Janakpur Bolts
   Date: 1/15/2025, 3:00:00 PM

Enter user email or user ID: john.doe@example.com
✅ User: John Doe (john.doe@example.com)

⚠️  Prediction already exists. Will update it.
💾 Backup saved to: scripts/backups/prediction-backup-user123_match-1-2025-01-15T10-30-00.json

📊 Prediction Details:

1. Winner (Required):
   A. Kathmandu Gorkhas
   B. Janakpur Bolts
   Enter A or B: A

📋 Available Players:

  Kathmandu Gorkhas:
    1. Virat Kohli (Batsman)
    2. MS Dhoni (Wicketkeeper)
    ...

  Janakpur Bolts:
    1. Rohit Sharma (Batsman)
    ...

2. Player of the Match (enter player name): Virat Kohli

3. First Innings Predictions:
   Score Categories: A (<130), B (131-145), C (146-160), D (161-175), E (176-190), F (191+)
   If Kathmandu Gorkhas bats first - Score Category (A-F, or skip): C
   If Kathmandu Gorkhas bats first - Wickets (0-10, or skip): 3
   If Janakpur Bolts bats first - Score Category (A-F, or skip): D
   If Janakpur Bolts bats first - Wickets (0-10, or skip): 5

✅ Prediction updated successfully!
   Prediction ID: user123_match-1
   Winner: Kathmandu Gorkhas
   POM: Virat Kohli
   Team A: C / 3 wickets
   Team B: D / 5 wickets
   Submitted At: 1/15/2025, 8:30:00 AM (6.5 hours before match start)

💾 Backup available at: scripts/backups/prediction-backup-user123_match-1-2025-01-15T10-30-00.json
   To restore: npm run restore-prediction prediction-backup-user123_match-1-2025-01-15T10-30-00.json
```

## Important Notes

### 1. Submitted At Timestamp
- The script automatically sets `submittedAt` to **6.5 hours before Match 1's start time**
- This ensures predictions appear to be submitted before the deadline

### 2. If Match is Already Completed
- If Match 1 is already completed and scored, you'll see:
  ```
  ⚠️  Note: Match 1 is already completed. You may need to recalculate scores.
     Run: npm run recalculate-match match-1
  ```
- **Important:** After updating a prediction for a completed match, you MUST run the recalculate script to update scores:
  ```bash
  npm run recalculate-match match-1
  ```

### 3. Backup and Restore
- Backups are automatically created before updating existing predictions
- To restore from a backup:
  ```bash
  npm run restore-prediction <backup-filename>
  ```
- Example:
  ```bash
  npm run restore-prediction prediction-backup-user123_match-1-2025-01-15T10-30-00.json
  ```

### 4. Score Categories Reference
- **A**: Less than 130 runs
- **B**: 131-145 runs
- **C**: 146-160 runs
- **D**: 161-175 runs
- **E**: 176-190 runs
- **F**: 191+ runs

### 5. Wickets
- Must be a number between 0 and 10
- Can be skipped (leave empty)

## Troubleshooting

### User Not Found
```
❌ User not found: user@example.com
```
**Solution:** Check the email address or user ID. Make sure the user has registered.

### Match 1 Not Found
```
❌ Match 1 not found
```
**Solution:** Ensure Match 1 exists in the database. Check the tournament setup.

### Player Not Found
```
⚠️  Player "Player Name" not found. Continuing without POM...
```
**Solution:** The script will continue without POM. Check the player name spelling or use a partial match.

## Quick Reference

```bash
# Insert/update prediction
npm run insert-match1-predictions

# Restore from backup
npm run restore-prediction <backup-filename>

# Recalculate scores (if match is completed)
npm run recalculate-match match-1
```

## Backup Files Location

All backups are stored in:
```
scripts/backups/
```

Backup files are automatically ignored by git (in `.gitignore`).

