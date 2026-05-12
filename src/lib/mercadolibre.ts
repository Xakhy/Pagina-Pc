export interface MeLiProduct {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  permalink: string;
  condition: string;
  attributes: any[];
}

export async function searchMeLiProducts(query: string, limit: number = 10): Promise<MeLiProduct[]> {
  try {
    const response = await fetch(`https://api.mercadolibre.com/sites/MPE/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    const data = await response.json();
    
    return data.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      // Usamos una versión de mayor calidad de la imagen reemplajando la 'I' por una 'W'
      thumbnail: item.thumbnail.replace('-I.jpg', '-W.jpg'),
      permalink: item.permalink,
      condition: item.condition,
      attributes: item.attributes || []
    }));
  } catch (error) {
    console.error('Error fetching from MeLi:', error);
    return [];
  }
}

export async function getMeLiProductDetails(id: string) {
  try {
    const [itemRes, descRes] = await Promise.all([
      fetch(`https://api.mercadolibre.com/items/${id}`),
      fetch(`https://api.mercadolibre.com/items/${id}/description`)
    ]);
    
    const item = await itemRes.json();
    const description = await descRes.json();
    
    return {
      ...item,
      full_description: description.plain_text,
      pictures: item.pictures?.map((p: any) => p.url) || [item.thumbnail]
    };
  } catch (error) {
    console.error('Error fetching MeLi details:', error);
    return null;
  }
}
