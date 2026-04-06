import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Determine media type
    const mediaType = image.type || 'image/jpeg';

    // Call Anthropic Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Extract menu items from this image. For each item, provide:
- name (dish name)
- price (in rupees, as a number)
- category (appetizer, main course, dessert, beverage, etc.)

Return ONLY valid JSON in this exact format:
{
  "items": [
    {"name": "Paneer Tikka", "price": 180, "category": "Appetizer"},
    {"name": "Dal Makhani", "price": 220, "category": "Main Course"}
  ]
}

If you cannot extract menu items, return {"items": [], "error": "Could not parse menu"}.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: 'OCR processing failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const textContent = data.content.find((c: any) => c.type === 'text')?.text || '';

    // Extract JSON from response
    let parsedItems = { items: [] };
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedItems = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ items: [], error: 'Failed to parse menu data' });
    }

    return NextResponse.json(parsedItems);
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
