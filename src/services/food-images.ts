export const imageCache = new Map<string, string | null>();

export async function getFoodImageForRecipe(title: string): Promise<string | null> {
  if (imageCache.has(title)) {
    return imageCache.get(title) || null;
  }

  // Extract the raw food name by grabbing the primary component before "and" or "with"
  let rawFoodName = title;
  if (title.includes(' and ')) rawFoodName = title.split(' and ')[0];
  else if (title.includes(' with ')) rawFoodName = title.split(' with ')[0];

  // We use TheMealDB, a 100% free, no-quota API for food recipes and high-res images.
  // TheMealDB requires searching by a primary ingredient to guarantee a result.
  const words = rawFoodName.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean);
  const coreNoun = words[words.length - 1] || 'chicken'; // Default to a safe category if parsing fails
  
  try {
    // Attempt to filter TheMealDB by the core ingredient (e.g. 'Beef', 'Chicken', 'Salmon')
    const url = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(coreNoun)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.meals && data.meals.length > 0) {
      // Pick a deterministic but varying image from the results based on the title's length
      const index = title.length % data.meals.length;
      const imageUrl = data.meals[index].strMealThumb;
      
      // Use the high quality original image instead of the low-res preview
      const thumbnailUrl = imageUrl;
      
      imageCache.set(title, thumbnailUrl);
      return thumbnailUrl;
    }

    // Fallback: If TheMealDB didn't recognize the ingredient (e.g. 'Tofu' or 'Oats'), 
    // we query a generic fallback category like 'Chicken' to guarantee a food image.
    const fallbackUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?i=chicken`;
    const fallbackResponse = await fetch(fallbackUrl);
    const fallbackData = await fallbackResponse.json();
    
    if (fallbackData && fallbackData.meals && fallbackData.meals.length > 0) {
      const index = title.length % fallbackData.meals.length;
      const imageUrl = fallbackData.meals[index].strMealThumb;
      imageCache.set(title, imageUrl);
      return imageUrl;
    }
  } catch (err) {
    console.error('Error fetching image from TheMealDB:', err);
  }

  imageCache.set(title, null);
  return null;
}
