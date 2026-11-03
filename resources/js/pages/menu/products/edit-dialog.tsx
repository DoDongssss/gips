import { AvailabilitySwitch } from '@/components/availability-switch';
import { Can } from '@/components/can';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCan } from '@/hooks/use-can';
import { DetailsTab } from '@/pages/menu/products/tabs/details';
import { ImagesTab } from '@/pages/menu/products/tabs/images';
import { ModifiersTab } from '@/pages/menu/products/tabs/modifiers';
import { RecipeTab } from '@/pages/menu/products/tabs/recipe';
import { VariantsTab } from '@/pages/menu/products/tabs/variants';
import { availability } from '@/routes/menu/products';
import type { AttachableGroup, Option, ProductDetail } from '@/types/menu';

type Props = {
    /** The product to edit. The dialog is open exactly while this is set. */
    product: ProductDetail | null;
    categories: Option[];
    stations: Option[];
    modifierGroups: AttachableGroup[];
    onClose: () => void;
};

export default function ProductEditDialog({ product, categories, stations, modifierGroups, onClose }: Props) {
    const { can } = useCan();
    const showRecipe = can('recipe.manage') || can('inventory.view');

    return (
        <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="top-[5vh] max-h-[90vh] translate-y-0 overflow-y-auto sm:max-w-3xl">
                {product && (
                    <>
                        <DialogHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                                <div className="flex items-center gap-2">
                                    <DialogTitle>{product.name}</DialogTitle>
                                    {!product.is_active && <Badge variant="outline">Hidden</Badge>}
                                </div>
                                <Can permission="menu.availability">
                                    <AvailabilitySwitch url={availability.url(product.id)} available={product.is_available} label={product.name} />
                                </Can>
                            </div>
                            <DialogDescription>Details, sizes, images, add-ons and recipe for this product.</DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="details" key={product.id}>
                            <TabsList>
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="variants">Sizes{product.variants.length > 0 && ` (${product.variants.length})`}</TabsTrigger>
                                <TabsTrigger value="images">Images</TabsTrigger>
                                <TabsTrigger value="modifiers">
                                    Add-ons{product.modifier_group_ids.length > 0 && ` (${product.modifier_group_ids.length})`}
                                </TabsTrigger>
                                {showRecipe && <TabsTrigger value="recipe">Recipe</TabsTrigger>}
                            </TabsList>

                            <TabsContent value="details" className="pt-2">
                                <DetailsTab product={product} categories={categories} stations={stations} />
                            </TabsContent>
                            <TabsContent value="variants" className="pt-2">
                                {/* Remounts after a save, so rows added just now pick up their new ids. */}
                                <VariantsTab key={product.variants.map((variant) => variant.id).join('-')} product={product} />
                            </TabsContent>
                            <TabsContent value="images" className="pt-2">
                                <ImagesTab product={product} />
                            </TabsContent>
                            <TabsContent value="modifiers" className="pt-2">
                                <ModifiersTab product={product} groups={modifierGroups} />
                            </TabsContent>
                            {showRecipe && (
                                <TabsContent value="recipe" className="pt-2">
                                    {/* Mounts only when the tab opens, so the recipe is fetched on demand. Remounts after sizes change. */}
                                    <RecipeTab key={product.variants.map((variant) => variant.id).join('-')} product={product} />
                                </TabsContent>
                            )}
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
