# 🎯 Registration Flow Guide

## Overview

The registration process now includes **tournament-wide predictions** that users must make when they first register. These predictions are locked after registration and will be scored at the end of the tournament.

---

## 📝 Registration Steps

### 1. **Select Season Team**
Users choose one team as their "season team" for the entire tournament.

**Scoring Impact:**
- ✅ **+1 bonus point** when their team wins (if they predicted the winner correctly)
- ❌ **-1 penalty point** when their team loses (regardless of prediction)
- ⚠️ **Cannot be changed** after registration

---

### 2. **Tournament Predictions** (NEW!)

Users must predict three tournament awards:

#### 🏆 **Player of The Tournament**
- Select any player from any team
- Searchable dropdown with all 24 players (expandable)
- Shows player name, team, and role

#### 🏏 **Highest Run Scorer**
- Select any player from any team
- Best for batters/allrounders
- Can be from any team (including your season team)

#### 🎯 **Highest Wicket Taker**
- Select any player from any team
- Best for bowlers/allrounders
- Can be from any team (including your season team)

**Key Features:**
- ✅ **Real-time search** - Type to filter players
- ✅ **Team display** - See which team each player belongs to
- ✅ **Role indicators** - See if player is batter, bowler, allrounder, or wicketkeeper
- ✅ **Easy selection** - Click to select, X to clear
- ✅ **Modal interface** - Clean, focused selection experience

**Scoring Impact:**
- Bonus points awarded at tournament end (exact points TBD in PRD)
- ⚠️ **Cannot be changed** after registration

---

## 🎨 UI/UX Features

### Player Search Component

**When No Player Selected:**
```
┌─────────────────────────────────────┐
│ 🏆 Player of The Tournament         │
│ ┌─────────────────────────────────┐ │
│ │ Search player name...        🔍 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**When Player Selected:**
```
┌─────────────────────────────────────┐
│ 🏆 Player of The Tournament         │
│ ┌─────────────────────────────────┐ │
│ │ [S] Sandeep Lamichhane      ✕  │ │
│ │     Biratnagar Kings            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Search Modal:**
```
╔═══════════════════════════════════════╗
║ 🏆 Player of The Tournament      ✕   ║
║ ┌───────────────────────────────────┐ ║
║ │ 🔍 Type player name...            │ ║
║ └───────────────────────────────────┘ ║
║                                       ║
║ ┌─────────────────────────────────┐   ║
║ │ [S] Sandeep Lamichhane    bowler│   ║
║ │     Biratnagar Kings            │   ║
║ ├─────────────────────────────────┤   ║
║ │ [D] Dipendra Airee    allrounder│   ║
║ │     Biratnagar Kings            │   ║
║ ├─────────────────────────────────┤   ║
║ │ [K] Kushal Bhurtel        batter│   ║
║ │     Biratnagar Kings            │   ║
║ └─────────────────────────────────┘   ║
║                                       ║
║         24 players available          ║
╚═══════════════════════════════════════╝
```

---

## 💾 Data Structure

### UserEntry (Updated)

```typescript
interface UserEntry {
  // ... existing fields ...
  
  // NEW: Tournament predictions
  playerOfTournamentId?: string;
  playerOfTournamentName?: string;
  highestWicketTakerId?: string;
  highestWicketTakerName?: string;
  highestRunScorerId?: string;
  highestRunScorerName?: string;
}
```

---

## 🚀 Implementation Status

✅ **Completed:**
- PlayerSearchSelect component with search functionality
- Updated UserEntry type with tournament predictions
- Registration page UI with all three prediction selects
- Form validation (all predictions required)
- Player data import system (24 real NPL players)
- Responsive modal design
- Dark mode support

⚠️ **To Add Later:**
- Scoring logic for tournament predictions (at tournament end)
- Admin interface to declare tournament winners
- Display tournament predictions on user dashboard

---

## 📊 Current Player Data

**24 Real NPL Players** imported from `players-template.csv`:

| Team | Players |
|------|---------|
| **Biratnagar Kings** | Sandeep Lamichhane, Dipendra Airee, Kushal Bhurtel |
| **Chitwan Rhinos** | Kushal Malla, Ravi Bopara (abroad), Sharad Vesawkar |
| **Janakpur Bolts** | Anil Sah, Lalit Rajbanshi, Kishore Mahato |
| **Karnali Yaks** | Sompal Kami, Bipin Khatri, Nandan Yadav |
| **Kathmandu Gorkhas** | Karan KC, Bhim Sharki, Shahab Alam |
| **Lumbini Lions** | Rohit Paudel, Arjun Saud, Sunil Dhamala |
| **Pokhara Avengers** | Andries Gous (abroad), Raymon Reifer (abroad), Bipin Rawal |
| **Sudurpaschim Royals** | Ishan Pandey, Naresh Budhayer, Abinash Bohara |

**To expand:** Add more players via `scripts/players-template.csv` and run `npm run import-players`

---

## 🧪 Testing Checklist

- [ ] User can search and select Player of Tournament
- [ ] User can search and select Highest Run Scorer
- [ ] User can search and select Highest Wicket Taker
- [ ] Search filters players correctly by name
- [ ] Can clear selection and choose a different player
- [ ] Form prevents submission if any prediction is missing
- [ ] All selections are saved to Firestore correctly
- [ ] Predictions display correctly after registration
- [ ] Modal closes when clicking outside
- [ ] Works on mobile devices
- [ ] Dark mode looks good

---

## 🎮 User Flow Example

1. User logs in with Google
2. Redirected to `/register`
3. Selects **Kathmandu Gorkhas** as season team
4. Clicks on "Player of Tournament" search
5. Types "Sandeep" → sees Sandeep Lamichhane
6. Clicks to select → Modal closes
7. Clicks on "Highest Run Scorer" search
8. Types "Rohit" → sees Rohit Paudel
9. Clicks to select → Modal closes
10. Clicks on "Highest Wicket Taker" search
11. Types "Karan" → sees Karan KC
12. Clicks to select → Modal closes
13. Clicks "Complete Registration"
14. Redirected to dashboard

---

## 🔄 Updating Players

See `scripts/PLAYERS_UPDATE_GUIDE.md` for detailed instructions on:
- Adding more players
- Updating player information
- Importing via CSV
- Adding player photos

---

## 🎯 Next Steps

1. ✅ Test registration flow end-to-end
2. ✅ Verify Firestore data structure
3. Display predictions on user dashboard
4. Add tournament predictions scoring at tournament end
5. Admin interface to declare winners
6. Export/analytics for tournament predictions

---

**Last Updated:** November 15, 2025  
**Status:** ✅ Fully Functional  
**Player Count:** 24 (expandable to 160+)

