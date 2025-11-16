# 🏏 Player Data Update Guide

## Quick Overview

The app is currently running with **dummy player data**. You can easily update with real players anytime using a simple CSV file.

---

## 📝 How to Update Players

### Method 1: CSV Import (Recommended - 5 minutes)

1. **Edit the CSV file:**
   Open `scripts/players-template.csv` in Excel, Google Sheets, or any text editor.

2. **Update player information:**
   ```csv
   teamId,name,role,battingStyle,bowlingStyle,isAbroadPlayer,photoUrl
   brk,Sandeep Lamichhane,bowler,Right-hand bat,Right-arm legbreak,false,
   brk,Dipendra Airee,allrounder,Right-hand bat,Right-arm medium,false,
   ```

   **Column Definitions:**
   - `teamId`: Team short code (brk, chr, jnb, kry, ktg, lml, pka, spr)
   - `name`: Player's full name
   - `role`: One of: `batter`, `bowler`, `allrounder`, `wicketkeeper`
   - `battingStyle`: e.g., "Right-hand bat", "Left-hand bat"
   - `bowlingStyle`: e.g., "Right-arm fast", "Left-arm orthodox", leave empty for batters
   - `isAbroadPlayer`: `true` for international players, `false` for Nepali players
   - `photoUrl`: URL to player photo (optional, leave empty for default avatar)

3. **Import to database:**
   ```bash
   npm run import-players
   ```

4. **Done!** Players are updated instantly. 🎉

---

### Method 2: Direct Firebase Console (Manual - 10 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/project/npl-fan-battle/firestore)
2. Navigate to the `players` collection
3. Edit individual player documents
4. Click "Save"

---

## 🎨 Adding Player Photos

### Option 1: Use External URLs
In the CSV, add direct URLs to player images:
```csv
brk,Sandeep Lamichhane,bowler,Right-hand bat,Right-arm legbreak,false,https://example.com/sandeep.jpg
```

### Option 2: Host Locally (Better for performance)
1. Download player photos
2. Save them to `public/players/` directory
3. Name them clearly: `sandeep-lamichhane.jpg`
4. In CSV, use: `/players/sandeep-lamichhane.jpg`

---

## 🔄 Current Dummy Data

The app is seeded with 24 dummy players (3 per team):
- Mix of batters, bowlers, allrounders, and wicketkeepers
- Includes some marked as "abroad players"
- Generic names like "Player 1", "Player 2", etc.

**This is perfectly fine for testing and launch!** The app's core functionality (predictions, scoring, leaderboard) doesn't depend on real player data.

---

## 📊 CSV Template Structure

Here's a blank template:

```csv
teamId,name,role,battingStyle,bowlingStyle,isAbroadPlayer,photoUrl
brk,,,,,false,
chr,,,,,false,
jnb,,,,,false,
kry,,,,,false,
ktg,,,,,false,
lml,,,,,false,
pka,,,,,false,
spr,,,,,false,
```

**Team Codes:**
- `brk` = Biratnagar Kings
- `chr` = Chitwan Rhinos
- `jnb` = Janakpur Bolts
- `kry` = Karnali Yaks
- `ktg` = Kathmandu Gorkhas
- `lml` = Lumbini Lions
- `pka` = Pokhara Avengers
- `spr` = Sudurpaschim Royals

---

## ⚡ Pro Tips

1. **Start Small:** Update one team first, test it, then do the rest
2. **Batch Updates:** You can add 100+ players at once via CSV
3. **No App Restart:** Changes reflect immediately (users may need to refresh)
4. **Backup First:** Export current data from Firebase Console before big updates
5. **Photo Sizes:** Keep images under 200KB for fast loading

---

## 🚨 Troubleshooting

**"Import failed"**
- Check CSV format (no missing commas)
- Ensure teamId matches exactly (lowercase: brk, chr, etc.)
- Verify .env.local file has correct Firebase credentials

**"Players not showing in app"**
- Clear browser cache
- Check Firebase Console to confirm data is there
- Look at browser console for errors (F12)

**"Photos not loading"**
- Verify image URLs are accessible
- For local images, check they're in `public/players/` folder
- Image must be jpg, png, or webp format

---

## 📞 Need Help?

1. Check Firebase Console for data
2. Run `npm run dev` and check terminal for errors
3. Review the CSV format carefully
4. Test with just 1-2 players first

---

**Last Updated:** November 15, 2025  
**Current Status:** Running with dummy data (24 players)  
**Next Update:** Add real NPL 2025 player data when available

