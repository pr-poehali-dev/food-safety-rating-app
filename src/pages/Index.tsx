import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Ingredient {
  id?: number;
  name: string;
  e_number?: string | null;
  score: number;
  description: string;
  category: 'healthy' | 'neutral' | 'harmful';
}

interface Product {
  id: number | string;
  name: string;
  score: number;
  ingredients: Ingredient[];
  scanDate: string;
  imageUrl?: string;
}

const API_URLS = {
  ocrAnalyze: 'https://functions.poehali.dev/71bc6bd8-ff17-44e2-bda6-2e4c67114dd3',
  analyzeIngredients: 'https://functions.poehali.dev/5213929a-4932-4813-992a-e8dd3bdd5d08',
  products: 'https://functions.poehali.dev/bf08e338-6dae-4d40-8942-69299c33890a',
  ingredientsRating: 'https://functions.poehali.dev/4da9a833-dc92-43f9-b00d-d7c4658bde48',
};

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
  const [history, setHistory] = useState<Product[]>([]);
  const [topHarmful, setTopHarmful] = useState<Ingredient[]>([]);
  const [topHealthy, setTopHealthy] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
    loadRatings();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(API_URLS.products);
      const data = await response.json();
      if (data.products) {
        setHistory(data.products.map((p: any) => ({
          ...p,
          id: p.id,
          scanDate: p.scanDate || new Date().toISOString(),
        })));
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const loadRatings = async () => {
    try {
      const [harmfulRes, healthyRes] = await Promise.all([
        fetch(`${API_URLS.ingredientsRating}?type=harmful&limit=5`),
        fetch(`${API_URLS.ingredientsRating}?type=healthy&limit=5`),
      ]);
      
      const harmfulData = await harmfulRes.json();
      const healthyData = await healthyRes.json();
      
      if (harmfulData.ingredients) setTopHarmful(harmfulData.ingredients);
      if (healthyData.ingredients) setTopHealthy(healthyData.ingredients);
    } catch (error) {
      console.error('Ошибка загрузки рейтинга:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result?.toString().split(',')[1];
          
          const ocrResponse = await fetch(API_URLS.ocrAnalyze, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
          });

          if (!ocrResponse.ok) {
            throw new Error('Ошибка распознавания текста');
          }

          const ocrData = await ocrResponse.json();
          const ingredientNames = ocrData.ingredients?.map((i: any) => i.name) || [];

          if (ingredientNames.length === 0) {
            toast({
              title: '❌ Состав не найден',
              description: 'Попробуйте сделать фото более четким',
              variant: 'destructive',
            });
            setIsScanning(false);
            return;
          }

          const analyzeResponse = await fetch(API_URLS.analyzeIngredients, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: ingredientNames }),
          });

          const analyzeData = await analyzeResponse.json();

          const newProduct: Product = {
            id: Date.now().toString(),
            name: 'Отсканированный продукт',
            score: analyzeData.total_score || 50,
            ingredients: analyzeData.ingredients || [],
            scanDate: new Date().toISOString(),
          };

          const saveResponse = await fetch(API_URLS.products, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newProduct.name,
              score: newProduct.score,
              ingredient_ids: analyzeData.ingredients
                ?.filter((i: any) => i.id)
                .map((i: any) => i.id) || [],
            }),
          });

          if (saveResponse.ok) {
            const savedData = await saveResponse.json();
            newProduct.id = savedData.id;
          }

          setSelectedProduct(newProduct);
          loadHistory();

          toast({
            title: '✅ Продукт отсканирован!',
            description: `Найдено ${ingredientNames.length} ингредиентов`,
          });
        } catch (error: any) {
          toast({
            title: '❌ Ошибка',
            description: error.message || 'Не удалось обработать изображение',
            variant: 'destructive',
          });
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({
        title: '❌ Ошибка',
        description: error.message || 'Не удалось загрузить файл',
        variant: 'destructive',
      });
      setIsScanning(false);
    }
  };

  const filteredHistory = history.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="scanner" className="gap-1 text-xs">
              <Icon name="Camera" size={16} />
              Сканер
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1 text-xs">
              <Icon name="Info" size={16} />
              Детали
            </TabsTrigger>
            <TabsTrigger value="rating" className="gap-1 text-xs">
              <Icon name="TrendingDown" size={16} />
              Рейтинг
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs">
              <Icon name="History" size={16} />
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-6 animate-scale-in">
            <Card className="relative overflow-hidden border-2 border-border">
              <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                {isScanning ? (
                  <div className="text-center space-y-4 animate-pulse-glow">
                    <Icon name="ScanLine" size={64} className="mx-auto text-primary" />
                    <p className="text-lg font-medium">Анализирую состав...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4 p-6">
                    <Icon name="Camera" size={64} className="mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Сфотографируйте состав на упаковке продукта
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-primary hover:from-green-600 hover:to-primary/90 transition-all duration-300 hover:scale-[1.02]"
            >
              {isScanning ? (
                <>
                  <Icon name="Loader2" size={24} className="animate-spin mr-2" />
                  Анализирую...
                </>
              ) : (
                <>
                  <Icon name="ScanLine" size={24} className="mr-2" />
                  Сфотографировать состав
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
                        <h3 className="font-semibold mb-1">
                          {ingredient.name}
                          {ingredient.e_number && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({ingredient.e_number})
                            </span>
                          )}
                        </h3>
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

          <TabsContent value="rating" className="space-y-6 animate-scale-in">
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Icon name="AlertTriangle" size={24} className="text-red-500" />
                Самые вредные добавки
              </h2>
              <div className="space-y-3">
                {topHarmful.map((ing, idx) => (
                  <Card key={ing.id} className="p-4 border-2 border-red-500/30">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-red-500 w-8">#{idx + 1}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {ing.name}
                          {ing.e_number && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({ing.e_number})
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground">{ing.description}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(ing.score)}`}>
                          {ing.score}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Heart" size={24} className="text-green-500" />
                Самые полезные компоненты
              </h2>
              <div className="space-y-3">
                {topHealthy.map((ing, idx) => (
                  <Card key={ing.id} className="p-4 border-2 border-green-500/30">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-green-500 w-8">#{idx + 1}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {ing.name}
                          {ing.e_number && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({ing.e_number})
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground">{ing.description}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(ing.score)}`}>
                          {ing.score}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 animate-scale-in">
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="🔍 Поиск продуктов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />

              <h2 className="text-2xl font-bold">История сканирований</h2>
              
              {filteredHistory.length > 0 ? (
                filteredHistory.map((product) => (
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
                ))
              ) : (
                <Card className="p-12 text-center">
                  <Icon name="Search" size={64} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Ничего не найдено' : 'История пуста. Отсканируйте первый продукт!'}
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
