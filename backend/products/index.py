import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для работы с продуктами - получение, создание, поиск
    Args: event с GET/POST методами, query параметры для поиска
    Returns: Список продуктов или созданный продукт
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'})
        }
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            search = query_params.get('search', '')
            limit = int(query_params.get('limit', '20'))
            
            if search:
                search_term = f'%{search}%'
                cur.execute(
                    "SELECT id, name, score, scan_date, image_url FROM products WHERE LOWER(name) LIKE LOWER(%s) ORDER BY scan_date DESC LIMIT %s",
                    (search_term, limit)
                )
            else:
                cur.execute(
                    "SELECT id, name, score, scan_date, image_url FROM products ORDER BY scan_date DESC LIMIT %s",
                    (limit,)
                )
            
            products = cur.fetchall()
            
            result = []
            for product in products:
                cur.execute(
                    """SELECT i.id, i.name, i.e_number, i.score, i.category, i.description 
                       FROM ingredients i 
                       JOIN product_ingredients pi ON i.id = pi.ingredient_id 
                       WHERE pi.product_id = %s""",
                    (product['id'],)
                )
                ingredients = cur.fetchall()
                
                result.append({
                    'id': product['id'],
                    'name': product['name'],
                    'score': product['score'],
                    'scanDate': product['scan_date'].isoformat() if product['scan_date'] else None,
                    'imageUrl': product['image_url'],
                    'ingredients': [dict(ing) for ing in ingredients]
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'products': result, 'count': len(result)})
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            name = body_data.get('name', 'Неизвестный продукт')
            score = body_data.get('score', 50)
            ingredient_ids = body_data.get('ingredient_ids', [])
            image_url = body_data.get('image_url')
            
            cur.execute(
                "INSERT INTO products (name, score, image_url) VALUES (%s, %s, %s) RETURNING id",
                (name, score, image_url)
            )
            product_id = cur.fetchone()['id']
            
            for ing_id in ingredient_ids:
                cur.execute(
                    "INSERT INTO product_ingredients (product_id, ingredient_id) VALUES (%s, %s)",
                    (product_id, ing_id)
                )
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({
                    'id': product_id,
                    'name': name,
                    'score': score
                })
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
    except Exception as e:
        if conn:
            conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
