import { router } from '@inertiajs/react';
import { Star, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/fieldError';
import { destroy as destroyImage, primary as primaryImage, store as storeImage } from '@/routes/menu/products/images';
import type { ProductDetail } from '@/types/menu';

export function ImagesTab({ product }: { product: ProductDetail }) {
    const input = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    function upload(file: File | undefined) {
        if (!file) {
            return;
        }

        setError(null);
        setPreview(URL.createObjectURL(file));

        router.post(
            storeImage.url(product.id),
            { image: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setUploading(true),
                onError: (errors) => setError(errors.image ?? 'Upload failed.'),
                onFinish: () => {
                    setUploading(false);
                    setPreview(null);

                    if (input.current) {
                        input.current.value = '';
                    }
                },
            },
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(event) => upload(event.target.files?.[0])}
                />
                <Button type="button" variant="outline" disabled={uploading} onClick={() => input.current?.click()}>
                    <Upload className="size-4" /> {uploading ? 'Uploading…' : 'Upload image'}
                </Button>
                <span className="text-muted-foreground text-xs">JPG, PNG or WebP, up to 4 MB. The first image is the primary one.</span>
            </div>
            <FieldError message={error ?? undefined} />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {preview && <div className="bg-muted aspect-square animate-pulse rounded-md bg-cover" style={{ backgroundImage: `url(${preview})` }} />}

                {product.images.map((image) => (
                    <figure key={image.id} className="relative overflow-hidden rounded-md border">
                        <img src={image.url} alt={image.alt ?? product.name} className="aspect-square w-full object-cover" />
                        {image.is_primary && <Badge className="absolute top-2 left-2">Primary</Badge>}
                        <div className="bg-background/90 absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1.5">
                            {!image.is_primary ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        router.patch(primaryImage.url({ product: product.id, image: image.id }), {}, { preserveScroll: true })
                                    }
                                >
                                    <Star className="size-3.5" /> Make primary
                                </Button>
                            ) : (
                                <span />
                            )}
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Remove image"
                                onClick={() =>
                                    confirm('Remove this image?') &&
                                    router.delete(destroyImage.url({ product: product.id, image: image.id }), { preserveScroll: true })
                                }
                            >
                                <X className="text-destructive size-4" />
                            </Button>
                        </div>
                    </figure>
                ))}
            </div>

            {product.images.length === 0 && !preview && <p className="text-muted-foreground text-sm">No images yet.</p>}
        </div>
    );
}