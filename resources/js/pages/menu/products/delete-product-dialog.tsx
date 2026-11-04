import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
    open: boolean;
    name: string | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function DeleteProductDialog({ open, name, onOpenChange, onConfirm }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete product</DialogTitle>
                    <DialogDescription>
                        {name ? (
                            <>
                                Delete &ldquo;{name}&rdquo;? Past orders keep their records. You can restore it later from deleted products.
                            </>
                        ) : (
                            'Delete this product?'
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={onConfirm}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
