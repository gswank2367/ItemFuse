ItemFuse rarity color theming patch

Adds subtle CS2 rarity-based accents to the shared ItemDisplayCard component, which carries across Inventory, Friends inventories, Wishlist, Trades, Matches, Discover and offer detail pages wherever the shared card is used.

Theme mapping:
- Consumer Grade: pale steel
- Industrial Grade: light blue
- Mil-Spec / High Grade / Distinguished: blue
- Restricted / Remarkable / Exceptional: purple
- Classified / Exotic / Superior: pink-magenta
- Covert / Master: red
- Extraordinary / Contraband: gold
- Base Grade / Stock: muted steel

Visual treatment:
- rarity-tinted card border
- subtle image glow
- thin top accent
- rarity badge
- rarity-tinted details modal
- restrained hover glow

No database migration and no API/environment changes are required.
