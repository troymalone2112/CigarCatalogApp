# Update Tobacco Background Image

## Once you save the tobacco leaf image:

1. **Save the golden tobacco leaves image** as:
   ```
   /Users/troymalone/CigarCatalogApp/assets/tobacco-leaves-bg.jpg
   ```

2. **Then update this line** in `src/screens/HomeScreen.tsx` (around line 109):
   
   **Change from:**
   ```javascript
   source={require('../../assets/icon.png')} // Fallback until tobacco-leaves-bg.jpg is added
   ```
   
   **Change to:**
   ```javascript
   source={require('../../assets/tobacco-leaves-bg.jpg')}
   ```

## What this creates:
- ✅ Beautiful golden tobacco leaf background at 12% opacity
- ✅ Subtle texture that doesn't interfere with text readability  
- ✅ Authentic cigar industry atmosphere
- ✅ Perfect complement to the blue theme
- ✅ Only affects main content areas (not header/footer)

The tobacco leaves will add an elegant, authentic touch to your cigar catalog! 🍃















