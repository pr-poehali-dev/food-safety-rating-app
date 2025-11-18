import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Возвращает рейтинг самых полезных и вредных ингредиентов
    Args: event с GET методом, query параметр type (harmful/healthy)
    Returns: Топ ингредиентов отсортированных по оценке
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Database not configured'})
            }
        
        query_params = event.get('queryStringParameters', {}) or {}
        rating_type = query_params.get('type', 'all')
        limit = int(query_params.get('limit', '10'))
        
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if rating_type == 'harmful':
            cur.execute(
                "SELECT id, name, e_number, score, category, description FROM ingredients WHERE category = 'harmful' ORDER BY score ASC LIMIT %s",
                (limit,)
            )
        elif rating_type == 'healthy':
            cur.execute(
                "SELECT id, name, e_number, score, category, description FROM ingredients WHERE category = 'healthy' ORDER BY score DESC LIMIT %s",
                (limit,)
            )
        else:
            cur.execute(
                "SELECT id, name, e_number, score, category, description FROM ingredients ORDER BY score DESC LIMIT %s",
                (limit,)
            )
        
        ingredients = cur.fetchall()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'ingredients': [dict(ing) for ing in ingredients],
                'type': rating_type,
                'count': len(ingredients)
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
