# 🏏 NPL Player Scraper

Automatically scrapes player data from ESPN Cricinfo for all 8 NPL teams.

## 📋 What It Does

- ✅ Scrapes player information from ESPN Cricinfo
- ✅ Downloads player profile pictures
- ✅ Extracts: Name, Photo, Batting Style, Bowling Style, Position, Abroad Player status
- ✅ Saves data as JSON files
- ✅ Organizes photos in `/public/players/`

---

## 🚀 Quick Start

### Step 1: Setup (One-time)

```bash
cd scripts
./setup-scraper.sh
```

This will install the required Python packages (`requests` and `beautifulsoup4`).

### Step 2: Run the Scraper

```bash
python3 scrape-players.py
```

The script will:
1. Visit each team's ESPN Cricinfo squad page
2. Extract player information
3. Download profile pictures to `/public/players/`
4. Save JSON data to `player-data/` folder

---

## 📁 Output

After running, you'll get:

```
player-data/
  ├── brk-players.json          # Biratnagar Kings
  ├── chr-players.json          # Chitwan Rhinos
  ├── jnb-players.json          # Janakpur Bolts
  ├── kry-players.json          # Karnali Yaks
  ├── ktg-players.json          # Kathmandu Gorkhas
  ├── lml-players.json          # Lumbini Lions
  ├── pka-players.json          # Pokhara Avengers
  ├── spr-players.json          # Sudurpaschim Royals
  └── all-players.json          # Combined (all teams)

public/players/
  ├── player-name-1.jpg
  ├── player-name-2.jpg
  └── ...
```

---

## 📊 Data Structure

Each player object looks like:

```json
{
  "name": "Player Name",
  "photoUrl": "/players/player-name.jpg",
  "isAbroadPlayer": false,
  "battingStyle": "Right-hand bat",
  "bowlingStyle": "Right-arm fast",
  "position": "Allrounder",
  "teamId": "brk"
}
```

---

## ⚙️ Configuration

Team URLs are configured in the script. If ESPN Cricinfo URLs change, edit `TEAMS` dictionary in `scrape-players.py`:

```python
TEAMS = {
    'Biratnagar Kings': {
        'id': 'brk',
        'url': 'https://www.espncricinfo.com/...'
    },
    # ...
}
```

---

## 🐛 Troubleshooting

### "Module not found" error
Run: `pip3 install requests beautifulsoup4`

### No players found
- Check if ESPN Cricinfo page structure changed
- Verify URLs are correct
- ESPN might block too many requests - the script waits between requests

### Images not downloading
- Check internet connection
- ESPN might have changed image URLs
- Script will continue without images (using placeholder)

---

## 🔄 Next Steps

After scraping:

1. Review the generated JSON files in `player-data/`
2. Create a seed script to import players to Firestore
3. Photos are ready in `/public/players/`

---

## 📝 Notes

- Script is polite: adds delays between requests
- Player details fetched from individual profile pages
- Handles missing data gracefully
- Photos are automatically renamed and organized

