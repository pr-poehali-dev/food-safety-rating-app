import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Ingredient {
  name: string;
  score: number;
  description: string;
  category: 'healthy' | 'neutral' | 'harmful';
}

interface Product {
  id: string;
  name: string;
  score: number;
  ingredients: Ingredient[];
  scanDate: string;
}

const mockIngredients: Ingredient[] = [
  { name: 'Пшеничная мука', score: 65, description: 'Источник углеводов и клетчатки', category: 'neutral' },
  { name: 'Витамин B12', score: 95, description: 'Важен для нервной системы', category: 'healthy' },
  { name: 'Е621 (Глутамат натрия)', score: 25, description: 'Усилитель вкуса, может вызывать аллергию', category: 'harmful' },
  { name: 'Натуральный яблочный сок', score: 88, description: 'Богат витаминами и антиоксидантами', category: 'healthy' },
  { name: 'Сахар', score: 45, description: 'Быстрые углеводы, употреблять умеренно', category: 'neutral' },
  { name: 'Е250 (Нитрит натрия)', score: 15, description: 'Консервант, потенциально вреден', category: 'harmful' },
];

const mockHistory: Product[] = [
  {
    id: '1',
    name: 'Йогурт натуральный',
    score: 87,
    ingredients: mockIngredients.slice(0, 3),
    scanDate: '2024-01-15',
  },
  {
    id: '2',
    name: 'Колбаса варёная',
    score: 42,
    ingredients: mockIngredients.slice(2, 5),
    scanDate: '2024-01-14',
  },
];

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
};

const getScoreBg = (score: number) => {
  if (score >= 70) return 'from-green-500/20 to-green-500/5';
  if (score >= 40) return 'from-orange-500/20 to-orange-500/5';
  return 'from-red-500/20 to-red-500/5';
};

const getScoreBorder = (score: number) => {
  if (score >= 70) return 'border-green-500/50';
  if (score >= 40) return 'border-orange-500/50';
  return 'border-red-500/50';
};

const getCategoryBadge = (category: string) => {
  switch (category) {
    case 'healthy':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Полезно</Badge>;
    case 'harmful':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Вредно</Badge>;
    default:
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Нейтрально</Badge>;
  }
};

export default function Index() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: 'Новый продукт',
        score: Math.floor(Math.random() * 100),
        ingredients: mockIngredients,
        scanDate: new Date().toISOString().split('T')[0],
      };
      setSelectedProduct(newProduct);
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card pb-20">
      <div className="container max-w-md mx-auto px-4 py-6">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            FoodCheck
          </h1>
          <p className="text-muted-foreground">Узнай правду о продуктах</p>
        </div>

        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="scanner" className="gap-2">
              <Icon name="Camera" size={18} />
              Сканер
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <Icon name="Info" size={18} />
              Детали
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Icon name="History" size={18} />
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-6 animate-scale-in">
            <Card className="relative overflow-hidden border-2 border-border">
              <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                {isScanning ? (
                  <div className="text-center space-y-4 animate-pulse-glow">
                    <Icon name="ScanLine" size={64} className="mx-auto text-primary" />
                    <p className="text-lg font-medium">Сканирование...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Icon name="Camera" size={64} className="mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground px-4">
                      Наведите камеру на состав продукта
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-primary hover:from-green-600 hover:to-primary/90 transition-all duration-300 hover:scale-[1.02]"
            >
              {isScanning ? (
                <>
                  <Icon name="Loader2" size={24} className="animate-spin mr-2" />
                  Анализирую состав...
                </>
              ) : (
                <>
                  <Icon name="ScanLine" size={24} className="mr-2" />
                  Сканировать продукт
                </>
              )}
            </Button>

            {selectedProduct && (
              <Card className={`p-6 border-2 bg-gradient-to-br ${getScoreBg(selectedProduct.score)} ${getScoreBorder(selectedProduct.score)} animate-slide-up`}>
                <div className="text-center mb-6">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${selectedProduct.score * 3.77} 377`}
                        className={`${getScoreColor(selectedProduct.score)} transition-all duration-1000`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(selectedProduct.score)}`}>
                          {selectedProduct.score}
                        </div>
                        <div className="text-xs text-muted-foreground">из 100</div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.score >= 70
                      ? '✅ Полезный продукт'
                      : selectedProduct.score >= 40
                      ? '⚠️ Умеренно вредный'
                      : '❌ Вредный продукт'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ингредиентов проанализировано:</span>
                    <span className="font-semibold">{selectedProduct.ingredients.length}</span>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4 animate-scale-in">
            {selectedProduct ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-4">Состав продукта</h2>
                {selectedProduct.ingredients.map((ingredient, idx) => (
                  <Card
                    key={idx}
                    className="p-4 hover:scale-[1.02] transition-transform duration-200 border-2"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{ingredient.name}</h3>
                        <p className="text-sm text-muted-foreground">{ingredient.description}</p>
                      </div>
                      {getCategoryBadge(ingredient.category)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Оценка:</span>
                        <span className={`font-bold ${getScoreColor(ingredient.score)}`}>
                          {ingredient.score}/100
                        </span>
                      </div>
                      <Progress value={ingredient.score} className="h-2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Icon name="PackageOpen" size={64} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Сначала отсканируйте продукт для просмотра деталей
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 animate-scale-in">
            <h2 className="text-2xl font-bold mb-4">История сканирований</h2>
            {mockHistory.map((product) => (
              <Card
                key={product.id}
                className="p-4 hover:scale-[1.02] transition-transform duration-200 cursor-pointer border-2"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(product.scanDate).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreColor(product.score)}`}>
                      {product.score}
                    </div>
                    <div className="text-xs text-muted-foreground">из 100</div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
