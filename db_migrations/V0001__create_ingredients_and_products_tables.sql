CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    e_number VARCHAR(50),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    category VARCHAR(20) NOT NULL CHECK (category IN ('healthy', 'neutral', 'harmful')),
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_ingredients (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, ingredient_id)
);

CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_score ON ingredients(score);
CREATE INDEX idx_products_score ON products(score);
CREATE INDEX idx_products_scan_date ON products(scan_date);

INSERT INTO ingredients (name, e_number, score, category, description) VALUES
('Пшеничная мука', NULL, 65, 'neutral', 'Источник углеводов и клетчатки, основа для выпечки'),
('Витамин B12', NULL, 95, 'healthy', 'Важен для нервной системы и образования красных кровяных телец'),
('Глутамат натрия', 'E621', 25, 'harmful', 'Усилитель вкуса, может вызывать аллергические реакции и головные боли'),
('Натуральный яблочный сок', NULL, 88, 'healthy', 'Богат витаминами C и антиоксидантами, поддерживает иммунитет'),
('Сахар', NULL, 45, 'neutral', 'Быстрые углеводы, употреблять умеренно. Избыток ведет к ожирению'),
('Нитрит натрия', 'E250', 15, 'harmful', 'Консервант, используется в колбасах. Потенциально канцерогенен'),
('Аскорбиновая кислота', 'E300', 92, 'healthy', 'Витамин C, мощный антиоксидант, укрепляет иммунную систему'),
('Диоксид серы', 'E220', 20, 'harmful', 'Консервант, может вызывать астматические реакции и аллергию'),
('Лецитин', 'E322', 78, 'healthy', 'Эмульгатор природного происхождения, полезен для мозга'),
('Бензоат натрия', 'E211', 30, 'harmful', 'Консервант, может образовывать канцерогены при взаимодействии с витамином C'),
('Каррагинан', 'E407', 40, 'neutral', 'Загуститель из морских водорослей, безопасен в малых дозах'),
('Тартразин', 'E102', 18, 'harmful', 'Синтетический краситель, может вызывать гиперактивность у детей'),
('Цельнозерновая мука', NULL, 85, 'healthy', 'Богата клетчаткой, витаминами группы B и минералами'),
('Пальмовое масло', NULL, 35, 'harmful', 'Высокое содержание насыщенных жиров, повышает холестерин'),
('Оливковое масло', NULL, 90, 'healthy', 'Источник полезных жирных кислот и антиоксидантов');
