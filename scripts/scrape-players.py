#!/usr/bin/env python3
"""
NPL Player Scraper
Scrapes player data from ESPN Cricinfo and downloads profile pictures
"""

import requests
from bs4 import BeautifulSoup
import json
import os
import re
from urllib.parse import urljoin
import time

# Try to import certifi for SSL, but don't fail if not available
try:
    import certifi
    HAS_CERTIFI = True
except ImportError:
    HAS_CERTIFI = False

# Team mappings
TEAMS = {
    'Biratnagar Kings': {
        'id': 'brk',
        'url': 'https://www.espncricinfo.com/series/nepal-premier-league-2025-26-1510976/biratnagar-kings-squad-1511081/series-squads'
    },
    'Chitwan Rhinos': {
        'id': 'chr',
        'url': 'https://www.espncricinfo.com/series/nepal-premier-league-2025-26-1510976/chitwan-rhinos-squad-1511082/series-squads'
    },
    'Janakpur Bolts': {
        'id': 'jnb',
        'url': 'https://www.espncricinfo.com/series/nepal-premier-league-2025-26-1510976/janakpur-bolts-squad-1511083/series-squads'
    },
    'Karnali Yaks': {
        'id': 'kry',
        'url': 'https://www.espncricinfo.com/series/nepal-premier-league-2025-26-1510976/karnali-yaks-squad-1511084/series-squads'
    },
    'Kathmandu Gorkhas': {
        'id': 'ktg',
        'url': 'https://www.espncricinfo.com/series/nepal-premier-league-2025-26-1510976/kathmandu-gurkhas-squad-1511085/series-squads'
    },
    'Lumbini Lions': {
        'id': 'lml',
        'url': 'https://www.espncricinfo.com/series/nepal-premier-league-2025-26-1510976/lumbini-lions-squad-1511086/series-squads'
    },
    'Pokhara Avengers': {
        'id': 'pka',
        'url': 'https://www.espncricinfo.com/series/nepal-premier-league-2025-26-1510976/pokhara-avengers-squad-1511087/series-squads'
    },
    'Sudurpaschim Royals': {
        'id': 'spr',
        'url': 'https://www.espncricinfo.com/series/nepal-premier-league-2025-26-1510976/sudurpaschim-royals-squad-1511088/series-squads'
    }
}

# Create directories
os.makedirs('../public/players', exist_ok=True)
os.makedirs('player-data', exist_ok=True)

# Create a session with proper SSL
session = requests.Session()
if HAS_CERTIFI:
    session.verify = certifi.where()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

def clean_filename(name):
    """Convert player name to valid filename"""
    # Remove special characters and convert to lowercase
    clean = re.sub(r'[^a-zA-Z0-9\s-]', '', name)
    clean = clean.lower().replace(' ', '-')
    return clean

def download_image(url, filepath):
    """Download image from URL and save to filepath"""
    try:
        response = session.get(url, timeout=10)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"  ✓ Downloaded: {os.path.basename(filepath)}")
            return True
    except Exception as e:
        print(f"  ✗ Failed to download image: {e}")
    return False

def scrape_team_squad(team_name, team_data):
    """Scrape squad data for a team"""
    print(f"\n🏏 Scraping {team_name}...")
    
    try:
        response = session.get(team_data['url'])
        soup = BeautifulSoup(response.content, 'html.parser')
        
        players = []
        
        # Find all player cards/entries
        # ESPN Cricinfo uses different structures, we'll try multiple selectors
        player_elements = soup.find_all('div', class_='ds-border-line')
        
        if not player_elements:
            player_elements = soup.find_all('tr', class_='ds-border-b')
        
        print(f"  Found {len(player_elements)} potential player entries")
        
        for idx, element in enumerate(player_elements, 1):
            try:
                # Extract player name
                name_elem = element.find('a', href=re.compile(r'/player/'))
                if not name_elem:
                    continue
                
                player_name = name_elem.text.strip()
                player_url = urljoin(team_data['url'], name_elem['href'])
                
                # Get player details page for more info
                player_details = get_player_details(player_url)
                
                # Extract photo URL
                photo_url = None
                img_elem = element.find('img')
                if img_elem and 'src' in img_elem.attrs:
                    photo_url = img_elem['src']
                
                # Download photo if available
                photo_filename = None
                if photo_url:
                    clean_name = clean_filename(player_name)
                    photo_filename = f"{clean_name}.jpg"
                    photo_path = f"../public/players/{photo_filename}"
                    
                    if download_image(photo_url, photo_path):
                        photo_filename = f"/players/{photo_filename}"
                
                # Determine if abroad player (usually marked as "Overseas" or non-Nepal)
                is_abroad = player_details.get('is_abroad', False)
                
                player_data = {
                    'name': player_name,
                    'photoUrl': photo_filename,
                    'isAbroadPlayer': is_abroad,
                    'battingStyle': player_details.get('batting_style', 'Unknown'),
                    'bowlingStyle': player_details.get('bowling_style', 'Unknown'),
                    'position': player_details.get('position', 'Player'),
                    'teamId': team_data['id']
                }
                
                players.append(player_data)
                print(f"  ✓ {idx}. {player_name} - {player_data['position']}")
                
                # Be nice to the server
                time.sleep(0.5)
                
            except Exception as e:
                print(f"  ✗ Error processing player: {e}")
                continue
        
        return players
        
    except Exception as e:
        print(f"  ✗ Error scraping {team_name}: {e}")
        return []

def get_player_details(player_url):
    """Get detailed player information from player profile page"""
    try:
        response = session.get(player_url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        details = {
            'batting_style': 'Unknown',
            'bowling_style': 'Unknown',
            'position': 'Player',
            'is_abroad': False
        }
        
        # Try to find player info section
        info_items = soup.find_all('div', class_='ds-grid')
        
        for item in info_items:
            text = item.text.lower()
            
            # Extract batting style
            if 'batting style' in text or 'bats' in text:
                if 'right' in text:
                    details['batting_style'] = 'Right-hand bat'
                elif 'left' in text:
                    details['batting_style'] = 'Left-hand bat'
            
            # Extract bowling style
            if 'bowling style' in text or 'bowls' in text:
                if 'right-arm fast' in text or 'right arm fast' in text:
                    details['bowling_style'] = 'Right-arm fast'
                elif 'left-arm fast' in text or 'left arm fast' in text:
                    details['bowling_style'] = 'Left-arm fast'
                elif 'right-arm medium' in text or 'right arm medium' in text:
                    details['bowling_style'] = 'Right-arm medium'
                elif 'left-arm medium' in text or 'left arm medium' in text:
                    details['bowling_style'] = 'Left-arm medium'
                elif 'right-arm offbreak' in text or 'off break' in text:
                    details['bowling_style'] = 'Right-arm offbreak'
                elif 'left-arm orthodox' in text or 'slow left-arm orthodox' in text:
                    details['bowling_style'] = 'Left-arm orthodox'
                elif 'legbreak' in text or 'leg break' in text:
                    details['bowling_style'] = 'Legbreak'
            
            # Extract playing role/position
            if 'playing role' in text or 'role' in text:
                if 'batsman' in text or 'batter' in text:
                    if 'opening' in text:
                        details['position'] = 'Opening Batter'
                    elif 'middle' in text or 'top order' in text:
                        details['position'] = 'Top Order Batter'
                    else:
                        details['position'] = 'Batter'
                elif 'allrounder' in text or 'all-rounder' in text:
                    details['position'] = 'Allrounder'
                elif 'bowler' in text:
                    details['position'] = 'Bowler'
                elif 'wicketkeeper' in text or 'wicket keeper' in text:
                    details['position'] = 'Wicketkeeper'
            
            # Check if abroad/overseas player
            if 'country' in text or 'born' in text:
                if 'nepal' not in text.lower():
                    details['is_abroad'] = True
        
        return details
        
    except Exception as e:
        print(f"    Warning: Could not get player details: {e}")
        return {
            'batting_style': 'Unknown',
            'bowling_style': 'Unknown',
            'position': 'Player',
            'is_abroad': False
        }

def main():
    """Main scraping function"""
    print("🏏 NPL Player Scraper")
    print("=" * 50)
    
    all_players = []
    
    for team_name, team_data in TEAMS.items():
        players = scrape_team_squad(team_name, team_data)
        all_players.extend(players)
        
        # Save individual team file
        team_file = f"player-data/{team_data['id']}-players.json"
        with open(team_file, 'w', encoding='utf-8') as f:
            json.dump(players, f, indent=2, ensure_ascii=False)
        
        print(f"  ✓ Saved {len(players)} players to {team_file}")
        
        # Be nice to the server between teams
        time.sleep(2)
    
    # Save combined file
    combined_file = "player-data/all-players.json"
    with open(combined_file, 'w', encoding='utf-8') as f:
        json.dump(all_players, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Scraping complete!")
    print(f"   Total players: {len(all_players)}")
    print(f"   Data saved to: player-data/")
    print(f"   Photos saved to: ../public/players/")
    print(f"\n📋 Next step: Run 'npm run seed-players' to import to database")

if __name__ == "__main__":
    main()

