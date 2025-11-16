#!/bin/bash

echo "🔧 Setting up NPL Player Scraper..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Install required packages
echo "📦 Installing required Python packages..."
pip3 install requests beautifulsoup4 certifi --quiet

echo ""
echo "🔐 Setting up SSL certificates..."
pip3 install --upgrade certifi --quiet

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To run the scraper, execute:"
echo "   cd scripts"
echo "   python3 scrape-players.py"
echo ""

