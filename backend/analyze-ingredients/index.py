import json
import os
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Анализирует список ингредиентов и возвращает оценки из базы данных
    Args: event с методом POST, body содержит массив названий ингредиентов
    Returns: Массив ингредиентов с оценками и описаниями
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        ingredient_names: List[str] = body_data.get('ingredients', [])
        
        if not ingredient_names:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Ingredients list is required'})
            }
        
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Database not configured'})
            }
        
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        analyzed_ingredients = []
        total_score = 0
        
        for ing_name in ingredient_names:
            search_term = f'%{ing_name.lower()}%'
            
            cur.execute(
                "SELECT id, name, e_number, score, category, description FROM ingredients WHERE LOWER(name) LIKE %s OR (e_number IS NOT NULL AND LOWER(e_number) LIKE %s) ORDER BY score DESC LIMIT 1",
                (search_term, search_term)
            )
            
            result = cur.fetchone()
            
            if result:
                analyzed_ingredients.append({
                    'id': result['id'],
                    'name': result['name'],
                    'e_number': result['e_number'],
                    'score': result['score'],
                    'category': result['category'],
                    'description': result['description']
                })
                total_score += result['score']
            else:
                analyzed_ingredients.append({
                    'id': None,
                    'name': ing_name,
                    'e_number': None,
                    'score': 50,
                    'category': 'neutral',
                    'description': 'Информация об ингредиенте отсутствует в базе'
                })
                total_score += 50
        
        cur.close()
        conn.close()
        
        avg_score = round(total_score / len(ingredient_names)) if ingredient_names else 0
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'ingredients': analyzed_ingredients,
                'total_score': avg_score,
                'count': len(analyzed_ingredients)
            })
        }
        
    except json.JSONDecodeError as e:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Invalid JSON: {str(e)}'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
