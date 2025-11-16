# 🏏 How to Update Player List - Complete Guide

This guide shows you **3 different methods** to update player data in FanBattle.

---

## 📋 Quick Overview

**Current Status:**
- ✅ CSV import script ready (`import-players-csv.ts`)
- ✅ Python scraper ready (`scrape-players.py`)
- ✅ CSV template with sample data (`players-template.csv`)
- ⚠️ JSON files are empty (scraper hasn't been run yet)

**Choose your method:**
1. **CSV Import** (Easiest - Manual entry)
2. **Python Scraper** (Automated - Scrapes ESPN Cricinfo)
3. **JSON Import** (If you have JSON data)

---

## Method 1: CSV Import (Recommended for Quick Updates) ⭐

**Best for:** Manual entry, small updates, or when you have a spreadsheet ready.

### Step 1: Edit the CSV File

Open `scripts/players-template.csv` in Excel, Google Sheets, or any text editor.

**CSV Format:**
```csv
teamId,name,role,battingStyle,bowlingStyle,isAbroadPlayer,photoUrl
brk,Sandeep Lamichhane,bowler,Right-hand bat,Right-arm legbreak,false,
brk,Dipendra Airee,allrounder,Right-hand bat,Right-arm medium,false,
chr,Kushal Malla,allrounder,Left-hand bat,Right-arm offbreak,false,
```

**Column Definitions:**
- `teamId`: Team code (brk, chr, jnb, kry, ktg, lml, pka, spr)
- `name`: Player's full name
- `role`: One of: `batter`, `bowler`, `allrounder`, `wicketkeeper`
- `battingStyle`: e.g., "Right-hand bat", "Left-hand bat"
- `bowlingStyle`: e.g., "Right-arm fast", "Left-arm orthodox" (leave empty for batters)
- `isAbroadPlayer`: `true` or `false` (for international players)
- `photoUrl`: URL or path to photo (optional, leave empty for no photo)

**Team Codes:**
- `brk` = Biratnagar Kings
- `chr` = Chitwan Rhinos
- `jnb` = Janakpur Bolts
- `kry` = Karnali Yaks
- `ktg` = Kathmandu Gorkhas
- `lml` = Lumbini Lions
- `pka` = Pokhara Avengers
- `spr` = Sudurpaschim Royals

### Step 2: Import to Database

```bash
npm run import-players
```

Or specify a custom CSV file:
```bash
npm run import-players scripts/my-players.csv
```

**What happens:**
- ✅ Deletes all existing players
- ✅ Imports new players from CSV
- ✅ Shows progress in terminal
- ✅ Players available immediately in app

---

## Method 2: Python Scraper (Automated from ESPN Cricinfo) 🤖

**Best for:** Getting real player data automatically from ESPN Cricinfo.

### Step 1: Setup (One-time)

```bash
cd scripts
./setup-scraper.sh
```

This installs required Python packages (`requests`, `beautifulsoup4`, `certifi`).

### Step 2: Run the Scraper

```bash
cd scripts
python3 scrape-players.py
```

**What it does:**
1. Visits ESPN Cricinfo squad pages for all 8 teams
2. Extracts player information (name, photo, batting/bowling style, role)
3. Downloads player photos to `/public/players/`
4. Saves JSON files to `player-data/` folder

**Output:**
```
player-data/
  ├── brk-players.json
  ├── chr-players.json
  ├── jnb-players.json
  ├── kry-players.json
  ├── ktg-players.json
  ├── lml-players.json
  ├── pka-players.json
  ├── spr-players.json
  └── all-players.json

public/players/
  ├── sandeep-lamichhane.jpg
  ├── dipendra-airee.jpg
  └── ...
```

### Step 3: Convert JSON to CSV (Optional)

After scraping, you can:
1. Review the JSON files
2. Manually create CSV from JSON data
3. Or use the JSON files directly (see Method 3)

### Step 4: Import to Database

Use Method 1 (CSV import) or Method 3 (JSON import) to add scraped data to Firestore.

**Note:** The scraper may need updates if ESPN Cricinfo changes their website structure.

---

## Method 3: JSON Import (If You Have JSON Data) 📄

**Best for:** When you have JSON files ready (from scraper or other source).

### Option A: Convert JSON to CSV First

1. Open the JSON file (e.g., `player-data/all-players.json`)
2. Convert to CSV format matching the template
3. Use Method 1 to import

### Option B: Create a JSON Import Script

If you prefer direct JSON import, I can create a script for you. The JSON structure should be:

```json
[
  {
    "name": "Sandeep Lamichhane",
    "teamId": "brk",
    "role": "bowler",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm legbreak",
    "isAbroadPlayer": false,
    "photoUrl": "/players/sandeep-lamichhane.jpg"
  }
]
```

---

## 🎨 Adding Player Photos

### Option 1: External URLs
In CSV, use full URLs:
```csv
brk,Sandeep Lamichhane,bowler,Right-hand bat,Right-arm legbreak,false,https://example.com/sandeep.jpg
```

### Option 2: Local Files (Recommended)
1. Download player photos
2. Save to `public/players/` directory
3. Name them clearly: `sandeep-lamichhane.jpg`
4. In CSV, use: `/players/sandeep-lamichhane.jpg`

**Photo Tips:**
- Keep images under 200KB for fast loading
- Use JPG or PNG format
- Recommended size: 200x200px to 400x400px
- Square aspect ratio works best

---

## 🔄 Current Player Data Status

**Current State:**
- CSV template has **24 sample players** (3 per team)
- JSON files are **empty** (scraper not run yet)
- Database likely has **dummy data** from seed script

**To Check Current Players:**
1. Go to Firebase Console → Firestore → `players` collection
2. Or check the app's player dropdowns

---

## ⚡ Quick Start (Recommended Workflow)

**For Real Player Data:**

1. **Run the scraper:**
   ```bash
   cd scripts
   ./setup-scraper.sh
   python3 scrape-players.py
   ```

2. **Review scraped data:**
   ```bash
   cat scripts/player-data/all-players.json
   ```

3. **Convert to CSV** (manually or create a script)

4. **Import to database:**
   ```bash
   npm run import-players
   ```

**For Manual Entry:**

1. **Edit CSV:**
   ```bash
   # Open in your favorite editor
   code scripts/players-template.csv
   ```

2. **Import:**
   ```bash
   npm run import-players
   ```

---

## 🐛 Troubleshooting

### "Import failed" or "CSV file not found"
- ✅ Check CSV file path
- ✅ Ensure CSV format is correct (no extra commas)
- ✅ Verify `.env.local` has Firebase credentials
- ✅ Check teamId matches exactly (lowercase: brk, chr, etc.)

### "Scraper not finding players"
- ✅ ESPN Cricinfo website structure may have changed
- ✅ Check internet connection
- ✅ Verify team URLs in `scrape-players.py` are correct
- ✅ ESPN may block too many requests (script has delays)

### "Players not showing in app"
- ✅ Clear browser cache (Cmd+Shift+R on Mac)
- ✅ Check Firebase Console to confirm data exists
- ✅ Look at browser console for errors (F12)
- ✅ Verify player photos are accessible

### "Photos not loading"
- ✅ Check image URLs are correct
- ✅ For local images, verify they're in `public/players/` folder
- ✅ Image must be jpg, png, or webp format
- ✅ Check file permissions

---

## 📊 Data Structure Reference

**Player Object in Firestore:**
```typescript
{
  teamId: string;              // 'brk', 'chr', etc.
  name: string;                // Full name
  role: 'batter' | 'bowler' | 'allrounder' | 'wicketkeeper';
  battingStyle: string;        // e.g., "Right-hand bat"
  bowlingStyle: string;        // e.g., "Right-arm fast"
  isAbroadPlayer: boolean;      // true for international players
  photoUrl: string | null;     // URL or path to photo
}
```

**Player ID Format:**
- Auto-generated: `{teamId}-player-{number}`
- Example: `brk-player-1`, `chr-player-2`

---

## 🚀 Next Steps

1. **Choose your method** (CSV is easiest for now)
2. **Update the CSV** with real player data
3. **Run import:** `npm run import-players`
4. **Test in app:** Check player dropdowns work
5. **Add photos:** Download and add to `public/players/`

---

## 💡 Pro Tips

1. **Start Small:** Test with 1-2 players first
2. **Backup First:** Export current data from Firebase Console
3. **Batch Updates:** You can add 100+ players at once
4. **No App Restart:** Changes reflect immediately (refresh browser)
5. **Photo Optimization:** Compress images before uploading
6. **Data Validation:** Double-check team IDs and roles

---

**Need Help?**
- Check `scripts/PLAYERS_UPDATE_GUIDE.md` for more details
- Review `scripts/SCRAPER_README.md` for scraper info
- Check Firebase Console for current data
- Review CSV template format carefully

---

**Last Updated:** Based on current codebase structure  
**Status:** Ready to use - CSV import is the quickest method

